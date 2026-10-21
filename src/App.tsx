import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Module from './pages/Module';
import NotFound from './pages/NotFound';
import AdminLayout from './admin/AdminLayout';
import RequireAuth from './admin/RequireAuth';
import AdminLogin from './pages/Admin/Login';
import AdminCadastro from './pages/Admin/Cadastro';
import AdminTopicos from './pages/Admin/Topicos';
import AdminEditor from './pages/Admin/Editor';
import AdminModulos from './pages/Admin/Modulos';
import AdminMetricas from './pages/Admin/Metricas';
import AdminImagens from './pages/Admin/Imagens';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Qualquer módulo, inclusive os criados pelo painel. As rotas de /admin
            ganham desta porque o React Router prefere a rota mais específica. */}
        <Route path="/:slug" element={<Module />} />

        {/* Painel da equipe: login e cadastro abertos, o resto exige sessão. */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="login" element={<AdminLogin />} />
          <Route path="cadastro" element={<AdminCadastro />} />
          <Route element={<RequireAuth />}>
            <Route index element={<AdminTopicos />} />
            <Route path="topicos/novo" element={<AdminEditor />} />
            <Route path="topicos/:id" element={<AdminEditor />} />
            <Route path="modulos" element={<AdminModulos />} />
            <Route path="metricas" element={<AdminMetricas />} />
            <Route path="imagens" element={<AdminImagens />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
