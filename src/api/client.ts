/**
 * Acesso à API de conteúdo.
 *
 * Por padrão as chamadas vão para o mesmo endereço do site (`/api/...`):
 * em desenvolvimento o Vite repassa para a API (veja `vite.config.ts`) e em
 * produção o IIS faz o mesmo. Só defina `VITE_API_URL` se a API estiver em
 * outro endereço, por exemplo `VITE_API_URL=http://servidor:3000`.
 */
const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

/** O painel usa cookie de sessão; ele precisa ir junto em toda chamada. */
const credentials: RequestCredentials = base ? 'include' : 'same-origin';

/** Disparado quando a API recusa uma chamada do painel por falta de login. */
export const SESSAO_EXPIRADA = 'helpme:sessao-expirada';

/** Erro com texto já pronto para mostrar a quem está lendo a central. */
export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Endereço de um arquivo servido pela API, como as imagens de `/uploads`. */
export function mediaUrl(path: string) {
  return `${base}${path}`;
}

function mensagemPara(status: number) {
  if (status === 404) return 'Não encontramos esse conteúdo.';
  if (status >= 500) {
    return 'A central está com problema no momento. Tente de novo em instantes.';
  }
  return 'Não foi possível concluir. Tente de novo.';
}

interface CorpoDeErro {
  erro?: string;
  problemas?: { mensagem?: string }[];
}

/** Prefere o texto que a API mandou (já em português) ao texto genérico. */
async function mensagemDaResposta(resposta: Response) {
  if (resposta.status < 500) {
    try {
      const corpo = (await resposta.json()) as CorpoDeErro;
      const detalhe = corpo.problemas?.[0]?.mensagem;
      if (detalhe) return detalhe;
      if (corpo.erro && corpo.erro !== 'requisição inválida') return corpo.erro;
    } catch {
      // Corpo que não é JSON: cai no texto genérico.
    }
  }
  return mensagemPara(resposta.status);
}

async function chamar(path: string, init: RequestInit) {
  let resposta: Response;

  try {
    resposta = await fetch(`${base}${path}`, {
      credentials,
      ...init,
      headers: { Accept: 'application/json', ...init.headers },
    });
  } catch (erro) {
    // Pedido cancelado por quem chamou: não é falha de conexão.
    if (init.signal?.aborted) throw erro;
    throw new ApiError(
      'Não foi possível falar com a central. Confira a conexão e tente de novo.',
    );
  }

  if (!resposta.ok) {
    // Um 401 fora das telas de entrada significa sessão vencida.
    if (resposta.status === 401 && !path.startsWith('/api/auth/')) {
      window.dispatchEvent(new Event(SESSAO_EXPIRADA));
    }
    throw new ApiError(await mensagemDaResposta(resposta), resposta.status);
  }

  return resposta;
}

export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const resposta = await chamar(path, { signal });
  return (await resposta.json()) as T;
}

/** POST de arquivo (multipart). Não define Content-Type: o navegador acerta o limite do corpo. */
export async function sendForm<T>(path: string, form: FormData): Promise<T> {
  const resposta = await chamar(path, { method: 'POST', body: form });
  return (await resposta.json()) as T;
}

/** POST, PUT ou DELETE com corpo JSON opcional. Respostas 204 devolvem `undefined`. */
export async function sendJson<T = undefined>(
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const resposta = await chamar(path, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (resposta.status === 204) return undefined as T;
  return (await resposta.json()) as T;
}
