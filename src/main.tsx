import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/schibsted-grotesk'
import App from './App'
import './styles/theme.css'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
