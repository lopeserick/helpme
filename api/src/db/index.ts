import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env.js';
import * as schema from './schema.js';

export const conexao = postgres(env.DATABASE_URL, {
  max: 10,
  // Sem isso, um servidor inalcançável deixa a requisição pendurada.
  connect_timeout: 5,
});
export const db = drizzle(conexao, { schema });
