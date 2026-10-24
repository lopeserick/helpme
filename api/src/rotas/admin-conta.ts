import type { FastifyInstance } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import { z } from 'zod';
import { db } from '../db/index.js';
import { acessoPainel, usuario } from '../db/schema.js';
import { env } from '../env.js';
import { cifrar, decifrar, SemChave2faError } from '../lib/cifra.js';
import { registrarAcesso } from '../lib/registro.js';
import { conferirSenha, gerarHash } from '../lib/senha.js';
import { encerrarOutrasSessoes } from '../lib/sessao.js';
import {
  conferirCodigo,
  enderecoOtpauth,
  formatarSegredo,
  novoSegredo,
} from '../lib/totp.js';

/**
 * "Minha conta" e registro de acessos (exige login, aplicado por
 * `rotas/admin.ts`). Toda mudança de segurança pede a senha de novo: uma
 * sessão esquecida aberta não basta para desligar a proteção.
 */

const senhaSchema = z.object({ senha: z.string().min(1, 'Informe sua senha.').max(128) });
const codigoSchema = z.object({
  codigo: z.string().trim().regex(/^\d{6}$/, 'Digite os 6 números do aplicativo.'),
});
const novaSenhaSchema = z.object({
  atual: z.string().min(1, 'Informe a senha atual.').max(128),
  nova: z
    .string()
    .min(8, 'A nova senha precisa ter ao menos 8 caracteres.')
    .max(128, 'A senha pode ter no máximo 128 caracteres.'),
});

async function contaDe(id: number) {
  const [conta] = await db.select().from(usuario).where(eq(usuario.id, id));
  return conta!;
}

export async function rotasAdminConta(admin: FastifyInstance) {
  admin.get('/api/admin/conta', async (requisicao) => {
    const conta = await contaDe(requisicao.usuario!.id);
    return {
      conta: {
        nome: conta.nome,
        email: conta.email,
        doisFatores: conta.totpSegredo !== null,
        exige2fa: env.EXIGIR_2FA,
        // Sem a chave no servidor, não há como ativar: o painel avisa.
        doisFatoresDisponivel: Boolean(env.CHAVE_2FA),
      },
    };
  });

  /** Troca a senha e encerra as outras sessões abertas dessa conta. */
  admin.post('/api/admin/senha', async (requisicao, resposta) => {
    const { atual, nova } = novaSenhaSchema.parse(requisicao.body);
    const conta = await contaDe(requisicao.usuario!.id);

    if (!(await conferirSenha(atual, conta.senhaHash))) {
      return resposta.code(400).send({ erro: 'A senha atual não confere.' });
    }

    await db.update(usuario).set({ senhaHash: await gerarHash(nova) }).where(eq(usuario.id, conta.id));
    await encerrarOutrasSessoes(conta.id, requisicao);
    await registrarAcesso(requisicao, 'senha_alterada', { usuarioId: conta.id, email: conta.email });
    return { ok: true };
  });

  /** Gera o segredo e o QR code. Só vale depois de confirmado com um código. */
  admin.post('/api/admin/2fa/iniciar', async (requisicao, resposta) => {
    const { senha } = senhaSchema.parse(requisicao.body);
    const conta = await contaDe(requisicao.usuario!.id);

    if (!(await conferirSenha(senha, conta.senhaHash))) {
      return resposta.code(400).send({ erro: 'Senha incorreta.' });
    }
    if (conta.totpSegredo) {
      return resposta.code(409).send({ erro: 'A verificação em duas etapas já está ativa.' });
    }

    const segredo = novoSegredo();
    let pendente: string;
    try {
      pendente = cifrar(segredo);
    } catch (erro) {
      if (erro instanceof SemChave2faError) {
        return resposta.code(503).send({
          erro: 'A verificação em duas etapas ainda não foi configurada no servidor (CHAVE_2FA).',
        });
      }
      throw erro;
    }

    await db.update(usuario).set({ totpPendente: pendente }).where(eq(usuario.id, conta.id));

    const otpauth = enderecoOtpauth(segredo, conta.email);
    return {
      segredo: formatarSegredo(segredo),
      qrCode: await QRCode.toDataURL(otpauth, { margin: 1, width: 240 }),
    };
  });

  /** Confirma com o primeiro código do aplicativo e liga a verificação. */
  admin.post('/api/admin/2fa/confirmar', async (requisicao, resposta) => {
    const { codigo } = codigoSchema.parse(requisicao.body);
    const conta = await contaDe(requisicao.usuario!.id);

    if (!conta.totpPendente) {
      return resposta.code(409).send({ erro: 'Comece a ativação de novo.' });
    }

    const segredo = decifrar(conta.totpPendente);
    const passo = conferirCodigo(segredo, codigo);
    if (passo === undefined) {
      return resposta.code(400).send({ erro: 'Código incorreto. Confira o horário do celular e tente de novo.' });
    }

    await db
      .update(usuario)
      .set({ totpSegredo: conta.totpPendente, totpPendente: null, totpUltimoPasso: passo })
      .where(eq(usuario.id, conta.id));
    await encerrarOutrasSessoes(conta.id, requisicao);
    await registrarAcesso(requisicao, '2fa_ativada', { usuarioId: conta.id, email: conta.email });
    return { ok: true };
  });

  /** Desliga a verificação, com senha e código. Recusado se ela for obrigatória. */
  admin.post('/api/admin/2fa/desativar', async (requisicao, resposta) => {
    const { senha, codigo } = senhaSchema.extend(codigoSchema.shape).parse(requisicao.body);
    const conta = await contaDe(requisicao.usuario!.id);

    if (env.EXIGIR_2FA) {
      return resposta.code(403).send({ erro: 'A verificação em duas etapas é obrigatória nesta central.' });
    }
    if (!conta.totpSegredo) {
      return resposta.code(409).send({ erro: 'A verificação em duas etapas já está desligada.' });
    }
    if (!(await conferirSenha(senha, conta.senhaHash))) {
      return resposta.code(400).send({ erro: 'Senha incorreta.' });
    }
    const passo = conferirCodigo(decifrar(conta.totpSegredo), codigo, conta.totpUltimoPasso);
    if (passo === undefined) {
      return resposta.code(400).send({ erro: 'Código incorreto ou já usado.' });
    }

    await db
      .update(usuario)
      .set({ totpSegredo: null, totpPendente: null, totpUltimoPasso: 0 })
      .where(eq(usuario.id, conta.id));
    await registrarAcesso(requisicao, '2fa_desativada', { usuarioId: conta.id, email: conta.email });
    return { ok: true };
  });

  /** Últimos acessos ao painel, de todas as contas. */
  admin.get('/api/admin/acessos', async (requisicao) => {
    const { limite } = z
      .object({ limite: z.coerce.number().int().min(1).max(500).default(200) })
      .parse(requisicao.query);

    const linhas = await db
      .select({
        id: acessoPainel.id,
        evento: acessoPainel.evento,
        email: acessoPainel.email,
        nome: usuario.nome,
        ip: acessoPainel.ip,
        navegador: acessoPainel.navegador,
        em: acessoPainel.em,
      })
      .from(acessoPainel)
      .leftJoin(usuario, eq(acessoPainel.usuarioId, usuario.id))
      .orderBy(desc(acessoPainel.em), desc(acessoPainel.id))
      .limit(limite);

    return { acessos: linhas };
  });
}
