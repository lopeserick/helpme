import { useEffect, useState } from 'react';
import { ApiError, getJson } from './client';

type Resultado<T> = { chave: string; data?: T; error?: Error };

/**
 * Busca um endereço da API e devolve o estado da chamada.
 *
 * `parse` converte a resposta no formato da tela e precisa ser uma função
 * estável (declarada fora do componente), senão a busca se repete a cada
 * renderização. Se o endereço mudar, o estado volta para "carregando".
 */
export function useApi<Raw, T>(path: string, parse: (raw: Raw) => T) {
  const [tentativa, setTentativa] = useState(0);
  const [resultado, setResultado] = useState<Resultado<T> | null>(null);

  const chave = `${path}#${tentativa}`;

  useEffect(() => {
    const controller = new AbortController();

    getJson<Raw>(path, controller.signal)
      .then((raw) => setResultado({ chave, data: parse(raw) }))
      .catch((erro: unknown) => {
        if (controller.signal.aborted) return;
        setResultado({
          chave,
          error:
            erro instanceof Error
              ? erro
              : new ApiError('Não foi possível carregar o conteúdo.'),
        });
      });

    return () => controller.abort();
  }, [path, chave, parse]);

  // Um resultado de outro endereço (ou de outra tentativa) não vale mais.
  const atual = resultado?.chave === chave ? resultado : null;

  return {
    data: atual?.data,
    error: atual?.error,
    loading: atual === null,
    retry: () => setTentativa((n) => n + 1),
  };
}
