import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/schibsted-grotesk';
import AppPainel from './AppPainel';
import '../styles/theme.css';
import '../styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppPainel />
  </React.StrictMode>,
);
