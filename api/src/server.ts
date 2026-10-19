import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import estaticos from '@fastify/static';
import { ZodError } from 'zod';
import { env } from './env.js';
import { rotasPublicas } from './rotas/publico.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: env.corsOrigins });

/**
 * Em desenvolvimento a própria API serve as imagens. Em produção quem faz
 * isso é o IIS, direto da pasta — é mais rápido e tira carga do Node.
 */
await app.register(estaticos, {
  root: fileURLToPath(new URL('../uploads', import.meta.url)),
  prefix: '/uploads/',
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

  return resposta.code(status).send({ erro: 'erro interno' });
});

app.get('/api/saude', async () => ({ ok: true }));

await app.register(rotasPublicas);

await app.listen({ port: env.PORT, host: env.HOST });
