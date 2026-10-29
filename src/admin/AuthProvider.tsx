import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  criarConta,
  entrar as entrarNaApi,
  enviarCodigoLogin,
  sair as sairDaApi,
  usuarioAtual,
  type Usuario,
} from '../api/admin';
import { EXIGE_2FA, SESSAO_EXPIRADA } from '../api/client';
import { AuthContext, type AuthContextValue } from './auth-context';

/** Guarda quem está logado no painel. */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [exige2fa, setExige2fa] = useState(false);
  const [carregando, setCarregando] = useState(true);

  // Ao abrir o painel, descobre se já existe sessão (cookie ainda válido).
  useEffect(() => {
    const controller = new AbortController();

    usuarioAtual(controller.signal)
      .then((r) => {
        setUsuario(r.usuario);
        setExige2fa(r.exige2fa);
      })
      .catch(() => {
        // 401 (sem sessão) ou API fora do ar: o painel pede login do mesmo jeito.
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });

    return () => controller.abort();
  }, []);

  // Sessão vencida (ou parada demais) no meio do trabalho: volta ao login.
  // 2FA exigida e ainda não ativada: RequireAuth leva para a tela da verificação.
  useEffect(() => {
    const aoExpirar = () => setUsuario(null);
    const aoExigir2fa = () => setExige2fa(true);
    window.addEventListener(SESSAO_EXPIRADA, aoExpirar);
    window.addEventListener(EXIGE_2FA, aoExigir2fa);
    return () => {
      window.removeEventListener(SESSAO_EXPIRADA, aoExpirar);
      window.removeEventListener(EXIGE_2FA, aoExigir2fa);
    };
  }, []);

  const valor = useMemo<AuthContextValue>(
    () => ({
      usuario,
      carregando,
      exige2fa,
      entrar: async (email, senha) => {
        const r = await entrarNaApi(email, senha);
        if ('etapa' in r) return 'codigo';
        setUsuario(r.usuario);
        return 'ok';
      },
      enviarCodigo: async (codigo) => {
        const r = await enviarCodigoLogin(codigo);
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
      atualizarDoisFatores: (ligada) =>
        setUsuario((atual) => (atual ? { ...atual, doisFatores: ligada } : atual)),
    }),
    [usuario, carregando, exige2fa],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
