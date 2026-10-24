import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../env.js';

const LEITURA = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Proteção contra CSRF: toda ação que grava algo no painel (/api/admin e
 * /api/auth) precisa vir do endereço do painel. Um site de terceiros que tente
 * agir em nome de quem está logado manda outro Origin e é recusado.
 *
 * Navegadores sempre enviam Origin nessas requisições. Sem Origin, a chamada
 * não veio de um navegador (ex.: curl), e aí não há cookie de vítima em jogo.
 */
export async function exigirOrigemDoPainel(requisicao: FastifyRequest, resposta: FastifyReply) {
  if (LEITURA.has(requisicao.method)) return;
  if (!/^\/api\/(admin|auth)(\/|$|\?)/.test(requisicao.url)) return;

  const origem = requisicao.headers.origin;
  if (origem !== undefined && !env.painelOrigens.includes(origem)) {
    requisicao.log.warn({ origem, url: requisicao.url }, 'origem recusada');
    return resposta.code(403).send({ erro: 'Origem não autorizada.' });
  }
}
