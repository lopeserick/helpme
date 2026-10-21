import type { FastifyInstance } from 'fastify';
import { and, desc, eq, gte, isNull, sql, sum } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { acessoDia, avaliacaoDia, buscaVaziaDia, modulo, topico } from '../db/schema.js';
import { diasAtras } from '../lib/metricas.js';

/** Resumo das métricas para o painel (exige login, aplicado por `rotas/admin.ts`). */
export async function rotasAdminMetricas(admin: FastifyInstance) {
  admin.get('/api/admin/metricas', async (requisicao) => {
    const { dias } = z
      .object({ dias: z.coerce.number().int().min(1).max(365).default(30) })
      .parse(requisicao.query);
    const desde = diasAtras(dias);

    const totalBusca = sum(buscaVaziaDia.total).mapWith(Number);
    const buscasSemResultado = await db
      .select({ termo: buscaVaziaDia.termo, total: totalBusca })
      .from(buscaVaziaDia)
      .where(gte(buscaVaziaDia.dia, desde))
      .groupBy(buscaVaziaDia.termo)
      .orderBy(desc(totalBusca), buscaVaziaDia.termo)
      .limit(30);

    const totalAcesso = sum(acessoDia.total).mapWith(Number);
    const maisAcessados = await db
      .select({
        id: topico.id,
        titulo: topico.titulo,
        moduloTitulo: modulo.titulo,
        acessos: totalAcesso,
      })
      .from(acessoDia)
      .innerJoin(topico, eq(acessoDia.topicoId, topico.id))
      .innerJoin(modulo, eq(topico.moduloId, modulo.id))
      .where(and(gte(acessoDia.dia, desde), isNull(topico.excluidoEm)))
      .groupBy(topico.id, modulo.id)
      .orderBy(desc(totalAcesso), topico.titulo)
      .limit(15);

    const sim = sum(avaliacaoDia.ajudou).mapWith(Number);
    const nao = sum(avaliacaoDia.naoAjudou).mapWith(Number);
    const avaliacoes = await db
      .select({
        id: topico.id,
        titulo: topico.titulo,
        moduloTitulo: modulo.titulo,
        ajudou: sim,
        naoAjudou: nao,
      })
      .from(avaliacaoDia)
      .innerJoin(topico, eq(avaliacaoDia.topicoId, topico.id))
      .innerJoin(modulo, eq(topico.moduloId, modulo.id))
      .where(and(gte(avaliacaoDia.dia, desde), isNull(topico.excluidoEm)))
      .groupBy(topico.id, modulo.id)
      // Os que mais receberam "não ajudou" primeiro: são os que pedem revisão.
      .orderBy(desc(nao), sql`${sim} asc`, topico.titulo)
      .limit(30);

    return { dias, buscasSemResultado, maisAcessados, avaliacoes };
  });
}
