/**
 * Acesso à API de conteúdo.
 *
 * Por padrão as chamadas vão para o mesmo endereço do site (`/api/...`):
 * em desenvolvimento o Vite repassa para a API (veja `vite.config.ts`) e em
 * produção o IIS faz o mesmo. Só defina `VITE_API_URL` se a API estiver em
 * outro endereço, por exemplo `VITE_API_URL=http://servidor:3000`.
 */
const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

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
  return 'Não foi possível carregar o conteúdo.';
}

export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let resposta: Response;

  try {
    resposta = await fetch(`${base}${path}`, {
      signal,
      headers: { Accept: 'application/json' },
    });
  } catch (erro) {
    // Pedido cancelado por quem chamou: não é falha de conexão.
    if (signal?.aborted) throw erro;
    throw new ApiError(
      'Não foi possível falar com a central. Confira a conexão e tente de novo.',
    );
  }

  if (!resposta.ok) {
    throw new ApiError(mensagemPara(resposta.status), resposta.status);
  }

  return (await resposta.json()) as T;
}
