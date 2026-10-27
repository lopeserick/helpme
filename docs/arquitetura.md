# Arquitetura — central de ajuda com API e painel

Documento de desenho, escrito antes da implementação. Descreve o que o
projeto vira quando o conteúdo sair do código e passar a ser alimentado por
uma equipe interna.

## Contexto e decisões já tomadas

| Assunto | Decisão |
| --- | --- |
| Público | Clientes do ERP Acesse, como um FAQ |
| Divulgação | Link no site da empresa, pelo suporte e por um botão dentro do ERP |
| Aparecer no Google | Não é requisito. Por isso o site segue como aplicação React (Vite) |
| Conteúdo | Alimentado manualmente pela equipe interna |
| Acesso | Leitura pública; escrita só autenticada, com conta por pessoa |
| Banco | PostgreSQL, que a empresa já usa |
| Hospedagem | VM da empresa, Windows Server 2019 |
| Relação com o ERP | Nenhuma. O site não acessa o banco nem os serviços do Acesse |

Duas consequências que valem registro:

- **Sem buscador externo, a busca interna é o principal meio de achar
  conteúdo.** Ela deve procurar também no texto dos tópicos, não só nos
  títulos.
- **Se um dia quiserem que o cliente chegue pelo Google**, será preciso gerar
  as páginas no servidor (Next.js ou Astro). Os componentes e o CSS se
  aproveitam, mas é uma reforma, não um ajuste.

## Visão geral

```
                  Cliente (navegador)
                          │ HTTPS
                  ┌───────┴────────┐
                  │      IIS       │  proxy reverso na VM
                  └───────┬────────┘
         ┌────────────────┼─────────────────┐
         │                │                 │
   /  → dist/        /api → Node        /uploads → pasta
   (site React)      (Fastify, :3000)   (imagens no disco)
                          │
                   ┌──────┴──────┐
                   │ PostgreSQL  │
                   └─────────────┘
```

Tudo na mesma máquina. Nesse volume, separar servidores só traria custo.

## Modelo de dados

Esboço em PostgreSQL. Os nomes seguem o português usado no projeto.

```sql
create table usuario (
  id            serial primary key,
  nome          text not null,
  email         text not null unique,
  senha_hash    text not null,          -- argon2 ou bcrypt, nunca a senha
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now()
);

create table modulo (
  id            serial primary key,
  slug          text not null unique,   -- 'estoque'
  titulo        text not null,          -- 'Gestão de Estoque'
  descricao     text not null,
  icone         text not null,          -- 'database' (nome, resolvido no front)
  ordem         int  not null default 0,
  visivel       boolean not null default true,  -- aparece na Home
  criado_em     timestamptz not null default now()
);

create table imagem (
  id            uuid primary key,
  arquivo       text not null,          -- nome no disco
  mime          text not null,
  bytes         int  not null,
  largura       int,
  altura        int,
  enviada_por   int references usuario(id),
  criada_em     timestamptz not null default now()
);

create table topico (
  id             serial primary key,
  modulo_id      int not null references modulo(id),
  slug           text not null,         -- 'cadastrar-produto'
  titulo         text not null,
  tag            text,                  -- 'Validação fiscal' (opcional)
  blocos         jsonb not null default '[]',
  ordem          int not null default 0,
  publicado_em   timestamptz,           -- null = rascunho
  excluido_em    timestamptz,           -- null = ativo (exclusão reversível)
  criado_por     int references usuario(id),
  atualizado_por int references usuario(id),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  unique (modulo_id, slug)
);

create table alteracao (
  id          bigserial primary key,
  topico_id   int references topico(id),
  usuario_id  int references usuario(id),
  acao        text not null,   -- criou | editou | publicou | despublicou | excluiu
  em          timestamptz not null default now(),
  detalhe     jsonb
);
```

### Por que assim

