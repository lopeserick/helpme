import {
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
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
  /** Hash scrypt da senha (formato em lib/senha.ts). A senha em si nunca é guardada. */
  senhaHash: text('senha_hash').notNull(),
  ativo: boolean('ativo').notNull().default(true),
  /** Senhas erradas seguidas (zera no login certo ou ao bloquear). */
  falhasLogin: integer('falhas_login').notNull().default(0),
  /** Até quando a conta fica bloqueada depois de muitas senhas erradas. */
  bloqueadoAte: timestamp('bloqueado_ate', { withTimezone: true }),
  /** Segredo da verificação em duas etapas, cifrado (lib/cifra.ts). Nulo = desligada. */
  totpSegredo: text('totp_segredo'),
  /** Segredo gerado e ainda não confirmado com um código (durante a ativação). */
  totpPendente: text('totp_pendente'),
  /** Último intervalo de 30 s aceito: impede usar o mesmo código duas vezes. */
  totpUltimoPasso: integer('totp_ultimo_passo').notNull().default(0),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
});

export const modulo = pgTable('modulo', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  titulo: text('titulo').notNull(),
  /** Título sem acento e em minúsculas, para a busca encontrá-lo. */
  tituloBusca: text('titulo_busca').notNull().default(''),
  descricao: text('descricao').notNull(),
  /** Linha sob o título na página do módulo. Vazio: usa a descrição. */
  subtitulo: text('subtitulo'),
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
  /** criou | editou | publicou | despublicou | excluiu | restaurou */
  acao: text('acao').notNull(),
  em: timestamp('em', { withTimezone: true }).notNull().defaultNow(),
  /**
   * Em criou, editou e restaurou: cópia de título, rótulo e blocos como
   * ficaram, o que permite restaurar a versão depois.
   */
  detalhe: jsonb('detalhe'),
}, (t) => [index('alteracao_topico').on(t.topicoId, t.em)]);

/**
 * Sessão de quem entrou no painel. A chave é o SHA-256 do token que vai no
 * cookie: se alguém ler o banco, não consegue se passar por um usuário logado.
 */
export const sessao = pgTable(
  'sessao',
  {
    id: text('id').primaryKey(),
    usuarioId: integer('usuario_id')
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    criadaEm: timestamp('criada_em', { withTimezone: true }).notNull().defaultNow(),
    expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
    /** Última requisição: a sessão cai depois de SESSAO_INATIVIDADE_MIN parada. */
    ultimoUso: timestamp('ultimo_uso', { withTimezone: true }).notNull().defaultNow(),
    /**
     * 'completa' = logado. 'codigo' = senha certa, falta o código da
     * verificação em duas etapas (vale por poucos minutos e não abre o painel).
     */
    etapa: text('etapa').notNull().default('completa'),
  },
  (t) => [index('sessao_expira').on(t.expiraEm)],
);

/**
 * Registro de acessos ao painel: logins, senhas erradas, bloqueios e mudanças
 * de segurança. Guarda IP e navegador para investigar tentativas de invasão.
 */
export const acessoPainel = pgTable(
  'acesso_painel',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    usuarioId: integer('usuario_id').references(() => usuario.id, { onDelete: 'set null' }),
    /** O e-mail digitado, mesmo quando não existe conta com ele. */
    email: text('email'),
    evento: text('evento').notNull(),
    ip: text('ip'),
    navegador: text('navegador'),
    em: timestamp('em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('acesso_painel_em').on(t.em)],
);

/* ------------------------------------------------------------------ */
/* Métricas                                                            */
/* ------------------------------------------------------------------ */
/*
 * Guardadas como contagens por dia, sem IP nem nada que identifique quem
 * acessou. Cada evento soma 1 na linha do dia (insert ... on conflict).
 */

/** Aberturas de tópico por dia. Alimenta "Rotinas mais acessadas". */
export const acessoDia = pgTable(
  'acesso_dia',
  {
    topicoId: integer('topico_id')
      .notNull()
      .references(() => topico.id, { onDelete: 'cascade' }),
    dia: date('dia').notNull(),
    total: integer('total').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.topicoId, t.dia] })],
);

/** "Esta resposta ajudou?" por tópico e dia. */
export const avaliacaoDia = pgTable(
  'avaliacao_dia',
  {
    topicoId: integer('topico_id')
      .notNull()
      .references(() => topico.id, { onDelete: 'cascade' }),
    dia: date('dia').notNull(),
    ajudou: integer('ajudou').notNull().default(0),
    naoAjudou: integer('nao_ajudou').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.topicoId, t.dia] })],
);

/** Termos buscados que não acharam nada, já normalizados. */
export const buscaVaziaDia = pgTable(
  'busca_vazia_dia',
  {
    termo: text('termo').notNull(),
    dia: date('dia').notNull(),
    total: integer('total').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.termo, t.dia] })],
);
