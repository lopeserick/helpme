import { createHash, randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { and, eq, gt, lt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { sessao, usuario } from '../db/schema.js';
import { env } from '../env.js';

const COOKIE = 'helpme_sessao';

export interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    usuario?: UsuarioLogado;
  }
}

/** O banco guarda só o hash do token; o token de verdade fica no cookie. */
function hashDoToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function abrirSessao(resposta: FastifyReply, usuarioId: number) {
  const token = randomBytes(32).toString('base64url');
  const duracaoMs = env.SESSAO_HORAS * 3600 * 1000;

  // Aproveita para limpar o que já venceu, sem precisar de rotina à parte.
  await db.delete(sessao).where(lt(sessao.expiraEm, new Date()));

  await db.insert(sessao).values({
    id: hashDoToken(token),
    usuarioId,
    expiraEm: new Date(Date.now() + duracaoMs),
  });

  resposta.setCookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE,
    path: '/',
    maxAge: Math.floor(duracaoMs / 1000),
  });
}

export async function encerrarSessao(requisicao: FastifyRequest, resposta: FastifyReply) {
  const token = requisicao.cookies[COOKIE];
  if (token) await db.delete(sessao).where(eq(sessao.id, hashDoToken(token)));
  resposta.clearCookie(COOKIE, { path: '/' });
}

/** Quem está logado nesta requisição, ou nada se o cookie falta ou venceu. */
export async function usuarioDaRequisicao(requisicao: FastifyRequest) {
  const token = requisicao.cookies[COOKIE];
  if (!token) return undefined;

  const [linha] = await db
    .select({ id: usuario.id, nome: usuario.nome, email: usuario.email })
    .from(sessao)
    .innerJoin(usuario, eq(sessao.usuarioId, usuario.id))
    .where(
      and(
        eq(sessao.id, hashDoToken(token)),
        gt(sessao.expiraEm, new Date()),
        eq(usuario.ativo, true),
      ),
    );

  return linha;
}

/** Barra a rota quando não há ninguém logado. Use como `preHandler`. */
export async function exigirLogin(requisicao: FastifyRequest, resposta: FastifyReply) {
  const logado = await usuarioDaRequisicao(requisicao);
  if (!logado) {
    return resposta.code(401).send({ erro: 'Faça login para continuar.' });
  }
  requisicao.usuario = logado;
}
