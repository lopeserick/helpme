import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Estoque from './pages/Estoque';
import Financeiro from './pages/Financeiro';
import Sintegra from './pages/Sintegra';
import PrimeirosPassos from './pages/PrimeirosPassos';
import News from './pages/News';
import Relatorios from './pages/Relatorios';
import NotFound from './pages/NotFound';

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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
