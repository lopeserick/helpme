import { Outlet } from 'react-router-dom';
import AuthProvider from './AuthProvider';

/** Elemento das rotas /admin: dá acesso ao login atual para todas as telas. */
export default function AdminLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
