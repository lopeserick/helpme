/**
 * Tipos e chamadas do painel. O formato é o da API (`api/src/rotas/admin.ts`),
 * porque o painel mostra e devolve os dados como estão.
 */
import { getJson, sendForm, sendJson } from './client';

export interface Usuario {
  id: number;
  nome: string;
  email: string;
}

export type Situacao = 'publicado' | 'rascunho';

export interface ModuloResumo {
  id: number;
  slug: string;
  titulo: string;
}

/** Ícones que a API aceita (iguais aos de `components/CategoryIcon`). */
export const ICONES = [
  { nome: 'database', rotulo: 'Banco de dados' },
  { nome: 'dollar', rotulo: 'Dinheiro' },
  { nome: 'book', rotulo: 'Livro' },
  { nome: 'star', rotulo: 'Estrela' },
  { nome: 'chart', rotulo: 'Gráfico' },
] as const;

export interface ModuloCompleto extends ModuloResumo {
  descricao: string;
  subtitulo: string | null;
  icone: string;
  ordem: number;
  visivel: boolean;
  /** Quantos tópicos (rascunhos e publicados) o módulo tem. */
  topicos: number;
}

export interface ModuloEntrada {
  titulo: string;
  descricao: string;
  subtitulo: string | null;
  icone: string;
  visivel: boolean;
}

export type Acao = 'criou' | 'editou' | 'publicou' | 'despublicou' | 'excluiu' | 'restaurou';

export interface EventoHistorico {
  id: number;
  acao: Acao;
  em: string;
  usuario: string | null;
  /** Título naquela versão, quando a linha guarda uma cópia do conteúdo. */
  titulo: string | null;
  restauravel: boolean;
}

export interface Metricas {
  dias: number;
  buscasSemResultado: { termo: string; total: number }[];
  maisAcessados: { id: number; titulo: string; moduloTitulo: string; acessos: number }[];
  avaliacoes: {
    id: number;
    titulo: string;
    moduloTitulo: string;
    ajudou: number;
    naoAjudou: number;
  }[];
}

export interface ImagemSemUso {
  id: string;
  arquivo: string;
  url: string;
  bytes: number;
  largura: number | null;
  altura: number | null;
  criadaEm: string;
  enviadaPor: string | null;
}

export interface ImagensSemUsoResposta {
  imagens: ImagemSemUso[];
  bytes: number;
}

export interface TopicoResumo {
  id: number;
  slug: string;
  titulo: string;
  tag: string | null;
  moduloSlug: string;
  moduloTitulo: string;
  situacao: Situacao;
  atualizadoEm: string;
  atualizadoPor: string | null;
}

export type BlocoAdmin =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'imagem'; imagemId: string; alt: string; legenda?: string; url: string | null };

export interface TopicoCompleto {
  id: number;
  slug: string;
  titulo: string;
  tag: string | null;
  blocos: BlocoAdmin[];
  moduloId: number;
  moduloSlug: string;
  moduloTitulo: string;
  situacao: Situacao;
  atualizadoEm: string;
  atualizadoPor: string | null;
}

/** O que o editor envia ao salvar. */
export interface TopicoEntrada {
  titulo: string;
  tag: string | null;
  blocos: BlocoAdmin[];
}

export interface ModulosAdminResposta {
  modulos: ModuloCompleto[];
}
export interface TopicosAdminResposta {
  topicos: TopicoResumo[];
}
export interface TopicoAdminResposta {
  topico: TopicoCompleto;
}

/** Mantém só o que a API aceita nos blocos (a `url` da imagem é só para exibir). */
function blocosParaEnvio(blocos: BlocoAdmin[]) {
  return blocos.map((b) =>
    b.tipo === 'texto'
      ? b
      : { tipo: b.tipo, imagemId: b.imagemId, alt: b.alt, legenda: b.legenda || undefined },
  );
}

