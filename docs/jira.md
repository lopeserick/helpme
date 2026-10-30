# Integração com o Jira (ainda desligada)

Objetivo: tickets do Jira viram avisos em **O que há de novo**, sem ninguém
copiar e colar. A estrutura já está no código, desligada, esperando os dados
abaixo.

## Como vai funcionar

1. A cada `JIRA_INTERVALO_MIN` (padrão 30 minutos), a API busca no Jira Cloud
   os tickets da consulta `JIRA_JQL`.
2. Cada ticket vira um **rascunho** no módulo "O que há de novo". A integração
   **nunca publica sozinha**: ticket é escrito para a equipe e pode ter
   detalhe interno ou nome de cliente.
3. Alguém da equipe abre o rascunho no painel, revisa o texto e clica em
   **Publicar**.
4. Se o ticket mudar enquanto o aviso ainda é rascunho, o rascunho acompanha.
   Depois de publicado, a integração não mexe mais nele.

| No Jira | No aviso |
| --- | --- |
| Resumo (summary) | Título |
| Campo `JIRA_CAMPO_TEXTO` (ou a descrição, se vazio) | Texto, em parágrafos |
| Label mapeada em `JIRA_ROTULOS` | Rótulo ("Rotina nova", "Validação fiscal"...) |
| Chave (ex.: ACS-482) | Guardada no tópico; evita duplicar e entra no endereço |

A integração só **lê** o Jira.

## O que já foi criado

| Onde | O quê |
| --- | --- |
| `api/src/integracoes/jira.ts` | Busca os tickets, converte o texto do Jira (formato ADF) e cria ou atualiza os rascunhos |
| `api/src/scripts/jira-sincronizar.ts` | Comando `npm run jira:sincronizar`: roda uma vez, para testar |
| `api/src/server.ts` | Duas linhas **comentadas** que ligam a sincronização automática |
| Coluna `topico.jira_chave` | Chave do ticket de origem (migração `0005`) |
| `api/src/env.ts` e `api/.env.example` | Variáveis `JIRA_*`, comentadas no `.env.example` |

Testado contra um Jira simulado: cria os rascunhos, não duplica, não grava
quando nada mudou, não mexe no que já foi publicado e mostra o erro quando o
token está errado. **Ainda não foi testado contra o Jira de verdade.**

## O que precisamos preencher depois

| Variável | O que é | Onde conseguir |
| --- | --- | --- |
| `JIRA_URL` | Endereço do Jira Cloud, ex.: `https://suaempresa.atlassian.net` | A barra do navegador quando abre o Jira |
| `JIRA_EMAIL` | E-mail da conta usada pela integração | De preferência uma conta só para isso, com acesso **só de leitura** ao projeto |
| `JIRA_TOKEN` | Token de API dessa conta | `id.atlassian.com` > Segurança > Criar e gerenciar tokens de API |
| `JIRA_JQL` | Quais tickets viram novidade | Montar no filtro do Jira e copiar. Ex.: `project = ACS AND labels = novidade-site AND statusCategory = Done` |
| `JIRA_CAMPO_TEXTO` | Campo com o texto para o cliente (opcional) | Recomendado criar um campo "Texto para o cliente" no Jira; o id (ex.: `customfield_10050`) aparece em *Configurações > Campos personalizados* |
| `JIRA_ROTULOS` | Label do Jira = rótulo no site | Combinar com a equipe. Ex.: `rotina-nova=Rotina nova,validacao-fiscal=Validação fiscal` |
| `JIRA_INTERVALO_MIN` | De quantos em quantos minutos buscar | Padrão 30 |

Decisões a combinar com a equipe:

- Qual label (ou outro critério) marca um ticket como "vira novidade".
- Quem escreve o texto para o cliente: no próprio ticket (campo próprio) ou
  só na revisão do rascunho.
- Se a conta da integração será uma conta de serviço da empresa.

## Para ligar

1. Preencha as variáveis `JIRA_*` no `.env` da API.
2. Teste: `npm run jira:sincronizar` na pasta `api`. Ele mostra quantos
   tickets leu e quantos rascunhos criou. Confira os rascunhos no painel.
3. Em `api/src/server.ts`, descomente as duas linhas marcadas com
   `iniciarSincronizacaoJira` (o `import` e a chamada no fim).
4. Reinicie a API.

> A busca usa `POST /rest/api/3/search/jql` do Jira Cloud. A Atlassian muda
> essa rota de tempos em tempos: se o teste do passo 2 falhar com 404 ou 410,
> confira a rota atual na documentação deles.
>
> Se a empresa usa Jira instalado no próprio servidor (Data Center), e não o
> Cloud, a autenticação e a rota mudam: avise antes de ligar.
