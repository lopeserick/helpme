import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth-context';

/**
 * Só deixa passar quem está logado; os demais vão para a tela de login.
 * Se a central exige verificação em duas etapas e a conta ainda não ativou,
 * a única tela liberada é a da verificação, onde se ativa.
 */
export default function RequireAuth() {
  const { usuario, carregando, exige2fa } = useAuth();
  const location = useLocation();

  if (carregando) {
    return (
      <p role="status" style={{ padding: '48px 24px', color: 'var(--ink-muted)' }}>
        Carregando…
      </p>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (exige2fa && !usuario.doisFatores && location.pathname !== '/conta/dois-fatores') {
    return <Navigate to="/conta/dois-fatores" replace />;
  }

  return <Outlet />;
}