- **`blocos` como `jsonb`, e não tabela separada.** Nunca vamos consultar um
  bloco isoladamente; eles só existem dentro do tópico. Tabela separada
  complicaria salvar e reordenar sem trazer benefício.
- **`publicado_em` nulo significa rascunho.** Um campo resolve situação e data de
  publicação, e é o que ordena a página de novidades.
- **`excluido_em`** torna a exclusão reversível. Numa ferramenta de conteúdo,
  apagar sem querer é questão de tempo.
- **`modulo.visivel`** controla a lista de categorias da Home. As novidades
  ficam com `visivel = false`: existem, mas não aparecem como categoria. Os
  relatórios apareciam assim e passaram a `visivel = true`.
- **Imagem em disco, nunca no banco.** O banco guarda só a referência.

### Formato dos blocos

É o mesmo que o site já usa hoje, o que torna a migração barata:

```json
[
  { "tipo": "texto",  "texto": "Acesse o menu Estoque e escolha Produtos." },
  { "tipo": "imagem", "imagem_id": "uuid", "alt": "Tela de cadastro", "legenda": "Opcional" }
]
```

A API valida esse formato na entrada (com zod ou equivalente). `alt` é
obrigatório em bloco de imagem.

## API

Dois grupos bem separados: o que é público e o que exige autenticação.

### Público, só leitura

| Rota | Devolve |
| --- | --- |
| `GET /api/modulos` | Módulos visíveis, para a lista da Home |
| `GET /api/modulos/:slug` | Um módulo e seus tópicos publicados, com os blocos |
| `GET /api/novidades?limite=5` | Tópicos publicados do módulo de novidades, do mais recente para o mais antigo (alimenta o alerta da Home) |
| `GET /api/busca?q=termo` | Tópicos que casam com o termo, no título e no texto dos blocos |

Regras:

- Nunca devolvem rascunho nem excluído.
- Respostas podem ter cache curto (60 segundos) para aguentar pico de acesso.
- Limite de requisições por IP, por ser superfície pública.

### Autenticado

| Rota | Faz |
| --- | --- |
| `POST /api/auth/login` | Recebe e-mail e senha, devolve o token de sessão |
| `GET /api/admin/topicos` | Lista com filtro por módulo e situação, inclusive rascunhos |
| `GET /api/admin/topicos/:id` | Abre um tópico para edição |
| `POST /api/admin/topicos` | Cria (nasce como rascunho) |
| `PUT /api/admin/topicos/:id` | Edita |
| `POST /api/admin/topicos/:id/publicar` | Publica |
| `POST /api/admin/topicos/:id/despublicar` | Volta para rascunho |
| `DELETE /api/admin/topicos/:id` | Marca como excluído |
| `POST /api/admin/imagens` | Envia uma imagem, devolve id e URL |
| `GET /api/admin/alteracoes?topico=:id` | Histórico de quem mexeu no quê |

Gestão de módulos e de usuários entra depois; no começo, direto no banco.

### Autenticação

- Conta por pessoa. **Decisão posterior ao desenho:** há tela de criar conta,
  mas ela exige um código de cadastro (`CODIGO_CADASTRO`, no `.env` da API);
  sem o código definido o cadastro fica desligado. Não há perfis nem etapa de
  aprovação: quem tem conta cria, edita e publica.
- Senha guardada com hash (argon2 ou bcrypt). Nunca em texto.
- Login abre uma sessão de 12 horas (configurável) num cookie `HttpOnly`; o
  banco guarda só o hash do token. Senha com scrypt.
- O painel fica em endereço próprio e, como a equipe o usa de fora da empresa,
  é protegido por verificação em duas etapas em vez de restrição por rede
  (veja `seguranca.md`).

### Envio de imagem

- Tipos aceitos: PNG, JPEG e WebP.
- Tamanho máximo por arquivo: 5 MB.
- Redimensionar no servidor para no máximo 1600px de largura e gerar WebP.
  Sem isso, um print de 8 MB trava a página no 4G do cliente.
