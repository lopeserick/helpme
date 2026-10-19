import type { Bloco } from '../db/schema.js';

/**
 * Tira acentos e caixa. É o que faz "relatorio" encontrar "Relatório".
 * Usada tanto para gravar o texto de busca quanto para normalizar o termo
 * pesquisado — as duas pontas precisam da mesma regra.
 */
export function normalizar(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Junta o que há de texto num tópico para alimentar a coluna `texto_busca`.
 * Guardar isso pronto evita vasculhar o JSON dos blocos a cada pesquisa.
 *
 * Quando a base crescer, o caminho natural é trocar por busca de texto
 * completa do PostgreSQL (tsvector com dicionário português).
 */
export function montarTextoBusca(titulo: string, blocos: Bloco[]) {
  const partes = [titulo];

  for (const bloco of blocos) {
    if (bloco.tipo === 'texto') partes.push(bloco.texto);
    else partes.push(bloco.alt, bloco.legenda ?? '');
  }

  return normalizar(partes.join(' '));
}
