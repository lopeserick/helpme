import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../env.js';

/**
 * Cifra os segredos da verificação em duas etapas antes de irem para o banco
 * (AES-256-GCM). Assim, uma cópia do banco sozinha não basta para gerar
 * códigos: também seria preciso a CHAVE_2FA, que fica só no .env do servidor.
 *
 * Formato guardado: v1:<iv>:<tag>:<texto cifrado>, em base64.
 */

export class SemChave2faError extends Error {
  constructor() {
    super('CHAVE_2FA não definida no .env da API.');
  }
}

function chave() {
  if (!env.CHAVE_2FA) throw new SemChave2faError();
  return createHash('sha256').update(env.CHAVE_2FA).digest();
}

export function cifrar(texto: string) {
  const iv = randomBytes(12);
  const cifra = createCipheriv('aes-256-gcm', chave(), iv);
  const dados = Buffer.concat([cifra.update(texto, 'utf8'), cifra.final()]);
  return ['v1', iv, cifra.getAuthTag(), dados].map((p) => (typeof p === 'string' ? p : p.toString('base64'))).join(':');
}

export function decifrar(guardado: string) {
  const [versao, iv, tag, dados] = guardado.split(':');
  if (versao !== 'v1' || !iv || !tag || !dados) throw new Error('segredo em formato desconhecido');
  const decifra = createDecipheriv('aes-256-gcm', chave(), Buffer.from(iv, 'base64'));
  decifra.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decifra.update(Buffer.from(dados, 'base64')), decifra.final()]).toString('utf8');
}
