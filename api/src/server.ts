import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import estaticos from '@fastify/static';
import { ZodError } from 'zod';
import { env } from './env.js';
import { conexao } from './db/index.js';
import { garantirPastaDeUploads, TAMANHO_MAXIMO_BYTES } from './lib/uploads.js';
import { rotasAdmin } from './rotas/admin.js';
import { rotasAuth } from './rotas/auth.js';
import { rotasPublicas } from './rotas/publico.js';

const app = Fastify({ logger: true, trustProxy: env.TRUST_PROXY });

// credentials: o painel usa cookie de sessão, que o navegador só envia entre
// origens diferentes se a API permitir.
await app.register(cors, { origin: env.corsOrigins, credentials: true });
await app.register(cookie);
// Sem limite geral: só as rotas que pedem (login e cadastro) têm.
await app.register(rateLimit, {
  global: false,
  errorResponseBuilder: (_requisicao, contexto) => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: `Muitas tentativas. Aguarde ${Math.ceil(contexto.ttl / 1000)} segundos e tente de novo.`,
  }),
});

// Envio de arquivos (só o painel usa): uma imagem por vez, com limite de tamanho.
await app.register(multipart, {
  limits: { fileSize: TAMANHO_MAXIMO_BYTES, files: 1, fields: 5 },
});

/**
 * Em desenvolvimento a própria API serve as imagens. Em produção quem faz
 * isso é o IIS, direto da pasta — é mais rápido e tira carga do Node.
 * Os nomes são ids únicos, então o navegador pode guardar a imagem em cache.
 */
await garantirPastaDeUploads();
await app.register(estaticos, {
  root: env.uploadsDir,
  prefix: '/uploads/',
  maxAge: '1d',
});

/** Entrada fora do formato vira 400 com a lista de problemas, não 500. */
app.setErrorHandler((erro, _requisicao, resposta) => {
  if (erro instanceof ZodError) {
    return resposta.code(400).send({
      erro: 'requisição inválida',
      problemas: erro.issues.map((i) => ({
        campo: i.path.join('.'),
        mensagem: i.message,
      })),
    });
  }

  app.log.error(erro);

  const status =
    typeof erro === 'object' && erro !== null && 'statusCode' in erro
      ? Number((erro as { statusCode?: number }).statusCode) || 500
      : 500;

  // Limite de tentativas: a mensagem já vem pronta para quem está no site.
  if (status === 429) {
    const { message } = erro as { message?: string };
    return resposta.code(429).send({ erro: message ?? 'Muitas tentativas. Tente de novo em instantes.' });
  }
  if (status === 413) {
    return resposta.code(413).send({ erro: 'O arquivo é grande demais.' });
  }
  if (status < 500) {
    return resposta.code(status).send({ erro: 'requisição inválida' });
  }

  return resposta.code(500).send({ erro: 'erro interno' });
});

/**
 * Confere a API e o banco. Responde 503 quando o banco não atende, para que
 * quem monitora (ou o próprio site) saiba que a API está de pé mas sem dados.
 */
app.get('/api/saude', async (_requisicao, resposta) => {
  try {
    await conexao`select 1`;
    return { ok: true, banco: 'ok' };
  } catch (erro) {
    app.log.error(erro, 'falha ao consultar o banco');
    return resposta.code(503).send({ ok: false, banco: 'indisponível' });
  }
});

await app.register(rotasPublicas);
await app.register(rotasAuth);
await app.register(rotasAdmin);

await app.listen({ port: env.PORT, host: env.HOST });
