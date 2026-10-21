/** Ícones que o site sabe desenhar (`src/components/CategoryIcon`). */
export const ICONES = ['database', 'dollar', 'book', 'star', 'chart'] as const;

/**
 * Endereços que já são do site ou do servidor. Um módulo com um desses slugs
 * tomaria o lugar do painel, da API, das imagens ou dos arquivos do build.
 */
export const SLUGS_RESERVADOS = new Set([
  'admin',
  'api',
  'uploads',
  'assets',
  'exemplos',
  'index.html',
  'favicon.ico',
]);
