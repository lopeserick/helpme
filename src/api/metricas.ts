/**
 * Métricas enviadas pelo site público. São "atire e esqueça": se a API não
 * responder, a pessoa não percebe nada e a central segue funcionando.
 */
import { sendJson } from './client';

function enviar(path: string, corpo: unknown) {
  sendJson('POST', path, corpo).catch(() => {
    // Métrica perdida não é motivo para incomodar quem está lendo.
  });
}

export const registrarAcesso = (modulo: string, topico: string) =>
  enviar('/api/metricas/acesso', { modulo, topico });

export const registrarAvaliacao = (modulo: string, topico: string, ajudou: boolean) =>
  enviar('/api/metricas/avaliacao', { modulo, topico, ajudou });

export const registrarBuscaVazia = (termo: string) =>
  enviar('/api/metricas/busca-vazia', { termo });

/* Lembrança de voto, por navegador. Pode falhar (aba anônima, cookies bloqueados). */
const CHAVE_VOTOS = 'helpme:votos';

export function jaVotou(chave: string) {
  try {
    const votos = JSON.parse(localStorage.getItem(CHAVE_VOTOS) ?? '[]') as string[];
    return votos.includes(chave);
  } catch {
    return false;
  }
}

export function lembrarVoto(chave: string) {
  try {
    const votos = JSON.parse(localStorage.getItem(CHAVE_VOTOS) ?? '[]') as string[];
    localStorage.setItem(CHAVE_VOTOS, JSON.stringify([...votos, chave].slice(-500)));
  } catch {
    // Sem armazenamento: a pessoa só vai ver a pergunta de novo.
  }
}
