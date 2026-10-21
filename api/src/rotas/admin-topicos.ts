import type { FastifyInstance } from 'fastify';
import { and, asc, desc, eq, inArray, isNotNull, isNull, like, max, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  alteracao,
  blocosSchema,
  imagem,
  modulo,
  topico,
  usuario,
  type Bloco,
} from '../db/schema.js';
import { montarTextoBusca, normalizar } from '../lib/texto.js';
import { urlDaImagem } from '../lib/uploads.js';

/**
 * Rotas do painel para tópicos. O login é exigido por `rotas/admin.ts`, que
 * registra este arquivo. Não há perfis: quem tem conta cria, edita, publica e
 * exclui. Toda ação fica registrada em `alteracao`.
 *
 * O tópico nasce como rascunho (`publicado_em` nulo) e só vai ao site quando
 * alguém publica. Depois de publicado, salvar uma edição já vale no site.
 */

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const corpoSchema = z.object({
  titulo: z.string().trim().min(3, 'O título precisa ter ao menos 3 caracteres.').max(160),
  tag: z
    .string()
    .trim()
    .max(60, 'O rótulo pode ter no máximo 60 caracteres.')
    .nullish()
    .transform((v) => v || null),
  blocos: blocosSchema.max(100, 'Use no máximo 100 blocos.'),
});

const criarSchema = corpoSchema.extend({ moduloId: z.number().int().positive() });

/** "Cadastrar produto!" → "cadastrar-produto". Vira o endereço do tópico. */
function gerarSlug(titulo: string) {
  const base = normalizar(titulo)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
  return base || 'topico';
}

