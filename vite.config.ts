import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Em desenvolvimento a API roda em outra porta. O site chama /api e /uploads
// no próprio endereço e o Vite repassa para ela, o que dispensa CORS aqui.
// Em produção o servidor web (IIS) faz o mesmo papel.
const api = 'http://localhost:3000'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 3000 é da API.
    port: 5173,
    open: true,
    proxy: {
      '/api': api,
      '/uploads': api,
    },
  },
})
