import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth-context';

/** Só deixa passar quem está logado; os demais vão para a tela de login. */
export default function RequireAuth() {
  const { usuario, carregando } = useAuth();
  const location = useLocation();

  if (carregando) {
    return (
      <p role="status" style={{ padding: '48px 24px', color: 'var(--ink-muted)' }}>
        Carregando…
      </p>
    );
  }

  if (!usuario) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
