/**
 * Integração com o Jira: tickets viram rascunhos em "O que há de novo".
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ AINDA DESLIGADA. Para ligar:                                         │
 * │ 1. preencha as variáveis JIRA_* no .env (modelo no .env.example);    │
 * │ 2. teste uma vez com: npm run jira:sincronizar                       │
 * │ 3. descomente a linha "iniciarSincronizacaoJira" em src/server.ts.   │
 * │ Passo a passo em docs/jira.md.                                       │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Como funciona:
 * - A cada JIRA_INTERVALO_MIN, busca no Jira Cloud os tickets da JIRA_JQL
 *   (ex.: os marcados com o label "novidade-site" e concluídos).
 * - Cada ticket vira um RASCUNHO no módulo "novidades". Nunca publica
 *   sozinho: ticket é escrito para a equipe e pode ter detalhe interno, então
 *   alguém revisa o texto no painel e clica em Publicar.
 * - O tópico guarda a chave do ticket (coluna topico.jira_chave). Se o
 *   ticket mudar e o tópico ainda for rascunho, o rascunho é atualizado; se
 *   já foi publicado, a integração não mexe mais nele.
 * - A API só LÊ o Jira. A conta do token deve ter permissão só de leitura.
 *
 * API usada: Jira Cloud REST v3, busca por JQL (POST /rest/api/3/search/jql).
 * Conferir na documentação da Atlassian antes de ligar, porque eles mudam
 * essa rota de tempos em tempos.
 */
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { alteracao, modulo, topico, type Bloco } from '../db/schema.js';
import { env } from '../env.js';
import { montarTextoBusca } from '../lib/texto.js';

/** Módulo onde os avisos entram. */
const MODULO_NOVIDADES = 'novidades';
/** Máximo de tickets lidos por sincronização. */
const MAXIMO_TICKETS = 100;

export function jiraConfigurado() {
  return Boolean(env.JIRA_URL && env.JIRA_EMAIL && env.JIRA_TOKEN && env.JIRA_JQL);
}

/** "rotina-nova=Rotina nova,validacao-fiscal=Validação fiscal" → mapa label → rótulo. */
function mapaDeRotulos() {
  const mapa = new Map<string, string>();
  for (const par of (env.JIRA_ROTULOS ?? '').split(',')) {
    const [label, rotulo] = par.split('=').map((p) => p?.trim());
    if (label && rotulo) mapa.set(label.toLowerCase(), rotulo);
  }
  return mapa;
}

/* ------------------------------------------------------------------ */
/* Texto do Jira                                                       */
/* ------------------------------------------------------------------ */

interface NoAdf {
  type?: string;
  text?: string;
  content?: NoAdf[];
}

/**
 * Na API v3, descrição e campos de texto longo vêm em ADF (Atlassian
 * Document Format), um JSON de blocos. Aqui viram parágrafos simples.
 */
function adfParaParagrafos(no: unknown): string[] {
  if (typeof no === 'string') return no.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (!no || typeof no !== 'object') return [];

  const paragrafos: string[] = [];
  const textoDe = (n: NoAdf): string =>
    n.type === 'text' ? (n.text ?? '') : n.type === 'hardBreak' ? '\n' : (n.content ?? []).map(textoDe).join('');

  const visitar = (n: NoAdf) => {
    if (['paragraph', 'heading', 'listItem', 'blockquote', 'codeBlock'].includes(n.type ?? '')) {
      const t = textoDe(n).trim();
      if (t) paragrafos.push(n.type === 'listItem' ? `• ${t}` : t);
      return;
    }
    (n.content ?? []).forEach(visitar);
  };
  visitar(no as NoAdf);
  return paragrafos;
}

/* ------------------------------------------------------------------ */
/* Leitura do Jira                                                     */
/* ------------------------------------------------------------------ */

interface Ticket {
  chave: string;
  titulo: string;
  rotulo: string | null;
  paragrafos: string[];
  concluidoEm: string | null;
}

