import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Blocos de conteúdo                                                  */
/* ------------------------------------------------------------------ */

/**
 * O conteúdo de um tópico é uma lista de blocos. O formato é o mesmo que o
 * site já usava quando os dados viviam no código, o que torna a migração
 * direta. Fica em jsonb porque bloco nunca é consultado isoladamente: ele só
 * existe dentro do tópico.
 */
export const blocoSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('texto'),
    texto: z.string().min(1),
  }),
  z.object({
    tipo: z.literal('imagem'),
    imagemId: z.string().uuid(),
    /** Descrição para leitor de tela. Obrigatória de propósito. */
    alt: z.string().min(1),
    legenda: z.string().optional(),
  }),
]);

export const blocosSchema = z.array(blocoSchema);

export type Bloco = z.infer<typeof blocoSchema>;

/* ------------------------------------------------------------------ */
/* Tabelas                                                             */
/* ------------------------------------------------------------------ */

export const usuario = pgTable('usuario', {
  id: serial('id').primaryKey(),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  /** Hash da senha (argon2). A senha em si nunca é guardada. */
  senhaHash: text('senha_hash').notNull(),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
});

export const modulo = pgTable('modulo', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  titulo: text('titulo').notNull(),
  /** Título sem acento e em minúsculas, para a busca encontrá-lo. */
  tituloBusca: text('titulo_busca').notNull().default(''),
  descricao: text('descricao').notNull(),
  /** Nome do ícone; quem resolve para componente é o site. */
  icone: text('icone').notNull(),
  ordem: integer('ordem').notNull().default(0),
  /** Se aparece na lista de categorias da Home. Novidades fica fora. */
  visivel: boolean('visivel').notNull().default(true),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
});

export const imagem = pgTable('imagem', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Nome do arquivo em disco. A imagem nunca é guardada no banco. */
  arquivo: text('arquivo').notNull(),
  mime: text('mime').notNull(),
  bytes: integer('bytes').notNull(),
  largura: integer('largura'),
  altura: integer('altura'),
  enviadaPor: integer('enviada_por').references(() => usuario.id),
  criadaEm: timestamp('criada_em', { withTimezone: true }).notNull().defaultNow(),
});

export const topico = pgTable(
  'topico',
  {
    id: serial('id').primaryKey(),
    moduloId: integer('modulo_id')
      .notNull()
      .references(() => modulo.id),
    slug: text('slug').notNull(),
    titulo: text('titulo').notNull(),
    /** Rótulo opcional, como "Validação fiscal". Usado nas novidades. */
    tag: text('tag'),
    blocos: jsonb('blocos').$type<Bloco[]>().notNull().default([]),
    /** Título e textos sem acento e em minúsculas, para a busca. */
    textoBusca: text('texto_busca').notNull().default(''),
    ordem: integer('ordem').notNull().default(0),
    /** Nulo significa rascunho. Também é a data que ordena as novidades. */
    publicadoEm: timestamp('publicado_em', { withTimezone: true }),
    /** Nulo significa ativo. Exclusão é reversível. */
    excluidoEm: timestamp('excluido_em', { withTimezone: true }),
    criadoPor: integer('criado_por').references(() => usuario.id),
    atualizadoPor: integer('atualizado_por').references(() => usuario.id),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('topico_modulo_slug').on(t.moduloId, t.slug),
    index('topico_busca').on(t.textoBusca),
    index('topico_publicado').on(t.publicadoEm),
  ],
);

export const alteracao = pgTable('alteracao', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  topicoId: integer('topico_id').references(() => topico.id),
  usuarioId: integer('usuario_id').references(() => usuario.id),
  /** criou | editou | publicou | despublicou | excluiu */
  acao: text('acao').notNull(),
  em: timestamp('em', { withTimezone: true }).notNull().defaultNow(),
  detalhe: jsonb('detalhe'),
});
