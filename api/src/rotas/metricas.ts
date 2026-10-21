import type { FastifyInstance } from 'fastify';
import { and, desc, eq, gte, isNotNull, isNull, sql, sum } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { acessoDia, avaliacaoDia, buscaVaziaDia, modulo, topico } from '../db/schema.js';
import { diasAtras, hoje } from '../lib/metricas.js';
import { normalizar } from '../lib/texto.js';

/**
 * Métricas registradas pelo site público. Abertas (o visitante não faz
 * login), mas com limite por IP, e sem guardar nada que identifique quem
 * enviou: só somam 1 na contagem do dia.
 */

const limite = { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } };

const alvoSchema = z.object({
  modulo: z.string().min(1).max(80),
  topico: z.string().min(1).max(120),
});

/** Id de um tópico publicado, pelo par módulo + tópico que o site conhece. */
async function topicoPublicado(moduloSlug: string, topicoSlug: string) {
  const [linha] = await db
    .select({ id: topico.id })
    .from(topico)
    .innerJoin(modulo, eq(topico.moduloId, modulo.id))
    .where(
      and(
        eq(modulo.slug, moduloSlug),
        eq(topico.slug, topicoSlug),
        isNotNull(topico.publicadoEm),
        isNull(topico.excluidoEm),
      ),
    );
  return linha?.id;
}

export async function rotasMetricas(app: FastifyInstance) {
  /** Alguém abriu um tópico. */
  app.post('/api/metricas/acesso', limite, async (requisicao, resposta) => {
    const alvo = alvoSchema.parse(requisicao.body);
    const id = await topicoPublicado(alvo.modulo, alvo.topico);
    if (!id) return resposta.code(404).send({ erro: 'Tópico não encontrado.' });

    await db
      .insert(acessoDia)
      .values({ topicoId: id, dia: hoje(), total: 1 })
      .onConflictDoUpdate({
        target: [acessoDia.topicoId, acessoDia.dia],
        set: { total: sql`${acessoDia.total} + 1` },
      });
    return resposta.code(204).send();
  });

  /** "Esta resposta ajudou?" */
  app.post('/api/metricas/avaliacao', limite, async (requisicao, resposta) => {
    const { ajudou, ...alvo } = alvoSchema
      .extend({ ajudou: z.boolean() })
      .parse(requisicao.body);
    const id = await topicoPublicado(alvo.modulo, alvo.topico);
    if (!id) return resposta.code(404).send({ erro: 'Tópico não encontrado.' });

    await db
      .insert(avaliacaoDia)
      .values({ topicoId: id, dia: hoje(), ajudou: ajudou ? 1 : 0, naoAjudou: ajudou ? 0 : 1 })
      .onConflictDoUpdate({
        target: [avaliacaoDia.topicoId, avaliacaoDia.dia],
        set: ajudou
          ? { ajudou: sql`${avaliacaoDia.ajudou} + 1` }
          : { naoAjudou: sql`${avaliacaoDia.naoAjudou} + 1` },
      });
    return resposta.code(204).send();
  });

  /** Um termo buscado que não achou nada. O site só envia depois que a pessoa para de digitar. */
  app.post('/api/metricas/busca-vazia', limite, async (requisicao, resposta) => {
    const { termo } = z
      .object({ termo: z.string().trim().min(3).max(80) })
      .parse(requisicao.body);
    const normal = normalizar(termo).replace(/\s+/g, ' ');

    await db
      .insert(buscaVaziaDia)
      .values({ termo: normal, dia: hoje(), total: 1 })
      .onConflictDoUpdate({
        target: [buscaVaziaDia.termo, buscaVaziaDia.dia],
        set: { total: sql`${buscaVaziaDia.total} + 1` },
      });
    return resposta.code(204).send();
  });

  /** Tópicos mais abertos nos últimos 30 dias, para a Home. */
  app.get('/api/mais-acessados', async (requisicao) => {
    const { limite: n } = z
      .object({ limite: z.coerce.number().int().min(1).max(10).default(4) })
      .parse(requisicao.query);

    const total = sum(acessoDia.total).mapWith(Number);
    const linhas = await db
      .select({
        titulo: topico.titulo,
        topicoSlug: topico.slug,
        moduloSlug: modulo.slug,
        acessos: total,
      })
      .from(acessoDia)
      .innerJoin(topico, eq(acessoDia.topicoId, topico.id))
      .innerJoin(modulo, eq(topico.moduloId, modulo.id))
      .where(
        and(
          gte(acessoDia.dia, diasAtras(30)),
          isNotNull(topico.publicadoEm),
          isNull(topico.excluidoEm),
        ),
      )
      .groupBy(topico.id, modulo.id)
      .orderBy(desc(total), topico.titulo)
      .limit(n);

    return { topicos: linhas };
  });
}