async function buscarTickets(): Promise<Ticket[]> {
  const base = env.JIRA_URL!.replace(/\/$/, '');
  const campoTexto = env.JIRA_CAMPO_TEXTO || 'description';
  const autorizacao = Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_TOKEN}`).toString('base64');

  const resposta = await fetch(`${base}/rest/api/3/search/jql`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${autorizacao}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jql: env.JIRA_JQL,
      maxResults: MAXIMO_TICKETS,
      fields: ['summary', 'labels', 'resolutiondate', campoTexto],
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => '');
    throw new Error(`Jira respondeu ${resposta.status}: ${corpo.slice(0, 300)}`);
  }

  const dados = (await resposta.json()) as {
    issues?: { key: string; fields: Record<string, unknown> }[];
  };
  const rotulos = mapaDeRotulos();

  return (dados.issues ?? []).map((issue) => {
    const labels = (issue.fields.labels as string[] | undefined) ?? [];
    const rotulo = labels.map((l) => rotulos.get(l.toLowerCase())).find(Boolean) ?? null;
    return {
      chave: issue.key,
      titulo: String(issue.fields.summary ?? issue.key).slice(0, 160),
      rotulo,
      paragrafos: adfParaParagrafos(issue.fields[campoTexto]),
      concluidoEm: (issue.fields.resolutiondate as string | null) ?? null,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Gravação no banco                                                   */
/* ------------------------------------------------------------------ */

function slugDoTicket(chave: string, titulo: string) {
  const base = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  // A chave no fim garante endereço único: "nova-validacao-de-cst-acs-482".
  return `${base || 'aviso'}-${chave.toLowerCase()}`;
}

export interface ResultadoSincronizacao {
  lidos: number;
  criados: number;
  atualizados: number;
  /** Rascunhos que já estavam iguais ao ticket. */
  inalterados: number;
  ignorados: number;
}

export async function sincronizarJira(): Promise<ResultadoSincronizacao> {
  if (!jiraConfigurado()) throw new Error('Integração com o Jira não configurada (JIRA_* no .env).');

  const [novidades] = await db
    .select({ id: modulo.id })
    .from(modulo)
    .where(eq(modulo.slug, MODULO_NOVIDADES));
  if (!novidades) throw new Error(`Módulo "${MODULO_NOVIDADES}" não existe.`);

  const tickets = await buscarTickets();
  const resultado: ResultadoSincronizacao = {
    lidos: tickets.length,
    criados: 0,
    atualizados: 0,
    inalterados: 0,
    ignorados: 0,
  };

  for (const t of tickets) {
    const blocos: Bloco[] = (t.paragrafos.length ? t.paragrafos : ['(Escreva aqui o texto para o cliente.)']).map(
      (texto) => ({ tipo: 'texto', texto }),
    );
    const versao = { titulo: t.titulo, tag: t.rotulo, blocos };

    const [existente] = await db
      .select({
        id: topico.id,
        publicadoEm: topico.publicadoEm,
        titulo: topico.titulo,
        tag: topico.tag,
        blocos: topico.blocos,
      })
      .from(topico)
      .where(eq(topico.jiraChave, t.chave));

    if (!existente) {
      const [criado] = await db
        .insert(topico)
        .values({
          moduloId: novidades.id,
          slug: slugDoTicket(t.chave, t.titulo),
          titulo: t.titulo,
          tag: t.rotulo,
          blocos,
          textoBusca: montarTextoBusca(t.titulo, blocos),
          jiraChave: t.chave,
          // Rascunho: publicadoEm fica nulo até alguém revisar e publicar.
        })
        .returning({ id: topico.id });
      await db.insert(alteracao).values({ topicoId: criado.id, usuarioId: null, acao: 'criou', detalhe: versao });
      resultado.criados++;
      continue;
    }

    // Já publicado ou excluído: a equipe assumiu o texto, a integração não mexe.
    if (existente.publicadoEm) {
      resultado.ignorados++;
      continue;
    }

    // Nada mudou no ticket: não grava (senão o histórico encheria a cada sincronização).
    const igual =
      existente.titulo === t.titulo &&
      existente.tag === t.rotulo &&
      JSON.stringify(existente.blocos) === JSON.stringify(blocos);
    if (igual) {
      resultado.inalterados++;
      continue;
    }

    const [atualizado] = await db
      .update(topico)
      .set({
        titulo: t.titulo,
        tag: t.rotulo,
        blocos,
        textoBusca: montarTextoBusca(t.titulo, blocos),
        atualizadoEm: new Date(),
      })
      .where(and(eq(topico.id, existente.id), isNull(topico.publicadoEm), isNull(topico.excluidoEm)))
      .returning({ id: topico.id });
    if (atualizado) {
      await db.insert(alteracao).values({ topicoId: existente.id, usuarioId: null, acao: 'editou', detalhe: versao });
      resultado.atualizados++;
    } else {
      resultado.ignorados++;
    }
  }

  return resultado;
}

/**
 * Agenda a sincronização dentro da própria API. Chamada em src/server.ts
 * (linha comentada até a integração ser ligada).
 */
export function iniciarSincronizacaoJira(log: { info: (o: object, m: string) => void; error: (o: unknown, m: string) => void }) {
  if (!jiraConfigurado()) {
    log.info({}, 'integração com o Jira não configurada: sincronização não iniciada');
    return;
  }
  const rodar = () =>
    sincronizarJira()
      .then((r) => log.info(r, 'sincronização com o Jira concluída'))
      .catch((erro) => log.error(erro, 'falha na sincronização com o Jira'));

  void rodar();
  setInterval(rodar, env.JIRA_INTERVALO_MIN * 60 * 1000).unref();
}
