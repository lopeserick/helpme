import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { usuario } from '../db/schema.js';
import { env } from '../env.js';
import { decifrar } from '../lib/cifra.js';
import { registrarAcesso } from '../lib/registro.js';
import { conferirSenha, gerarHash, hashFalso } from '../lib/senha.js';
import {
  abrirSessao,
  apagarSessaoPorId,
  encerrarSessao,
  sessaoAguardandoCodigo,
  usuarioDaRequisicao,
} from '../lib/sessao.js';
import { conferirCodigo } from '../lib/totp.js';

/**
 * Cadastro, login (com verificação em duas etapas opcional) e logout do painel.
 * Depois de LOGIN_MAX_FALHAS senhas ou códigos errados seguidos, a conta fica
 * bloqueada por LOGIN_BLOQUEIO_MIN, além do limite por IP.
 *
 * Cadastro, login e logout do painel. Não há perfis: quem tem conta edita e
 * publica. A tela de cadastro, porém, exige o código definido em
 * CODIGO_CADASTRO, para que a central dos clientes não fique aberta a qualquer
 * pessoa da internet.
 */

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(200, 'O e-mail é longo demais.')
  .pipe(z.email('Informe um e-mail válido.'));

const cadastroSchema = z.object({
  nome: z.string().trim().min(2, 'Informe seu nome.').max(120),
  email,
  senha: z
    .string()
    .min(8, 'A senha precisa ter ao menos 8 caracteres.')
    .max(128, 'A senha pode ter no máximo 128 caracteres.'),
  codigo: z.string().min(1, 'Informe o código de cadastro.'),
});

const loginSchema = z.object({
  email,
  senha: z.string().min(1, 'Informe a senha.').max(128),
});

/** Compara sem vazar, pelo tempo de resposta, quantos caracteres batem. */
function codigoConfere(informado: string, esperado: string) {
  const a = createHash('sha256').update(informado).digest();
  const b = createHash('sha256').update(esperado).digest();
  return timingSafeEqual(a, b);
}

/** Limite de tentativas por IP: segura quem tenta adivinhar senha ou código. */
const limite = { config: { rateLimit: { max: env.LIMITE_TENTATIVAS_IP, timeWindow: '1 minute' } } };

const codigoSchema = z.object({
  codigo: z.string().trim().regex(/^\d{6}$/, 'Digite os 6 números do aplicativo.'),
});

function minutosAte(data: Date) {
  return Math.max(1, Math.ceil((data.getTime() - Date.now()) / 60000));
}

function mensagemDeBloqueio(ate: Date) {
  const n = minutosAte(ate);
  return `Muitas tentativas erradas. A conta está bloqueada por ${n} ${n === 1 ? 'minuto' : 'minutos'}.`;
}

/**
 * Conta uma tentativa errada (senha ou código). Na LOGIN_MAX_FALHAS-ésima
 * seguida, bloqueia a conta por LOGIN_BLOQUEIO_MIN. Devolve o fim do bloqueio,
 * se bloqueou agora.
 */
async function contarFalha(id: number, falhasAntes: number) {
  const falhas = falhasAntes + 1;
  if (falhas >= env.LOGIN_MAX_FALHAS) {
    const ate = new Date(Date.now() + env.LOGIN_BLOQUEIO_MIN * 60 * 1000);
    await db.update(usuario).set({ falhasLogin: 0, bloqueadoAte: ate }).where(eq(usuario.id, id));
    return ate;
  }
  await db.update(usuario).set({ falhasLogin: falhas }).where(eq(usuario.id, id));
  return undefined;
}

const publico = (u: { id: number; nome: string; email: string; totpSegredo: string | null }) => ({
  id: u.id,
  nome: u.nome,
  email: u.email,
  doisFatores: u.totpSegredo !== null,
});

