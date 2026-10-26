/**
 * Roda a sincronização com o Jira uma vez, pelo terminal, para testar a
 * configuração antes de ligar a sincronização automática:
 *
 *   npm run jira:sincronizar
 */
import { conexao } from '../db/index.js';
import { jiraConfigurado, sincronizarJira } from '../integracoes/jira.js';

if (!jiraConfigurado()) {
  console.log('A integração com o Jira ainda não está configurada.');
  console.log('Preencha JIRA_URL, JIRA_EMAIL, JIRA_TOKEN e JIRA_JQL no .env (veja docs/jira.md).');
  await conexao.end();
  process.exit(0);
}

try {
  const r = await sincronizarJira();
  console.log(`Tickets lidos: ${r.lidos}`);
  console.log(
    `Rascunhos criados: ${r.criados} · atualizados: ${r.atualizados} · sem mudança: ${r.inalterados} · ignorados (já publicados): ${r.ignorados}`,
  );
  console.log('Os rascunhos aparecem no painel, módulo "O que há de novo", para revisar e publicar.');
} catch (erro) {
  console.error('Falha:', erro instanceof Error ? erro.message : erro);
  process.exitCode = 1;
} finally {
  await conexao.end();
}
