import type { FastifyInstance } from 'fastify';
import { exigirLogin } from '../lib/sessao.js';
import { rotasAdminConta } from './admin-conta.js';
import { rotasAdminImagens } from './admin-imagens.js';
import { rotasAdminMetricas } from './admin-metricas.js';
import { rotasAdminModulos } from './admin-modulos.js';
import { rotasAdminTopicos } from './admin-topicos.js';

/**
 * Reúne as rotas do painel. Tudo o que está dentro exige estar logado; o
 * `preHandler` vale para os arquivos registrados aqui.
 */
export async function rotasAdmin(app: FastifyInstance) {
  await app.register(async (admin) => {
    admin.addHook('preHandler', exigirLogin);

    await admin.register(rotasAdminConta);
    await admin.register(rotasAdminTopicos);
    await admin.register(rotasAdminImagens);
    await admin.register(rotasAdminModulos);
    await admin.register(rotasAdminMetricas);
  });
}