export async function rotasAuth(app: FastifyInstance) {
  app.post('/api/auth/cadastro', limite, async (requisicao, resposta) => {
    const dados = cadastroSchema.parse(requisicao.body);

    if (!env.CODIGO_CADASTRO) {
      return resposta
        .code(403)
        .send({ erro: 'O cadastro está desativado. Fale com quem administra a central.' });
    }
    if (!codigoConfere(dados.codigo, env.CODIGO_CADASTRO)) {
      return resposta.code(403).send({ erro: 'Código de cadastro incorreto.' });
    }

    const [existente] = await db
      .select({ id: usuario.id })
      .from(usuario)
      .where(eq(usuario.email, dados.email));
    if (existente) {
      return resposta.code(409).send({ erro: 'Já existe uma conta com esse e-mail.' });
    }

    const [novo] = await db
      .insert(usuario)
      .values({
        nome: dados.nome,
        email: dados.email,
        senhaHash: await gerarHash(dados.senha),
      })
      // Duas contas criadas ao mesmo tempo com o mesmo e-mail: a segunda cai aqui.
      .onConflictDoNothing({ target: usuario.email })
      .returning({ id: usuario.id, nome: usuario.nome, email: usuario.email });

    if (!novo) {
      return resposta.code(409).send({ erro: 'Já existe uma conta com esse e-mail.' });
    }

    await registrarAcesso(requisicao, 'cadastro', { usuarioId: novo.id, email: novo.email });
    await abrirSessao(resposta, novo.id);
    return resposta.code(201).send({ usuario: { ...novo, doisFatores: false } });
  });

  /**
   * Primeira etapa: e-mail e senha. Sem verificação em duas etapas, já entra.
   * Com ela, abre uma sessão provisória e responde `{ etapa: 'codigo' }`: o
   * painel então pede o código em POST /api/auth/codigo.
   */
  app.post('/api/auth/login', limite, async (requisicao, resposta) => {
    const dados = loginSchema.parse(requisicao.body);

    const [conta] = await db
      .select()
      .from(usuario)
      .where(eq(usuario.email, dados.email));

    // Confere sempre um hash, mesmo sem conta, para o tempo não denunciar.
    const confere = await conferirSenha(dados.senha, conta?.senhaHash ?? hashFalso);

    // Conta bloqueada: recusa mesmo com a senha certa, até o prazo acabar.
    if (conta?.bloqueadoAte && conta.bloqueadoAte > new Date()) {
      await registrarAcesso(requisicao, 'conta_bloqueada', { usuarioId: conta.id, email: dados.email });
      return resposta.code(429).send({ erro: mensagemDeBloqueio(conta.bloqueadoAte) });
    }

    if (!conta || !conta.ativo || !confere) {
      await registrarAcesso(requisicao, 'senha_errada', {
        usuarioId: conta?.id,
        email: dados.email,
      });
      if (conta?.ativo) {
        const bloqueouAte = await contarFalha(conta.id, conta.falhasLogin);
        if (bloqueouAte) return resposta.code(429).send({ erro: mensagemDeBloqueio(bloqueouAte) });
      }
      return resposta.code(401).send({ erro: 'E-mail ou senha incorretos.' });
    }

    if (conta.totpSegredo) {
      await abrirSessao(resposta, conta.id, 'codigo');
      return { etapa: 'codigo' };
    }

    await db.update(usuario).set({ falhasLogin: 0, bloqueadoAte: null }).where(eq(usuario.id, conta.id));
    await registrarAcesso(requisicao, 'login', { usuarioId: conta.id, email: conta.email });
    await abrirSessao(resposta, conta.id);
    return { usuario: publico(conta) };
  });

  /** Segunda etapa: o código de 6 dígitos do aplicativo. */
  app.post('/api/auth/codigo', limite, async (requisicao, resposta) => {
    const { codigo } = codigoSchema.parse(requisicao.body);

    const provisoria = await sessaoAguardandoCodigo(requisicao);
    if (!provisoria) {
      return resposta.code(401).send({ erro: 'O tempo para digitar o código acabou. Entre de novo.' });
    }

    const [conta] = await db.select().from(usuario).where(eq(usuario.id, provisoria.usuarioId));
    if (!conta?.ativo || !conta.totpSegredo) {
      await apagarSessaoPorId(provisoria.id);
      return resposta.code(401).send({ erro: 'Entre de novo.' });
    }

    if (conta.bloqueadoAte && conta.bloqueadoAte > new Date()) {
      await apagarSessaoPorId(provisoria.id);
      return resposta.code(429).send({ erro: mensagemDeBloqueio(conta.bloqueadoAte) });
    }

    const passo = conferirCodigo(decifrar(conta.totpSegredo), codigo, conta.totpUltimoPasso);
    if (passo === undefined) {
      await registrarAcesso(requisicao, 'codigo_errado', { usuarioId: conta.id, email: conta.email });
      const bloqueouAte = await contarFalha(conta.id, conta.falhasLogin);
      if (bloqueouAte) {
        await apagarSessaoPorId(provisoria.id);
        return resposta.code(429).send({ erro: mensagemDeBloqueio(bloqueouAte) });
      }
      return resposta.code(401).send({ erro: 'Código incorreto ou vencido. Confira o aplicativo.' });
    }

    await db
      .update(usuario)
      .set({ falhasLogin: 0, bloqueadoAte: null, totpUltimoPasso: passo })
      .where(eq(usuario.id, conta.id));
    await apagarSessaoPorId(provisoria.id);
    await registrarAcesso(requisicao, 'login', { usuarioId: conta.id, email: conta.email });
    await abrirSessao(resposta, conta.id);
    return { usuario: publico(conta) };
  });

  app.post('/api/auth/logout', async (requisicao, resposta) => {
    const logado = await usuarioDaRequisicao(requisicao);
    if (logado) await registrarAcesso(requisicao, 'logout', { usuarioId: logado.id, email: logado.email });
    await encerrarSessao(requisicao, resposta);
    return resposta.code(204).send();
  });

  /** Quem está logado agora. O site chama ao abrir o painel. */
  app.get('/api/auth/eu', async (requisicao, resposta) => {
    const logado = await usuarioDaRequisicao(requisicao);
    if (!logado) return resposta.code(401).send({ erro: 'Faça login para continuar.' });
    return { usuario: logado, exige2fa: env.EXIGIR_2FA };
  });
}
