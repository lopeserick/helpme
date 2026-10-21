import type { FastifyInstance } from 'fastify';
import { and, asc, count, eq, isNull, max } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { modulo, topico } from '../db/schema.js';
import { ICONES, SLUGS_RESERVADOS } from '../lib/modulos.js';
import { normalizar } from '../lib/texto.js';

/**
 * Gestão de módulos (exige login, aplicado por `rotas/admin.ts`).
 *
 * O endereço (slug) sai do título na criação e nunca muda: renomear o módulo
 * não quebra links já compartilhados. Não há exclusão, só ocultar da Home,
 * para não deixar tópicos e links órfãos.
 */

const corpoSchema = z.object({
  titulo: z.string().trim().min(2, 'O título precisa ter ao menos 2 caracteres.').max(80),
  descricao: z
    .string()
    .trim()
    .min(3, 'Escreva uma descrição curta para o cartão da Home.')
    .max(160, 'A descrição pode ter no máximo 160 caracteres.'),
  subtitulo: z
    .string()
    .trim()
    .max(240, 'O subtítulo pode ter no máximo 240 caracteres.')
    .nullish()
    .transform((v) => v || null),
  icone: z.enum(ICONES, { error: 'Escolha um dos ícones da lista.' }),
  visivel: z.boolean(),
});

function gerarSlug(titulo: string) {
  return normalizar(titulo)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

async function listar() {
  const linhas = await db
    .select({
      id: modulo.id,
      slug: modulo.slug,
      titulo: modulo.titulo,
      descricao: modulo.descricao,
      subtitulo: modulo.subtitulo,
      icone: modulo.icone,
      ordem: modulo.ordem,
      visivel: modulo.visivel,
      topicos: count(topico.id),
    })
    .from(modulo)
    .leftJoin(topico, and(eq(topico.moduloId, modulo.id), isNull(topico.excluidoEm)))
    .groupBy(modulo.id)
    .orderBy(asc(modulo.ordem), asc(modulo.id));
  return linhas;
}

export async function rotasAdminModulos(admin: FastifyInstance) {
  /** Todos os módulos, inclusive os ocultos. Também alimenta o seletor do editor. */
  admin.get('/api/admin/modulos', async () => ({ modulos: await listar() }));

  admin.post('/api/admin/modulos', async (requisicao, resposta) => {
    const dados = corpoSchema.parse(requisicao.body);
    const slug = gerarSlug(dados.titulo);

    if (!slug) {
      return resposta.code(400).send({ erro: 'Use letras ou números no título.' });
    }
    if (SLUGS_RESERVADOS.has(slug)) {
      return resposta
        .code(400)
        .send({ erro: `"${slug}" é um endereço reservado do site. Escolha outro título.` });
    }

    const [{ ultima }] = await db.select({ ultima: max(modulo.ordem) }).from(modulo);

    const [criado] = await db
      .insert(modulo)
      .values({
        ...dados,
        slug,
        tituloBusca: normalizar(dados.titulo),
        ordem: (ultima ?? -1) + 1,
      })
      .onConflictDoNothing({ target: modulo.slug })
      .returning({ id: modulo.id });

    if (!criado) {
      return resposta
        .code(409)
        .send({ erro: `Já existe um módulo com o endereço /${slug}. Escolha outro título.` });
    }

    const [linha] = (await listar()).filter((m) => m.id === criado.id);
    return resposta.code(201).send({ modulo: linha });
  });

  /** Edita tudo menos o endereço. */
  admin.put('/api/admin/modulos/:id', async (requisicao, resposta) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(requisicao.params);
    const dados = corpoSchema.parse(requisicao.body);

    const [atualizado] = await db
      .update(modulo)
      .set({ ...dados, tituloBusca: normalizar(dados.titulo) })
      .where(eq(modulo.id, id))
      .returning({ id: modulo.id });

    if (!atualizado) return resposta.code(404).send({ erro: 'Módulo não encontrado.' });

    const [linha] = (await listar()).filter((m) => m.id === id);
    return { modulo: linha };
  });

  /** Nova ordem dos módulos: a lista completa de ids, na ordem desejada. */
  admin.put('/api/admin/modulos-ordem', async (requisicao, resposta) => {
    const { ids } = z
      .object({ ids: z.array(z.number().int().positive()).min(1) })
      .parse(requisicao.body);

    const atuais = await db.select({ id: modulo.id }).from(modulo);
    const mesmos =
      ids.length === atuais.length &&
      new Set(ids).size === ids.length &&
      atuais.every((m) => ids.includes(m.id));
    if (!mesmos) {
      return resposta
        .code(409)
        .send({ erro: 'A lista de módulos mudou. Recarregue a página e tente de novo.' });
    }

    await db.transaction(async (tx) => {
      for (const [ordem, mid] of ids.entries()) {
        await tx.update(modulo).set({ ordem }).where(eq(modulo.id, mid));
      }
    });

    return { modulos: await listar() };
  });
}
