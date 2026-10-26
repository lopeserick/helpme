// Carrega o .env antes de qualquer leitura de process.env. Fica aqui, e não
// num parâmetro de linha de comando, para valer em toda entrada da aplicação:
// servidor, seed e qualquer script futuro.
import 'dotenv/config';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/**
 * Configuração lida do ambiente. Se faltar algo, a API para na subida com
 * uma mensagem clara, em vez de quebrar no meio de uma requisição.
 */
const faltaEnv = 'não definida. Copie o .env.example para .env (veja o README).';

/** Uma linha "NOME=" vazia no .env conta como não definida. */
const opcional = <T extends z.ZodType>(tipo: T) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), tipo.optional());

const schema = z.object({
  DATABASE_URL: z.string({ error: faltaEnv }).min(1, faltaEnv),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  /** Endereços do site autorizados a chamar a API, separados por vírgula. */
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),
  /**
   * Código que a pessoa precisa informar para criar uma conta no painel. Sem
   * ele definido o cadastro fica desligado: nunca é aberto a qualquer um.
   */
  CODIGO_CADASTRO: opcional(z.string().trim().min(6, 'use ao menos 6 caracteres')),
  /**
   * Pasta onde ficam as imagens enviadas pelo painel. Em produção, use um caminho
   * absoluto fora do código (ex.: D:\\helpme\\uploads) e inclua no backup. Vazio:
   * usa a pasta `uploads` dentro de `api/`.
   */
  UPLOADS_DIR: opcional(z.string().trim().min(1)),
  /** Quanto tempo a pessoa fica logada, em horas, no máximo. */
  SESSAO_HORAS: z.coerce.number().positive().default(12),
  /** Minutos sem usar o painel até a sessão cair. */
  SESSAO_INATIVIDADE_MIN: z.coerce.number().positive().default(30),
  /**
   * Endereços do PAINEL, separados por vírgula. Toda ação que grava algo em
   * /api/admin e /api/auth precisa vir de um deles (cabeçalho Origin).
   */
  PAINEL_ORIGENS: z.string().default('http://localhost:5174'),
  /** Tentativas de login, código e cadastro por minuto, por IP. */
  LIMITE_TENTATIVAS_IP: z.coerce.number().int().positive().default(10),
  /** Senhas erradas seguidas que bloqueiam a conta, e por quantos minutos. */
  LOGIN_MAX_FALHAS: z.coerce.number().int().positive().default(5),
  LOGIN_BLOQUEIO_MIN: z.coerce.number().positive().default(15),
  /** true: toda conta precisa ativar a verificação em duas etapas para usar o painel. */
  EXIGIR_2FA: z.stringbool().default(false),
  /**
   * Chave que cifra os segredos da verificação em duas etapas no banco. Gere
   * uma vez (veja o README) e guarde: trocá-la invalida a 2FA de todos.
   */
  CHAVE_2FA: opcional(z.string().trim().min(32, 'use ao menos 32 caracteres')),
  /** Ligue (true) quando o site for servido por HTTPS: o cookie só viaja criptografado. */
  COOKIE_SECURE: z.stringbool().default(false),
  /** Ligue (true) atrás do IIS, para o limite de tentativas enxergar o IP real. */
  TRUST_PROXY: z.stringbool().default(false),

  /* ---------------------------- Sugestões ---------------------------- */
  /** Para onde vão as sugestões enviadas pelo site. Sem isso, o formulário fica desligado. */
  SUGESTOES_DESTINO: opcional(z.email('SUGESTOES_DESTINO precisa ser um e-mail')),
  /** Sugestões aceitas por IP a cada 15 minutos (contra spam). */
  LIMITE_SUGESTOES: z.coerce.number().int().positive().default(5),
  /** Servidor de e-mail que envia. Gmail: smtp.gmail.com, porta 465, seguro. */
  SMTP_HOST: z.string().trim().default('smtp.gmail.com'),
  SMTP_PORTA: z.coerce.number().int().positive().default(465),
  /** true para a porta 465 (SSL direto); false para 587 (STARTTLS). */
  SMTP_SEGURO: z.stringbool().default(true),
  /** A conta que envia. No Gmail, a senha é uma "senha de app", não a senha normal. */
  SMTP_USUARIO: opcional(z.string().trim()),
  SMTP_SENHA: opcional(z.string()),
  /** Nome que aparece como remetente. */
  SMTP_NOME_REMETENTE: z.string().trim().default('Sugestões · Help Me'),

  /* --------------------- Integração com o Jira ---------------------- */
  /* Ainda desligada: veja src/integracoes/jira.ts e docs/jira.md.       */
  JIRA_URL: opcional(z.url('JIRA_URL precisa ser um endereço, ex.: https://empresa.atlassian.net')),
  JIRA_EMAIL: opcional(z.email('JIRA_EMAIL precisa ser um e-mail')),
  JIRA_TOKEN: opcional(z.string().trim()),
  JIRA_JQL: opcional(z.string().trim()),
  JIRA_CAMPO_TEXTO: opcional(z.string().trim()),
  JIRA_ROTULOS: opcional(z.string().trim()),
  JIRA_INTERVALO_MIN: z.coerce.number().positive().default(30),
});

const resultado = schema
  .refine((v) => !v.EXIGIR_2FA || v.CHAVE_2FA, {
    message: 'EXIGIR_2FA=true precisa da CHAVE_2FA definida (senão ninguém consegue ativar)',
    path: ['EXIGIR_2FA'],
  })
  .safeParse(process.env);

if (!resultado.success) {
  const problemas = resultado.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  console.error(`Configuração inválida:\n${problemas}`);
  process.exit(1);
}

export const env = {
  ...resultado.data,
  painelOrigens: resultado.data.PAINEL_ORIGENS.split(',').map((o) => o.trim()),
  uploadsDir: resultado.data.UPLOADS_DIR
    ? resolve(resultado.data.UPLOADS_DIR)
    : fileURLToPath(new URL('../uploads', import.meta.url)),
  corsOrigins: resultado.data.CORS_ORIGINS.split(',').map((o) => o.trim()),
};
