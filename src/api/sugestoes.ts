import { sendForm } from './client';

/** Limites iguais aos da API (api/src/rotas/sugestoes.ts). */
export const MAX_IMAGENS_SUGESTAO = 3;
export const TAMANHO_MAXIMO_IMAGEM_SUGESTAO = 5 * 1024 * 1024;
export const TIPOS_IMAGEM_SUGESTAO = ['image/png', 'image/jpeg', 'image/webp'];

export interface DadosSugestao {
  nome: string;
  email: string;
  empresa: string;
  titulo: string;
  texto: string;
  imagens: File[];
  /** Campo-armadilha para robôs: pessoas não o veem e ele vai vazio. */
  site: string;
}

export const parseDisponivel = (raw: { disponivel: boolean }) => raw.disponivel;

export function enviarSugestao(dados: DadosSugestao) {
  const form = new FormData();
  form.append('nome', dados.nome);
  form.append('email', dados.email);
  form.append('empresa', dados.empresa);
  form.append('titulo', dados.titulo);
  form.append('texto', dados.texto);
  form.append('site', dados.site);
  for (const imagem of dados.imagens) form.append('imagens', imagem);
  return sendForm<{ ok: boolean }>('/api/sugestoes', form);
}