async function slugLivre(moduloId: number, titulo: string) {
  const base = gerarSlug(titulo);

  const usados = await db
    .select({ slug: topico.slug })
    .from(topico)
    .where(and(eq(topico.moduloId, moduloId), like(topico.slug, `${base}%`)));

  const existentes = new Set(usados.map((u) => u.slug));
  if (!existentes.has(base)) return base;

  let n = 2;
  while (existentes.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** Garante que toda imagem citada nos blocos existe, antes de gravar. */
async function conferirImagens(blocos: Bloco[]) {
  const ids = [
    ...new Set(blocos.flatMap((b) => (b.tipo === 'imagem' ? [b.imagemId] : []))),
  ];
  if (ids.length === 0) return true;

  const achadas = await db
    .select({ id: imagem.id })
    .from(imagem)
    .where(inArray(imagem.id, ids));
  return achadas.length === ids.length;
}

/** Tópico completo para o editor. Os blocos de imagem trazem a URL para mostrar. */
async function abrirTopico(id: number) {
  const [t] = await db
    .select({
      id: topico.id,
      slug: topico.slug,
      titulo: topico.titulo,
      tag: topico.tag,
      blocos: topico.blocos,
      moduloId: modulo.id,
      moduloSlug: modulo.slug,
      moduloTitulo: modulo.titulo,
      publicadoEm: topico.publicadoEm,
      atualizadoEm: topico.atualizadoEm,
      atualizadoPor: usuario.nome,
    })
    .from(topico)
    .innerJoin(modulo, eq(topico.moduloId, modulo.id))
    .leftJoin(usuario, eq(topico.atualizadoPor, usuario.id))
    .where(and(eq(topico.id, id), isNull(topico.excluidoEm)));

  if (!t) return undefined;

  const ids = t.blocos.flatMap((b) => (b.tipo === 'imagem' ? [b.imagemId] : []));
  const urls = new Map<string, string>();
  if (ids.length > 0) {
    const linhas = await db
      .select({ id: imagem.id, arquivo: imagem.arquivo })
      .from(imagem)
      .where(inArray(imagem.id, ids));
    for (const l of linhas) urls.set(l.id, urlDaImagem(l.arquivo));
  }

  return {
    ...t,
    situacao: t.publicadoEm ? 'publicado' : 'rascunho',
    blocos: t.blocos.map((b) =>
      b.tipo === 'imagem' ? { ...b, url: urls.get(b.imagemId) ?? null } : b,
    ),
  };
}

async function registrar(
  topicoId: number,
  usuarioId: number,
  acao: 'criou' | 'editou' | 'publicou' | 'despublicou' | 'excluiu',
  detalhe?: Record<string, unknown>,
) {
  await db.insert(alteracao).values({ topicoId, usuarioId, acao, detalhe });
}

export async function rotasAdminTopicos(admin: FastifyInstance) {
  /** Todos os módulos, inclusive os que não aparecem na Home, para o seletor do editor. */
  admin.get('/api/admin/modulos', async () => {
    const linhas = await db
      .select({ id: modulo.id, slug: modulo.slug, titulo: modulo.titulo })
      .from(modulo)
      .orderBy(asc(modulo.ordem));
    return { modulos: linhas };
  });

  /** Lista de tópicos, inclusive rascunhos, com filtro por módulo, situação e texto. */
  admin.get('/api/admin/topicos', async (requisicao) => {
    const { modulo: moduloSlug, situacao, q } = z
      .object({
        modulo: z.string().optional(),
        situacao: z.enum(['todos', 'publicados', 'rascunhos']).default('todos'),
        q: z.string().trim().optional(),
      })
      .parse(requisicao.query);

    const filtros = [isNull(topico.excluidoEm)];
    if (moduloSlug) filtros.push(eq(modulo.slug, moduloSlug));
    if (situacao === 'publicados') filtros.push(isNotNull(topico.publicadoEm));
    if (situacao === 'rascunhos') filtros.push(isNull(topico.publicadoEm));
    if (q) {
      const termo = `%${normalizar(q)}%`;
      const casa = or(like(topico.textoBusca, termo), like(modulo.tituloBusca, termo));
      if (casa) filtros.push(casa);
    }

    const linhas = await db
      .select({
        id: topico.id,
        slug: topico.slug,
        titulo: topico.titulo,
        tag: topico.tag,
        moduloSlug: modulo.slug,
        moduloTitulo: modulo.titulo,
        publicadoEm: topico.publicadoEm,
        atualizadoEm: topico.atualizadoEm,
        atualizadoPor: usuario.nome,
      })
      .from(topico)
      .innerJoin(modulo, eq(topico.moduloId, modulo.id))
      .leftJoin(usuario, eq(topico.atualizadoPor, usuario.id))
      .where(and(...filtros))
      .orderBy(desc(topico.atualizadoEm))
      .limit(500);

    return {
      topicos: linhas.map((l) => ({
        ...l,
        situacao: l.publicadoEm ? 'publicado' : 'rascunho',
      })),
    };
  });

  admin.get('/api/admin/topicos/:id', async (requisicao, resposta) => {
    const { id } = idSchema.parse(requisicao.params);
    const encontrado = await abrirTopico(id);
    if (!encontrado) return resposta.code(404).send({ erro: 'Tópico não encontrado.' });
    return { topico: encontrado };
  });

  /** Cria um tópico novo. Nasce como rascunho. */
  admin.post('/api/admin/topicos', async (requisicao, resposta) => {
    const dados = criarSchema.parse(requisicao.body);
    const autor = requisicao.usuario!.id;

    const [alvo] = await db
      .select({ id: modulo.id })
      .from(modulo)
      .where(eq(modulo.id, dados.moduloId));
    if (!alvo) return resposta.code(400).send({ erro: 'Módulo não encontrado.' });

    if (!(await conferirImagens(dados.blocos))) {
      return resposta.code(400).send({ erro: 'Há uma imagem que não existe mais.' });
    }

    const slug = await slugLivre(dados.moduloId, dados.titulo);
    const [{ ultima }] = await db
      .select({ ultima: max(topico.ordem) })
      .from(topico)
      .where(eq(topico.moduloId, dados.moduloId));

    const [criado] = await db
      .insert(topico)
      .values({
        moduloId: dados.moduloId,
        slug,
        titulo: dados.titulo,
        tag: dados.tag,
        blocos: dados.blocos,
        textoBusca: montarTextoBusca(dados.titulo, dados.blocos),
        ordem: (ultima ?? 0) + 1,
        criadoPor: autor,
        atualizadoPor: autor,
      })
      .returning({ id: topico.id });

    await registrar(criado.id, autor, 'criou', { titulo: dados.titulo });
    return resposta.code(201).send({ topico: await abrirTopico(criado.id) });
  });

  /** Edita título, rótulo e blocos. O endereço (slug) não muda: links já compartilhados continuam valendo. */
  admin.put('/api/admin/topicos/:id', async (requisicao, resposta) => {
    const { id } = idSchema.parse(requisicao.params);
    const dados = corpoSchema.parse(requisicao.body);
    const autor = requisicao.usuario!.id;

    if (!(await conferirImagens(dados.blocos))) {
      return resposta.code(400).send({ erro: 'Há uma imagem que não existe mais.' });
    }

    const [atualizado] = await db
      .update(topico)
      .set({
        titulo: dados.titulo,
        tag: dados.tag,
        blocos: dados.blocos,
        textoBusca: montarTextoBusca(dados.titulo, dados.blocos),
        atualizadoPor: autor,
        atualizadoEm: new Date(),
      })
      .where(and(eq(topico.id, id), isNull(topico.excluidoEm)))
      .returning({ id: topico.id });

    if (!atualizado) return resposta.code(404).send({ erro: 'Tópico não encontrado.' });

    await registrar(id, autor, 'editou', { titulo: dados.titulo });
    return { topico: await abrirTopico(id) };
  });

  /** Publica agora. Se já estava publicado, mantém a data original. */
  admin.post('/api/admin/topicos/:id/publicar', async (requisicao, resposta) => {
    const { id } = idSchema.parse(requisicao.params);
    const autor = requisicao.usuario!.id;

    const [atualizado] = await db
      .update(topico)
      .set({
        publicadoEm: sql`coalesce(${topico.publicadoEm}, now())`,
        atualizadoPor: autor,
        atualizadoEm: new Date(),
      })
      .where(and(eq(topico.id, id), isNull(topico.excluidoEm)))
      .returning({ id: topico.id });

    if (!atualizado) return resposta.code(404).send({ erro: 'Tópico não encontrado.' });

    await registrar(id, autor, 'publicou');
    return { topico: await abrirTopico(id) };
  });

  /** Tira do site e volta para rascunho. */
  admin.post('/api/admin/topicos/:id/despublicar', async (requisicao, resposta) => {
    const { id } = idSchema.parse(requisicao.params);
    const autor = requisicao.usuario!.id;

    const [atualizado] = await db
      .update(topico)
      .set({ publicadoEm: null, atualizadoPor: autor, atualizadoEm: new Date() })
      .where(and(eq(topico.id, id), isNull(topico.excluidoEm)))
      .returning({ id: topico.id });

    if (!atualizado) return resposta.code(404).send({ erro: 'Tópico não encontrado.' });

    await registrar(id, autor, 'despublicou');
    return { topico: await abrirTopico(id) };
  });

  /** Exclusão reversível: o tópico some do site e do painel, mas fica no banco. */
  admin.delete('/api/admin/topicos/:id', async (requisicao, resposta) => {
    const { id } = idSchema.parse(requisicao.params);
    const autor = requisicao.usuario!.id;

    const [excluido] = await db
      .update(topico)
      .set({ excluidoEm: new Date(), atualizadoPor: autor, atualizadoEm: new Date() })
      .where(and(eq(topico.id, id), isNull(topico.excluidoEm)))
      .returning({ id: topico.id });

    if (!excluido) return resposta.code(404).send({ erro: 'Tópico não encontrado.' });

    await registrar(id, autor, 'excluiu');
    return resposta.code(204).send();
  });
}
