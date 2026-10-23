import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

function must(nome: string) {
  const valor = process.env[nome];
  if (!valor) {
    console.error(
      `Falta ${nome}. Copie o .env.example para .env e preencha (veja o README).`,
    );
    process.exit(1);
  }
  return valor;
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    // Falha aqui, com mensagem clara, em vez de tentar conectar em vazio.
    url: must('DATABASE_URL'),
  },
});
