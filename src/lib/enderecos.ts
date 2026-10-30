/**
 * O site público e o painel ficam em endereços diferentes (por exemplo
 * ajuda.empresa.com.br e painel.empresa.com.br). O painel usa isto para criar
 * links que abrem o site público, como "Ver no site".
 *
 * Defina VITE_SITE_URL no build do painel. Em desenvolvimento, o site roda em
 * http://localhost:5173.
 */
const site = (import.meta.env.VITE_SITE_URL ?? 'http://localhost:5173').replace(/\/$/, '');

export function siteUrl(caminho = '/') {
  return `${site}${caminho.startsWith('/') ? caminho : `/${caminho}`}`;
}
