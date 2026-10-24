import { createHash, randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { and, eq, gt, lt, ne, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { sessao, usuario } from '../db/schema.js';
import { env } from '../env.js';

const COOKIE = 'helpme_sessao';

/** Tempo para digitar o código da verificação em duas etapas depois da senha. */
const ETAPA_CODIGO_MIN = 5;

export interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
  /** Se a conta já tem a verificação em duas etapas ligada. */
  doisFatores: boolean;
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

/**
 * Abre uma sessão. Com `etapa: 'codigo'`, ela só serve para concluir o login
 * com o código da verificação em duas etapas e vence em poucos minutos.
 */
export async function abrirSessao(
  resposta: FastifyReply,
  usuarioId: number,
  etapa: 'completa' | 'codigo' = 'completa',
) {
  const token = randomBytes(32).toString('base64url');
  const duracaoMs =
    etapa === 'codigo' ? ETAPA_CODIGO_MIN * 60 * 1000 : env.SESSAO_HORAS * 3600 * 1000;

  // Aproveita para limpar o que já venceu, sem precisar de rotina à parte.
  await db.delete(sessao).where(lt(sessao.expiraEm, new Date()));

  await db.insert(sessao).values({
    id: hashDoToken(token),
    usuarioId,
    etapa,
    expiraEm: new Date(Date.now() + duracaoMs),
  });

  resposta.setCookie(COOKIE, token, {
    httpOnly: true,
    // strict: o navegador nunca envia o cookie em navegação vinda de outro site.
    sameSite: 'strict',
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

/** Encerra as sessões de uma conta, menos (opcionalmente) a desta requisição. */
export async function encerrarOutrasSessoes(usuarioId: number, requisicao?: FastifyRequest) {
  const token = requisicao?.cookies[COOKIE];
  await db
    .delete(sessao)
    .where(
      token
        ? and(eq(sessao.usuarioId, usuarioId), ne(sessao.id, hashDoToken(token)))
        : eq(sessao.usuarioId, usuarioId),
    );
}

/** A sessão "meio aberta" (senha certa, falta o código), se houver. */
export async function sessaoAguardandoCodigo(requisicao: FastifyRequest) {
  const token = requisicao.cookies[COOKIE];
  if (!token) return undefined;
  const [linha] = await db
    .select({ id: sessao.id, usuarioId: sessao.usuarioId })
    .from(sessao)
    .where(
      and(
        eq(sessao.id, hashDoToken(token)),
        eq(sessao.etapa, 'codigo'),
        gt(sessao.expiraEm, new Date()),
      ),
    );
  return linha;
}

export async function apagarSessaoPorId(id: string) {
  await db.delete(sessao).where(eq(sessao.id, id));
}

/**
 * Quem está logado nesta requisição. Recusa sessão vencida, sessão parada há
 * mais de SESSAO_INATIVIDADE_MIN, sessão que ainda espera o código e conta
 * desativada. Cada uso empurra o prazo de inatividade.
 */
export async function usuarioDaRequisicao(requisicao: FastifyRequest) {
  const token = requisicao.cookies[COOKIE];
  if (!token) return undefined;

  const id = hashDoToken(token);
  const agora = Date.now();
  const limiteInatividade = new Date(agora - env.SESSAO_INATIVIDADE_MIN * 60 * 1000);

  const [linha] = await db
    .select({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      totp: usuario.totpSegredo,
      ultimoUso: sessao.ultimoUso,
    })
    .from(sessao)
    .innerJoin(usuario, eq(sessao.usuarioId, usuario.id))
    .where(
      and(
        eq(sessao.id, id),
        eq(sessao.etapa, 'completa'),
        gt(sessao.expiraEm, new Date(agora)),
        gt(sessao.ultimoUso, limiteInatividade),
        eq(usuario.ativo, true),
      ),
    );

  if (!linha) {
    // Parada demais ou vencida: apaga, para não ficar lixo no banco.
    await db
      .delete(sessao)
      .where(and(eq(sessao.id, id), or(lt(sessao.ultimoUso, limiteInatividade), lt(sessao.expiraEm, new Date(agora)))));
    return undefined;
  }

  // Atualiza no máximo uma vez por minuto, para não gravar a cada clique.
  if (agora - linha.ultimoUso.getTime() > 60 * 1000) {
    await db.update(sessao).set({ ultimoUso: new Date(agora) }).where(eq(sessao.id, id));
  }

  return { id: linha.id, nome: linha.nome, email: linha.email, doisFatores: linha.totp !== null };
}

/** Rotas que uma conta sem 2FA ainda usa quando EXIGIR_2FA está ligado: as de ativá-la. */
const LIBERADAS_SEM_2FA = /^\/api\/admin\/(conta|2fa\/(iniciar|confirmar))(\/|$|\?)/;

/** Barra a rota quando não há ninguém logado. Use como `preHandler`. */
export async function exigirLogin(requisicao: FastifyRequest, resposta: FastifyReply) {
  const logado = await usuarioDaRequisicao(requisicao);
  if (!logado) {
    return resposta.code(401).send({ erro: 'Faça login para continuar.' });
  }
  if (env.EXIGIR_2FA && !logado.doisFatores && !LIBERADAS_SEM_2FA.test(requisicao.url)) {
    return resposta.code(403).send({
      erro: 'Ative a verificação em duas etapas para usar o painel.',
      codigo: '2fa_obrigatoria',
    });
  }
  requisicao.usuario = logado;
}
