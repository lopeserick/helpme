import type { FastifyInstance } from 'fastify';
import { and, asc, desc, eq, inArray, isNotNull, isNull, like, or } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { imagem, modulo, topico, type Bloco } from '../db/schema.js';
import { normalizar } from '../lib/texto.js';
import { urlDaImagem } from '../lib/uploads.js';

/**
 * Rotas de leitura, abertas ao público. Nunca devolvem rascunho nem excluído.
 *
 * Os blocos saem daqui prontos para exibir: a imagem vira URL, e o site não
 * precisa saber que existe uma tabela de imagens.
 */

type BlocoPublico =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'imagem'; url: string; alt: string; legenda?: string };

/** Só tópicos publicados e não excluídos. */
const visivel = and(isNotNull(topico.publicadoEm), isNull(topico.excluidoEm));

async function urlsDasImagens(blocos: Bloco[][]) {
  const ids = [
    ...new Set(
      blocos.flat().flatMap((b) => (b.tipo === 'imagem' ? [b.imagemId] : [])),
    ),
  ];
  if (ids.length === 0) return new Map<string, string>();

  const linhas = await db
    .select({ id: imagem.id, arquivo: imagem.arquivo })
    .from(imagem)
    .where(inArray(imagem.id, ids));

  return new Map(linhas.map((l) => [l.id, urlDaImagem(l.arquivo)]));
}

function paraPublico(blocos: Bloco[], urls: Map<string, string>): BlocoPublico[] {
  return blocos.flatMap<BlocoPublico>((bloco) => {
    if (bloco.tipo === 'texto') return [bloco];

    const url = urls.get(bloco.imagemId);
    // Imagem faltando não derruba a página: o bloco é omitido.
    if (!url) return [];

    return [{ tipo: 'imagem' as const, url, alt: bloco.alt, legenda: bloco.legenda }];
  });
}

export async function rotasPublicas(app: FastifyInstance) {
  /** Módulos que aparecem na lista de categorias da Home. */
  app.get('/api/modulos', async () => {
    const linhas = await db
      .select({
        slug: modulo.slug,
        titulo: modulo.titulo,
        descricao: modulo.descricao,
        icone: modulo.icone,
      })
      .from(modulo)
      .where(eq(modulo.visivel, true))
      .orderBy(asc(modulo.ordem));

    return { modulos: linhas };
  });

  /** Um módulo com seus tópicos publicados, inclusive os não visíveis na Home. */
  app.get('/api/modulos/:slug', async (requisicao, resposta) => {
    const { slug } = z.object({ slug: z.string() }).parse(requisicao.params);

    const [encontrado] = await db
      .select({
        slug: modulo.slug,
        titulo: modulo.titulo,
        descricao: modulo.descricao,
        icone: modulo.icone,
      })
      .from(modulo)
      .where(eq(modulo.slug, slug));

    if (!encontrado) {
      return resposta.code(404).send({ erro: 'Módulo não encontrado.' });
    }

    const linhas = await db
      .select({
        slug: topico.slug,
        titulo: topico.titulo,
        tag: topico.tag,
        blocos: topico.blocos,
        publicadoEm: topico.publicadoEm,
      })
      .from(topico)
      .innerJoin(modulo, eq(topico.moduloId, modulo.id))
      .where(and(eq(modulo.slug, slug), visivel))
      .orderBy(asc(topico.ordem));

    const urls = await urlsDasImagens(linhas.map((l) => l.blocos));

    return {
      modulo: encontrado,
      topicos: linhas.map((l) => ({ ...l, blocos: paraPublico(l.blocos, urls) })),
    };
  });

  /** Avisos mais recentes, para o alerta da Home. */
  app.get('/api/novidades', async (requisicao) => {
    const { limite } = z
      .object({ limite: z.coerce.number().int().min(1).max(20).default(5) })
      .parse(requisicao.query);

    const linhas = await db
      .select({
        slug: topico.slug,
        titulo: topico.titulo,
        tag: topico.tag,
        publicadoEm: topico.publicadoEm,
      })
      .from(topico)
      .innerJoin(modulo, eq(topico.moduloId, modulo.id))
      .where(and(eq(modulo.slug, 'novidades'), visivel))
      .orderBy(desc(topico.publicadoEm))
      .limit(limite);

    return { novidades: linhas };
  });

  /** Busca por título e pelo texto dos blocos, ignorando acento e caixa. */
  app.get('/api/busca', async (requisicao) => {
    const { q, limite } = z
      .object({
        q: z.string().min(2, 'informe ao menos 2 caracteres'),
        limite: z.coerce.number().int().min(1).max(20).default(6),
      })
      .parse(requisicao.query);

    const termo = `%${normalizar(q)}%`;

    const linhas = await db
      .select({
        titulo: topico.titulo,
        topicoSlug: topico.slug,
        moduloSlug: modulo.slug,
        moduloTitulo: modulo.titulo,
      })
      .from(topico)
      .innerJoin(modulo, eq(topico.moduloId, modulo.id))
      .where(
        and(visivel, or(like(topico.textoBusca, termo), like(modulo.tituloBusca, termo))),
      )
      .orderBy(asc(modulo.ordem), asc(topico.ordem))
      .limit(limite);

    return { resultados: linhas };
  });
}