export const parseModulos = (raw: ModulosAdminResposta) => raw.modulos;
export const parseTopicos = (raw: TopicosAdminResposta) => raw.topicos;
export const parseTopico = (raw: TopicoAdminResposta) => raw.topico;

export const entrar = (email: string, senha: string) =>
  sendJson<{ usuario: Usuario }>('POST', '/api/auth/login', { email, senha });

export const criarConta = (dados: {
  nome: string;
  email: string;
  senha: string;
  codigo: string;
}) => sendJson<{ usuario: Usuario }>('POST', '/api/auth/cadastro', dados);

export const sair = () => sendJson('POST', '/api/auth/logout');

export const usuarioAtual = (signal?: AbortSignal) =>
  getJson<{ usuario: Usuario }>('/api/auth/eu', signal);

export async function criarTopico(moduloId: number, dados: TopicoEntrada) {
  const r = await sendJson<TopicoAdminResposta>('POST', '/api/admin/topicos', {
    moduloId,
    ...dados,
    blocos: blocosParaEnvio(dados.blocos),
  });
  return r.topico;
}

export async function salvarTopico(id: number, dados: TopicoEntrada) {
  const r = await sendJson<TopicoAdminResposta>('PUT', `/api/admin/topicos/${id}`, {
    ...dados,
    blocos: blocosParaEnvio(dados.blocos),
  });
  return r.topico;
}

export async function publicarTopico(id: number) {
  const r = await sendJson<TopicoAdminResposta>('POST', `/api/admin/topicos/${id}/publicar`);
  return r.topico;
}

export async function despublicarTopico(id: number) {
  const r = await sendJson<TopicoAdminResposta>('POST', `/api/admin/topicos/${id}/despublicar`);
  return r.topico;
}

/** Maior imagem aceita pela API; conferido aqui também para avisar antes de enviar. */
export const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024;
export const TIPOS_DE_IMAGEM = ['image/png', 'image/jpeg', 'image/webp'];

export interface ImagemEnviada {
  id: string;
  url: string;
  largura: number;
  altura: number;
  bytes: number;
}

/** Envia uma imagem; a API valida, reduz e converte para WebP. */
export async function enviarImagem(arquivo: File) {
  const form = new FormData();
  form.append('arquivo', arquivo);
  const r = await sendForm<{ imagem: ImagemEnviada }>('/api/admin/imagens', form);
  return r.imagem;
}

export const excluirTopico = (id: number) =>
  sendJson('DELETE', `/api/admin/topicos/${id}`);

export async function restaurarVersao(topicoId: number, alteracaoId: number) {
  return sendJson<TopicoAdminResposta & { imagensPerdidas: number }>(
    'POST',
    `/api/admin/topicos/${topicoId}/restaurar/${alteracaoId}`,
  );
}

export const parseHistorico = (raw: { historico: EventoHistorico[] }) => raw.historico;
export const parseMetricas = (raw: Metricas) => raw;
export const parseImagensSemUso = (raw: ImagensSemUsoResposta) => raw;

export async function criarModulo(dados: ModuloEntrada) {
  const r = await sendJson<{ modulo: ModuloCompleto }>('POST', '/api/admin/modulos', dados);
  return r.modulo;
}

export async function salvarModulo(id: number, dados: ModuloEntrada) {
  const r = await sendJson<{ modulo: ModuloCompleto }>('PUT', `/api/admin/modulos/${id}`, dados);
  return r.modulo;
}

export async function reordenarModulos(ids: number[]) {
  const r = await sendJson<ModulosAdminResposta>('PUT', '/api/admin/modulos-ordem', { ids });
  return r.modulos;
}

export const apagarImagem = (id: string) => sendJson('DELETE', `/api/admin/imagens/${id}`);

export const limparImagens = () =>
  sendJson<{ apagadas: number; bytes: number }>('POST', '/api/admin/imagens/limpar');

/** "1,4 MB", "820 KB". */
export function formatarBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
