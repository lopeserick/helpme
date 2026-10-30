import type { FastifyInstance } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { sugestao } from '../db/schema.js';

/** Sugestões dos clientes no painel (exige login, aplicado por `rotas/admin.ts`). */
export async function rotasAdminSugestoes(admin: FastifyInstance) {
  admin.get('/api/admin/sugestoes', async () => {
    const linhas = await db
      .select()
      .from(sugestao)
      .orderBy(desc(sugestao.criadaEm))
      .limit(300);
    return { sugestoes: linhas };
  });

  admin.post('/api/admin/sugestoes/:id/lida', async (requisicao, resposta) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(requisicao.params);
    const { lida } = z.object({ lida: z.boolean() }).parse(requisicao.body);
    const [atualizada] = await db
      .update(sugestao)
      .set({ lida })
      .where(eq(sugestao.id, id))
      .returning({ id: sugestao.id });
    if (!atualizada) return resposta.code(404).send({ erro: 'Sugestão não encontrada.' });
    return { ok: true };
  });
}
