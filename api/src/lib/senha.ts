import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * Hash de senha com scrypt, que já vem no Node: nada para compilar no Windows.
 * O valor guardado carrega os parâmetros, então dá para endurecer o custo no
 * futuro sem invalidar as senhas antigas:
 *
 *   scrypt$N$r$p$salt(base64)$hash(base64)
 */
const N = 16384;
const R = 8;
const P = 1;
const TAMANHO = 64;

function derivar(senha: string, salt: Buffer, n: number, r: number, p: number) {
  const opcoes: ScryptOptions = { N: n, r, p, maxmem: 128 * n * r * 2 };
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(senha.normalize('NFKC'), salt, TAMANHO, opcoes, (erro, chave) =>
      erro ? reject(erro) : resolve(chave),
    );
  });
}

export async function gerarHash(senha: string) {
  const salt = randomBytes(16);
  const chave = await derivar(senha, salt, N, R, P);
  return ['scrypt', N, R, P, salt.toString('base64'), chave.toString('base64')].join('$');
}

export async function conferirSenha(senha: string, guardado: string) {
  const [formato, n, r, p, salt, hash] = guardado.split('$');
  if (formato !== 'scrypt' || !salt || !hash) return false;

  const esperado = Buffer.from(hash, 'base64');
  const obtido = await derivar(senha, Buffer.from(salt, 'base64'), Number(n), Number(r), Number(p));

  return obtido.length === esperado.length && timingSafeEqual(obtido, esperado);
}

/**
 * Hash de mentira, para gastar o mesmo tempo quando o e-mail não existe. Sem
 * isso, a resposta mais rápida entregaria quais e-mails têm conta.
 */
export const hashFalso = await gerarHash(randomBytes(16).toString('hex'));