- Guardar fora da pasta do código, por exemplo `D:\helpme\uploads`, servida
  pelo IIS em `/uploads`.

## Painel

Quatro telas, nessa ordem de importância:

1. **Login.** E-mail, senha e mensagem de erro clara.
2. **Lista de tópicos.** Filtro por módulo e por situação, busca por título,
   e o botão "Novo passo a passo". Mostra quem alterou por último e quando.
3. **Editor.** Módulo, título, rótulo opcional e a lista de blocos. Cada
   bloco tem "subir", "descer" e "remover"; abaixo, "adicionar texto" e
   "adicionar imagem". Rodapé com "Salvar rascunho", "Pré-visualizar" e
   "Publicar".
4. **Histórico do tópico.** Quem fez o quê e quando.

Recomendação: **comece o editor simples de propósito.** Sem editor rico, sem
arrastar e soltar. É a parte que mais consome tempo e a que mais muda depois
que alguém usa de verdade.

## O que muda no site atual

A estrutura de pastas se mantém. O padrão
`components/<Nome>/index.tsx + styles.module.css` continua valendo.

| Hoje | Depois |
| --- | --- |
| `src/data/helpCenter.ts` com os dados | `src/api/helpCenter.ts` só com os tipos e a conversão da resposta (feito) |
| — | `src/api/` com `client.ts` e o hook `useApi` (feito) |
| Páginas leem direto do arquivo | Páginas com três estados: carregando, erro e conteúdo (feito) |
| — | `src/pages/Admin/` com as telas do painel |
| Componentes | Sem alteração |

Os componentes não mudam porque sempre recebem os dados por propriedade, em
vez de buscá-los sozinhos. Foi feito assim de propósito.

O endereço da API fica em variável de ambiente (`VITE_API_URL`), para
apontar para o servidor local durante o desenvolvimento.

## Publicação na VM (Windows Server 2019)

- **IIS como proxy reverso**, com os módulos URL Rewrite e ARR:
  - `/` serve os arquivos estáticos do `dist/`
  - `/api` encaminha para `http://localhost:3000`
  - `/uploads` serve a pasta de imagens
  - Qualquer rota não encontrada devolve o `index.html` (necessário porque o
    site usa `BrowserRouter`; sem isso, `/estoque` dá 404 ao recarregar)
- **API como serviço do Windows**, com NSSM ou `node-windows`, para subir
  junto com a máquina e reiniciar sozinha se cair.
- **HTTPS** com certificado da empresa ou Let's Encrypt via win-acme.
- **Backup de duas coisas**, não só uma: o banco (`pg_dump` agendado) e a
  pasta de imagens. Como as imagens estão em disco, elas não entram no
  backup do PostgreSQL.

## Fases

Cada fase é demonstrável sozinha.

1. **API de leitura e o site consumindo ela.** Sem painel. É o marco que
   importa: o conteúdo deixou de morar no código.
2. **Login, criar, editar e publicar, com texto.** Já fecha o ciclo completo
   de uma demonstração.
3. **Imagens**, com envio, redimensionamento e o bloco de imagem no editor
   (feito).
4. **Histórico, gestão de módulos e métricas** (o que foi buscado e não
   encontrado, e o "esta resposta te ajudou?"), mais a limpeza de imagens
   (feito).

As fases 2 e 3 podem virar uma só, se preferir mostrar o fluxo completo de
uma vez.

## Onde paramos

Atualizado em 26/10/2026. Ponto de partida para quem retomar o projeto.

**Contexto.** O ERP Acesse é feito em Delphi, então a equipe não tem prática
com desenvolvimento web — por isso a escolha de Node não briga com a casa,
mas a manutenção do projeto fica concentrada em quem o construir. O destino é
a VM Windows Server da empresa, com PostgreSQL. Sem perfis e sem aprovação:
quem tem conta no painel publica.

### Branches

