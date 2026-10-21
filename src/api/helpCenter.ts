/**
 * Conteúdo da central de ajuda, como a tela espera.
 *
 * A API devolve nomes em português (`titulo`, `blocos`...). Os mapeadores
 * abaixo convertem para os tipos que os componentes usam, para que mudar o
 * formato da API mexa só neste arquivo.
 */
import { mediaUrl } from './client';

/* ------------------------------------------------------------------ */
/* Tipos da tela                                                       */
/* ------------------------------------------------------------------ */

/** Um bloco de conteúdo dentro de um tópico: parágrafo ou imagem. */
export type TopicBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; src: string; alt: string; caption?: string };

export interface Topic {
  id: string;
  /** Nome da rotina, exibido com o tópico fechado. */
  title: string;
  /** Rótulo opcional antes do título, como "Validação fiscal". */
  tag?: string;
  /** Data no formato AAAA-MM-DD. Só as novidades mostram data. */
  date?: string;
  content: TopicBlock[];
}

export interface Category {
  id: string;
  title: string;
  description: string;
  /** Rota da página da categoria (ver `App.tsx`). */
  path: string;
  /** Nome do ícone; quem resolve para componente é `components/CategoryIcon`. */
  icon: string;
}

export interface NewsItem {
  id: string;
  title: string;
  tag?: string;
}

export interface SearchHit {
  /** Chave única na lista de sugestões: módulo + tópico. */
  key: string;
  /** Nome da rotina. */
  title: string;
  /** Nome da página onde a rotina está, mostrado como contexto. */
  pageTitle: string;
  /** Endereço com o tópico em destaque, por exemplo /estoque#inventario. */
  to: string;
}

/* ------------------------------------------------------------------ */
/* Formato da resposta da API                                          */
/* ------------------------------------------------------------------ */

interface ModuloApi {
  slug: string;
  titulo: string;
  descricao: string;
  icone: string;
}

interface BlocoApi {
  tipo: 'texto' | 'imagem';
  texto?: string;
  url?: string;
  alt?: string;
  legenda?: string;
}

interface TopicoApi {
  slug: string;
  titulo: string;
  tag: string | null;
  blocos: BlocoApi[];
  publicadoEm: string | null;
}

export interface ModulosResposta {
  modulos: ModuloApi[];
}

export interface ModuloResposta {
  modulo: ModuloApi & { subtitulo: string | null };
  topicos: TopicoApi[];
}

export interface MaisAcessadosResposta {
  topicos: { titulo: string; topicoSlug: string; moduloSlug: string }[];
}

export interface NovidadesResposta {
  novidades: { slug: string; titulo: string; tag: string | null }[];
}

export interface BuscaResposta {
  resultados: {
    titulo: string;
    topicoSlug: string;
    moduloSlug: string;
    moduloTitulo: string;
  }[];
}

/* ------------------------------------------------------------------ */
/* Mapeadores                                                          */
/* ------------------------------------------------------------------ */

/** O slug do módulo é também o caminho da página: `estoque` → `/estoque`. */
export function pathFor(moduloSlug: string) {
  return `/${moduloSlug}`;
}

/** Data local (AAAA-MM-DD), para o dia não mudar por causa do fuso. */
function localDate(iso: string | null) {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseCategories(raw: ModulosResposta): Category[] {
  return raw.modulos.map((m) => ({
    id: m.slug,
    title: m.titulo,
    description: m.descricao,
    path: pathFor(m.slug),
    icon: m.icone,
  }));
}

function parseBlock(bloco: BlocoApi): TopicBlock[] {
  if (bloco.tipo === 'texto') {
    return bloco.texto ? [{ type: 'text', text: bloco.texto }] : [];
  }
  if (!bloco.url) return [];

  return [
    {
      type: 'image',
      src: mediaUrl(bloco.url),
      alt: bloco.alt ?? '',
      caption: bloco.legenda,
    },
  ];
}

export function parseTopics(raw: ModuloResposta): Topic[] {
  const mostrarData = raw.modulo.slug === 'novidades';

  const topics = raw.topicos.map<Topic>((t) => ({
    id: t.slug,
    title: t.titulo,
    tag: t.tag ?? undefined,
    date: mostrarData ? localDate(t.publicadoEm) : undefined,
    content: t.blocos.flatMap(parseBlock),
  }));

  // Novidades: do mais recente para o mais antigo (a ordenação é estável).
  return mostrarData
    ? [...topics].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    : topics;
}

/** Página de um módulo: título, linha de apoio e tópicos. */
export interface ModulePage {
  slug: string;
  title: string;
  subtitle: string;
  topics: Topic[];
}

export function parseModulePage(raw: ModuloResposta): ModulePage {
  return {
    slug: raw.modulo.slug,
    title: raw.modulo.titulo,
    subtitle: raw.modulo.subtitulo || raw.modulo.descricao,
    topics: parseTopics(raw),
  };
}

export interface PopularTopic {
  title: string;
  to: string;
}

export function parsePopular(raw: MaisAcessadosResposta): PopularTopic[] {
  return raw.topicos.map((t) => ({
    title: t.titulo,
    to: `${pathFor(t.moduloSlug)}#${t.topicoSlug}`,
  }));
}

export function parseNews(raw: NovidadesResposta): NewsItem[] {
  return raw.novidades.map((n) => ({
    id: n.slug,
    title: n.titulo,
    tag: n.tag ?? undefined,
  }));
}

export function parseSearch(raw: BuscaResposta): SearchHit[] {
  return raw.resultados.map((r) => ({
    key: `${r.moduloSlug}:${r.topicoSlug}`,
    title: r.titulo,
    pageTitle: r.moduloTitulo,
    to: `${pathFor(r.moduloSlug)}#${r.topicoSlug}`,
  }));
}
