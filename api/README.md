# API da central de ajuda

API de conteúdo do Help Me. Esta é a **fase 1** do desenho em
[`../docs/arquitetura.md`](../docs/arquitetura.md): só leitura, sem painel e
sem login — isso vem na fase 2.

## Tecnologias

- Node 22 e TypeScript
- Fastify 5
- Drizzle ORM com PostgreSQL 16
- zod para validar o que entra

## Como rodar

### 1. Subir o banco

Na raiz do projeto (um nível acima desta pasta):

```bash
docker compose up -d
```

Isso sobe um PostgreSQL 16 na porta 5432, com usuário, senha e banco
`helpme`. Para conferir se está de pé: `docker compose ps`.

> A versão no `docker-compose.yml` deve ser a mesma que roda no servidor da
> empresa. Ajuste a tag quando essa informação estiver confirmada.

### 2. Configurar e instalar

```bash
cd api
cp .env.example .env
npm install
```

### 3. Criar as tabelas e carregar o conteúdo

```bash
npm run db:migrate   # cria as tabelas
npm run seed         # carrega os módulos e tópicos iniciais
```

O `seed` pode ser rodado quantas vezes quiser: ele insere ou atualiza pelo
slug e não apaga nada que já esteja no banco.

### 4. Subir a API

```bash
npm run dev
```

Confira em <http://localhost:3000/api/saude>, que deve responder
`{"ok":true}`.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe a API recarregando a cada alteração |
| `npm start` | Sobe a API uma vez |
| `npm run check` | Confere os tipos |
| `npm run db:generate` | Gera a migração depois de mudar `src/db/schema.ts` |
| `npm run db:migrate` | Aplica as migrações pendentes |
| `npm run seed` | Carrega o conteúdo inicial |

## Rotas

Todas públicas nesta fase. Nenhuma devolve rascunho nem tópico excluído.

| Rota | Devolve |
| --- | --- |
| `GET /api/saude` | `{ ok: true }`, para conferir se a API está no ar |
| `GET /api/modulos` | Módulos visíveis, para a lista de categorias da Home |
| `GET /api/modulos/:slug` | Um módulo e seus tópicos publicados, com os blocos |
| `GET /api/novidades?limite=5` | Avisos mais recentes, para o alerta da Home |
| `GET /api/busca?q=termo` | Busca por título, texto dos blocos e nome do módulo |
| `GET /uploads/<arquivo>` | Imagens (em produção quem serve é o IIS) |

Erro de formato na entrada devolve **400** com a lista de problemas; módulo
inexistente devolve **404**.

## Decisões que valem saber

- **Os blocos saem prontos para exibir.** Internamente, um bloco de imagem
  guarda o id na tabela `imagem`; na resposta ele já vem como
  `{ tipo: 'imagem', url, alt, legenda }`. O site não precisa saber que
  existe tabela de imagem.
- **Imagem fica em disco, nunca no banco.** O banco guarda só a referência.
  Isso significa que o backup precisa cobrir **duas** coisas: o PostgreSQL e
  a pasta de imagens.
- **A busca usa colunas já normalizadas** (`topico.texto_busca` e
  `modulo.titulo_busca`), gravadas sem acento e em minúsculas. É o que faz
  "relatorio" encontrar "Relatório" sem precisar da extensão `unaccent`.
  Quando a base crescer, o caminho é trocar por busca de texto completa do
  PostgreSQL (`tsvector` com dicionário português).
- **Exclusão é reversível** (`excluido_em`), e rascunho é `publicado_em`
  nulo. As duas regras já estão valendo nas rotas de leitura.

## Estrutura

```
api/
├── drizzle/              # Migrações geradas (versionadas)
├── uploads/              # Imagens em desenvolvimento
└── src/
    ├── server.ts         # Sobe o Fastify, CORS e tratamento de erro
    ├── env.ts            # Lê e valida a configuração do ambiente
    ├── db/
    │   ├── schema.ts     # Tabelas e o formato dos blocos
    │   ├── index.ts      # Conexão
    │   ├── seed.ts       # Carga do conteúdo inicial
    │   └── conteudo-inicial.json
    ├── rotas/
    │   └── publico.ts    # As rotas de leitura
    └── lib/
        └── texto.ts      # Normalização usada pela busca
```

## Pendências

- O `drizzle-kit` traz um aviso de segurança de nível moderado no `esbuild`,
  que afeta apenas o servidor de desenvolvimento. Em produção:
  `npm audit --omit=dev` aponta zero.
- Autenticação, escrita e envio de imagem entram na fase 2.
