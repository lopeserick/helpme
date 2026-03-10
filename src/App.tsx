import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home'
import Estoque from './pages/Estoque';
import Financeiro from './pages/Financeiro';
import Sintegra from './pages/Sintegra';
import News from './pages/News';
import Relatorios from './pages/Relatorios';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/sintegra" element={<Sintegra />} />
        <Route path="/sintegra" element={<News />} />
        <Route path="/sintegra" element={<Relatorios />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;