| Branch | O que tem | Situação |
| --- | --- | --- |
| `main` | Fases 1 a 4: API, site lendo da API e painel (passo a passo, módulos, métricas, imagens, histórico) | Mesclada pelo PR #1 |
| `security-level` | `main` + painel em endereço próprio, bloqueio por conta, inatividade, origem, cabeçalhos, registro de acessos, 2FA, `npm run usuario` | Enviada, sem PR |
| `security-news` | `security-level` + **sugestões por e-mail**, 2FA opcional (oculta sem `CHAVE_2FA`) e **base do Jira desligada** | **Branch atual de trabalho.** Testada no Windows pelo Erick; sem PR |
| `feat/api-fase-1` | Mesmo conteúdo já mesclado na `main` | Pode ser apagada |
| `chore/estabilizacao-fase-1`, `docs/arquitetura-api` | Versão sem API e documento antigo | Erick ia apagar pelo GitHub |

Fora deste repositório: `lopeserick/helpme-central-de-ajuda` (público), versão
só visual com servidor de demonstração no navegador, para portfólio/LinkedIn,
com "ERP Exemplo" no lugar de Acesse.

### Como rodar (branch `security-news`)

Três terminais: `npm run dev` em `api/` (API, :3000), `npm run dev` na raiz
(site público, :5173) e `npm run dev:painel` na raiz (painel, :5174). Depois de
trocar de branch: `npm ci` na raiz e em `api/`, e `npm run db:migrate` em
`api/`. O `.env` da API segue o `api/.env.example` (o `.env` não vai para o
Git); para as sugestões, `SMTP_SENHA` é uma senha de app do Gmail.

### Decisões tomadas

- Painel em **endereço próprio** (ex.: `painel.suaempresa.com.br`); o site
  público não alcança `/api/admin` nem `/api/auth`.
- **Sem restrição por IP**: a equipe usa o painel de fora da empresa.
- **Login só com e-mail e senha**: a 2FA existe, mas fica oculta sem
  `CHAVE_2FA`.
- Sessão: 12 h no máximo, cai com 30 min parada.
- Sugestões: nome, e-mail, empresa, título e texto obrigatórios, até 3
  imagens; e-mail para `sugestaobrasilsoftware@gmail.com`, assunto
  `Título — Nome (Empresa)`, "Responder para" do cliente
  ([`sugestoes.md`](./sugestoes.md)).
- Jira: tickets viram **rascunhos** em "O que há de novo", nunca publicação
  direta ([`jira.md`](./jira.md)).

### Próximos passos

1. **Ligar o Jira**: Erick vai trazer endereço do Jira, conta de leitura e
   token, a JQL, o campo de texto para o cliente e o mapa de labels. Depois:
   `npm run jira:sincronizar`, conferir os rascunhos e descomentar a ativação
   em `api/src/server.ts`. Passo a passo em [`jira.md`](./jira.md).
2. Abrir o PR da `security-news` para a `main`.
3. Publicar na VM: DNS dos dois endereços, HTTPS, API como serviço (NSSM),
   dois sites no IIS com os modelos de [`iis/`](./iis), `.env` de produção
   ([`seguranca.md`](./seguranca.md)) e backup do banco e da pasta de imagens.

**Ambiente de desenvolvimento conferido** (Windows): PostgreSQL 18 instalado
pelo winget, banco `helpme` criado, API respondendo em `localhost:3000`. Em
desenvolvimento a conexão usa o superusuário `postgres`; em produção isso
precisa virar um usuário próprio da aplicação.

## Pontos em aberto

- Confirmar que a VM é mesmo Windows Server 2019.
- Nomes dos dois endereços (site e painel) e quem cuida do DNS e do HTTPS.
- Definir quem guarda e distribui o código de cadastro.
- Confirmar se o PostgreSQL existente pode receber um banco novo ou se será
  preciso subir uma instância.
- Jira: se é Cloud (`*.atlassian.net`) ou Data Center, e o critério dos
  tickets que viram novidade.
