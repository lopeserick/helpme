import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { usuario } from '../db/schema.js';
import { env } from '../env.js';
import { conferirSenha, gerarHash, hashFalso } from '../lib/senha.js';
import { abrirSessao, encerrarSessao, usuarioDaRequisicao } from '../lib/sessao.js';

/**
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
const limite = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };

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

    await abrirSessao(resposta, novo.id);
    return resposta.code(201).send({ usuario: novo });
  });

  app.post('/api/auth/login', limite, async (requisicao, resposta) => {
    const dados = loginSchema.parse(requisicao.body);

    const [conta] = await db
      .select()
      .from(usuario)
      .where(eq(usuario.email, dados.email));

    // Confere sempre um hash, mesmo sem conta, para o tempo não denunciar.
    const confere = await conferirSenha(dados.senha, conta?.senhaHash ?? hashFalso);

    if (!conta || !conta.ativo || !confere) {
      return resposta.code(401).send({ erro: 'E-mail ou senha incorretos.' });
    }

    await abrirSessao(resposta, conta.id);
    return { usuario: { id: conta.id, nome: conta.nome, email: conta.email } };
  });

  app.post('/api/auth/logout', async (requisicao, resposta) => {
    await encerrarSessao(requisicao, resposta);
    return resposta.code(204).send();
  });

  /** Quem está logado agora. O site chama ao abrir o painel. */
  app.get('/api/auth/eu', async (requisicao, resposta) => {
    const logado = await usuarioDaRequisicao(requisicao);
    if (!logado) return resposta.code(401).send({ erro: 'Faça login para continuar.' });
    return { usuario: logado };
  });
}
