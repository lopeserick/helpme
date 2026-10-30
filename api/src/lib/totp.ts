import { createHmac, randomBytes } from 'node:crypto';

/**
 * Verificação em duas etapas por aplicativo (Google Authenticator, Microsoft
 * Authenticator, Authy...): códigos de 6 dígitos que mudam a cada 30 s
 * (TOTP, RFC 6238). Feito com o crypto do Node, sem dependência.
 */

const PASSO_S = 30;
const DIGITOS = 6;
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32(bytes: Buffer) {
  let bits = 0;
  let valor = 0;
  let saida = '';
  for (const byte of bytes) {
    valor = (valor << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      saida += ALFABETO[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) saida += ALFABETO[(valor << (5 - bits)) & 31];
  return saida;
}

function deBase32(texto: string) {
  const limpo = texto.replace(/[\s=-]/g, '').toUpperCase();
  let bits = 0;
  let valor = 0;
  const bytes: number[] = [];
  for (const letra of limpo) {
    const i = ALFABETO.indexOf(letra);
    if (i < 0) throw new Error('segredo inválido');
    valor = (valor << 5) | i;
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Novo segredo de 160 bits, em base32 (o formato que os aplicativos leem). */
export function novoSegredo() {
  return base32(randomBytes(20));
}

export function passoAtual(agora = Date.now()) {
  return Math.floor(agora / 1000 / PASSO_S);
}

export function codigoDoPasso(segredo: string, passo: number) {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(passo));
  const hmac = createHmac('sha1', deBase32(segredo)).update(contador).digest();
  const desloc = hmac[hmac.length - 1] & 0x0f;
  const numero = (hmac.readUInt32BE(desloc) & 0x7fffffff) % 10 ** DIGITOS;
  return String(numero).padStart(DIGITOS, '0');
}

/**
 * Confere um código aceitando 30 s de diferença de relógio para cada lado.
 * Devolve o passo que bateu (para não aceitar o mesmo código de novo) ou nada.
 */
export function conferirCodigo(segredo: string, codigo: string, ultimoPassoUsado = 0) {
  const limpo = codigo.replace(/\s/g, '');
  if (!/^\d{6}$/.test(limpo)) return undefined;
  const agora = passoAtual();
  for (const passo of [agora - 1, agora, agora + 1]) {
    if (passo <= ultimoPassoUsado) continue;
    if (codigoDoPasso(segredo, passo) === limpo) return passo;
  }
  return undefined;
}

/** Endereço que o aplicativo lê pelo QR code. */
export function enderecoOtpauth(segredo: string, conta: string, emissor = 'Help Me') {
  const rotulo = encodeURIComponent(`${emissor}:${conta}`);
  const params = new URLSearchParams({
    secret: segredo,
    issuer: emissor,
    algorithm: 'SHA1',
    digits: String(DIGITOS),
    period: String(PASSO_S),
  });
  return `otpauth://totp/${rotulo}?${params}`;
}

/** "JBSW Y3DP ..." — mais fácil de digitar quando não dá para ler o QR code. */
export function formatarSegredo(segredo: string) {
  return segredo.match(/.{1,4}/g)?.join(' ') ?? segredo;
}
