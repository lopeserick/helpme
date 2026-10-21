/**
 * Tipos e chamadas do painel. O formato é o da API (`api/src/rotas/admin.ts`),
 * porque o painel mostra e devolve os dados como estão.
 */
import { getJson, sendJson } from './client';

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
  modulos: ModuloResumo[];
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

export const excluirTopico = (id: number) =>
  sendJson('DELETE', `/api/admin/topicos/${id}`);
