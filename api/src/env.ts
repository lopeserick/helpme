// Carrega o .env antes de qualquer leitura de process.env. Fica aqui, e não
// num parâmetro de linha de comando, para valer em toda entrada da aplicação:
// servidor, seed e qualquer script futuro.
import 'dotenv/config';
import { z } from 'zod';

/**
 * Configuração lida do ambiente. Se faltar algo, a API para na subida com
 * uma mensagem clara, em vez de quebrar no meio de uma requisição.
 */
const faltaEnv = 'não definida. Copie o .env.example para .env (veja o README).';

const schema = z.object({
  DATABASE_URL: z.string({ error: faltaEnv }).min(1, faltaEnv),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  /** Endereços do site autorizados a chamar a API, separados por vírgula. */
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),
});

const resultado = schema.safeParse(process.env);

if (!resultado.success) {
  const problemas = resultado.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  console.error(`Configuração inválida:\n${problemas}`);
  process.exit(1);
}

export const env = {
  ...resultado.data,
  corsOrigins: resultado.data.CORS_ORIGINS.split(',').map((o) => o.trim()),
};
