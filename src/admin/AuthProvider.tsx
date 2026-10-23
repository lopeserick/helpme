import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  criarConta,
  entrar as entrarNaApi,
  sair as sairDaApi,
  usuarioAtual,
  type Usuario,
} from '../api/admin';
import { SESSAO_EXPIRADA } from '../api/client';
import { AuthContext, type AuthContextValue } from './auth-context';

/**
 * Guarda quem está logado no painel. Só envolve as rotas /admin: o site
 * público nunca pergunta quem é o visitante.
 */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Ao abrir o painel, descobre se já existe sessão (cookie ainda válido).
  useEffect(() => {
    const controller = new AbortController();

    usuarioAtual(controller.signal)
      .then((r) => setUsuario(r.usuario))
      .catch(() => {
        // 401 (sem sessão) ou API fora do ar: o painel pede login do mesmo jeito.
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });

    return () => controller.abort();
  }, []);

  // Sessão vencida no meio do trabalho: volta para a tela de login.
  useEffect(() => {
    const aoExpirar = () => setUsuario(null);
    window.addEventListener(SESSAO_EXPIRADA, aoExpirar);
    return () => window.removeEventListener(SESSAO_EXPIRADA, aoExpirar);
  }, []);

  const valor = useMemo<AuthContextValue>(
    () => ({
      usuario,
      carregando,
      entrar: async (email, senha) => {
        const r = await entrarNaApi(email, senha);
        setUsuario(r.usuario);
      },
      cadastrar: async (dados) => {
        const r = await criarConta(dados);
        setUsuario(r.usuario);
      },
      sair: async () => {
        try {
          await sairDaApi();
        } finally {
          setUsuario(null);
        }
      },
    }),
    [usuario, carregando],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
