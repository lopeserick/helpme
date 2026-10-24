import { defineConfig, type Plugin, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, renameSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Dois aplicativos no mesmo projeto, cada um com o seu build e o seu endereço:
 *
 *   ALVO=site    (padrão) site público  → dist/site,   dev em :5173
 *   ALVO=painel           painel        → dist/painel, dev em :5174
 *
 * O site público nunca recebe o código do painel e, como em produção, não
 * alcança as rotas /api/admin e /api/auth: só o endereço do painel chega nelas.
 */
const alvo = process.env.ALVO === 'painel' ? 'painel' : 'site'

// Em desenvolvimento a API roda em outra porta. O Vite repassa /api e /uploads
// para ela, como o IIS faz em produção.
const api = 'http://localhost:3000'

/** No site público, /api/admin e /api/auth respondem 404, como no IIS. */
const somentePublico: ProxyOptions = {
  target: api,
  bypass: (req, res) => {
    if (/^\/api\/(admin|auth)(\/|$|\?)/.test(req.url ?? '')) {
      res.statusCode = 404
      res.end()
      return false
    }
  },
}

/**
 * O painel tem a própria página (painel.html). Em desenvolvimento, qualquer
 * endereço de tela é servido por ela; no build, ela vira o index.html de
 * dist/painel, para o IIS servir na raiz do endereço do painel.
 */
function paginaDoPainel(): Plugin {
  return {
    name: 'pagina-do-painel',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? '/'
        const ehTela =
          req.headers.accept?.includes('text/html') &&
          !url.startsWith('/@') &&
          !url.startsWith('/src/') &&
          !url.startsWith('/node_modules/') &&
          !/\.[a-z0-9]+(\?|$)/i.test(url)
        if (ehTela) req.url = '/painel.html'
        next()
      })
    },
    writeBundle(opcoes) {
      const pasta = opcoes.dir ?? 'dist/painel'
      const origem = join(pasta, 'painel.html')
      if (existsSync(origem)) renameSync(origem, join(pasta, 'index.html'))
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(
  alvo === 'painel'
    ? {
        plugins: [react(), paginaDoPainel()],
        build: {
          outDir: 'dist/painel',
          emptyOutDir: true,
          rollupOptions: { input: 'painel.html' },
        },
        server: {
          port: 5174,
          open: '/',
          proxy: { '/api': api, '/uploads': api },
        },
      }
    : {
        plugins: [react()],
        build: { outDir: 'dist/site', emptyOutDir: true },
        server: {
          // 3000 é da API; 5174 é do painel.
          port: 5173,
          open: true,
          proxy: { '/api': somentePublico, '/uploads': api },
        },
      },
)
