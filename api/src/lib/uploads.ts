import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { env } from '../env.js';

/**
 * Imagens enviadas pelo painel: validação, redimensionamento e gravação em
 * disco. O banco guarda só a referência (tabela `imagem`); o arquivo fica na
 * pasta `UPLOADS_DIR`, que precisa entrar no backup junto com o banco.
 */

/** Maior tamanho aceito no envio. */
export const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;

/** Largura máxima guardada: um print enorme não pode travar a página do cliente. */
const LARGURA_MAXIMA = 1600;

/** Limite de pixels aceito na entrada, contra imagens "bomba" que estouram a memória. */
const PIXELS_MAXIMOS = 50_000_000;

const FORMATOS_ACEITOS = new Set(['jpeg', 'png', 'webp']);

/** Erro de entrada: a mensagem já está pronta para a pessoa ler. */
export class ImagemInvalidaError extends Error {}

export interface ImagemProcessada {
  dados: Buffer;
  largura: number;
  altura: number;
  bytes: number;
}

/** Endereço público de um arquivo de imagem (servido em `/uploads`). */
export function urlDaImagem(arquivo: string) {
  return `/uploads/${arquivo}`;
}

/** Cria a pasta de imagens se ainda não existir. Chamado na subida da API. */
export async function garantirPastaDeUploads() {
  await mkdir(env.uploadsDir, { recursive: true });
}

/**
 * Confere que o arquivo é mesmo PNG, JPEG ou WebP (pelo conteúdo, não pela
 * extensão nem pelo tipo informado), corrige a orientação, limita a largura e
 * converte para WebP. A conversão também descarta metadados, como a
 * localização da foto.
 */
export async function processarImagem(entrada: Buffer): Promise<ImagemProcessada> {
  const nao = new ImagemInvalidaError('Envie uma imagem PNG, JPEG ou WebP.');

  try {
    const origem = sharp(entrada, { limitInputPixels: PIXELS_MAXIMOS });
    const { format } = await origem.metadata();
    if (!format || !FORMATOS_ACEITOS.has(format)) throw nao;

    const { data, info } = await origem
      .rotate()
      .resize({ width: LARGURA_MAXIMA, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

    return { dados: data, largura: info.width, altura: info.height, bytes: info.size };
  } catch (erro) {
    if (erro instanceof ImagemInvalidaError) throw erro;
    throw nao;
  }
}

export async function gravarImagem(arquivo: string, dados: Buffer) {
  // 'wx' recusa sobrescrever: o nome é um id novo, então já existir seria um erro.
  await writeFile(join(env.uploadsDir, arquivo), dados, { flag: 'wx' });
}

export async function apagarImagem(arquivo: string) {
  await rm(join(env.uploadsDir, arquivo), { force: true });
}
