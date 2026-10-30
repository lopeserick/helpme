import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Module from './pages/Module';
import NotFound from './pages/NotFound';
import Sugestoes from './pages/Sugestoes';

/**
 * Site público. O painel da equipe é outro aplicativo, em outro endereço
 * (`src/painel/`): nada dele entra neste build.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sugestoes" element={<Sugestoes />} />
        {/* Qualquer módulo, inclusive os criados pelo painel. */}
        <Route path="/:slug" element={<Module />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
