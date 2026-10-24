import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AdminLayout from '../admin/AdminLayout';
import RequireAuth from '../admin/RequireAuth';
import AdminLogin from '../pages/Admin/Login';
import AdminCadastro from '../pages/Admin/Cadastro';
import AdminDoisFatores from '../pages/Admin/DoisFatores';
import AdminTopicos from '../pages/Admin/Topicos';
import AdminEditor from '../pages/Admin/Editor';
import AdminModulos from '../pages/Admin/Modulos';
import AdminMetricas from '../pages/Admin/Metricas';
import AdminImagens from '../pages/Admin/Imagens';
import AdminAcessos from '../pages/Admin/Acessos';
import AdminSeguranca from '../pages/Admin/Seguranca';
import NotFound from '../pages/NotFound';

/**
 * Painel da equipe, servido no próprio endereço (ex.: painel.empresa.com.br).
 * Login, cadastro e a segunda etapa do login são abertos; o resto exige sessão.
 */
export default function AppPainel() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/login/codigo" element={<AdminDoisFatores />} />
          <Route path="/cadastro" element={<AdminCadastro />} />
          <Route element={<RequireAuth />}>
            <Route index element={<AdminTopicos />} />
            <Route path="/topicos/novo" element={<AdminEditor />} />
            <Route path="/topicos/:id" element={<AdminEditor />} />
            <Route path="/modulos" element={<AdminModulos />} />
            <Route path="/metricas" element={<AdminMetricas />} />
            <Route path="/imagens" element={<AdminImagens />} />
            <Route path="/acessos" element={<AdminAcessos />} />
            <Route path="/seguranca" element={<AdminSeguranca />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
