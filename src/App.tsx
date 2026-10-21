import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Estoque from './pages/Estoque';
import Financeiro from './pages/Financeiro';
import Sintegra from './pages/Sintegra';
import PrimeirosPassos from './pages/PrimeirosPassos';
import News from './pages/News';
import Relatorios from './pages/Relatorios';
import NotFound from './pages/NotFound';
import AdminLayout from './admin/AdminLayout';
import RequireAuth from './admin/RequireAuth';
import AdminLogin from './pages/Admin/Login';
import AdminCadastro from './pages/Admin/Cadastro';
import AdminTopicos from './pages/Admin/Topicos';
import AdminEditor from './pages/Admin/Editor';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/sintegra" element={<Sintegra />} />
        <Route path="/primeiros-passos" element={<PrimeirosPassos />} />
        <Route path="/novidades" element={<News />} />
        <Route path="/relatorios" element={<Relatorios />} />

        {/* Painel da equipe: login e cadastro abertos, o resto exige sessão. */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="login" element={<AdminLogin />} />
          <Route path="cadastro" element={<AdminCadastro />} />
          <Route element={<RequireAuth />}>
            <Route index element={<AdminTopicos />} />
            <Route path="topicos/novo" element={<AdminEditor />} />
            <Route path="topicos/:id" element={<AdminEditor />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
