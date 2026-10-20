# API da central de ajuda

API de conteúdo do Help Me. Esta é a **fase 1** do desenho em
[`../docs/arquitetura.md`](../docs/arquitetura.md): só leitura, sem painel e
sem login — isso vem na fase 2.

## Tecnologias

- Node 22 e TypeScript
- Fastify 5
- Drizzle ORM com PostgreSQL 18
- zod para validar o que entra

## Como rodar

### 1. Instalar o PostgreSQL 18

No Windows, pelo PowerShell:

```powershell
winget install -e --id PostgreSQL.PostgreSQL.18
```

Se o identificador não existir na sua máquina, rode `winget search postgresql`
e use o que aparecer para a versão 18. O instalador da EnterpriseDB também
serve: <https://www.postgresql.org/download/windows/>.

Durante a instalação, o PostgreSQL pede uma senha para o usuário `postgres`.
Guarde essa senha, ela é usada no passo seguinte.

> A versão de desenvolvimento deve ser a mesma que roda no servidor da
> empresa. Confirme isso e ajuste se for diferente.

Se o comando `psql` não for reconhecido depois da instalação, acrescente
`C:\Program Files\PostgreSQL\18\bin` à variável de ambiente PATH, ou use o
atalho "SQL Shell (psql)" que o instalador cria no menu Iniciar.

### 2. Criar o banco e o usuário da aplicação

```powershell
psql -U postgres -c "CREATE USER helpme WITH PASSWORD 'helpme';"
psql -U postgres -c "CREATE DATABASE helpme OWNER helpme;"
```

A aplicação se conecta com um usuário próprio, e não com o `postgres`. Mesmo
em desenvolvimento, vale manter esse hábito: em produção, a API não deve
rodar com um superusuário do banco.

### 3. Configurar e instalar

```powershell
cd api
copy .env.example .env
npm ci
```

Use `npm ci`, e não `npm install`. O `ci` instala exatamente o que está no
`package-lock.json` e não reescreve esse arquivo; o `install` reescreve, e aí
o próximo `git pull` falha dizendo que suas alterações locais seriam
sobrescritas. Só use `npm install` quando a intenção for mesmo acrescentar ou
atualizar uma dependência.

Abra o `.env` e confira a `DATABASE_URL`. Se você usou outra senha ou outra
porta, ajuste ali.

### 4. Criar as tabelas e carregar o conteúdo

```powershell
npm run db:migrate   # cria as tabelas
npm run seed         # carrega os módulos e tópicos iniciais
```

O `seed` pode ser rodado quantas vezes quiser: ele insere ou atualiza pelo
slug e não apaga nada que já esteja no banco.

### 5. Subir a API

```powershell
npm run dev
```

Confira em <http://localhost:3000/api/saude>, que deve responder
`{"ok":true,"banco":"ok"}`. Para uma conferência completa, com a API no ar,
rode `npm run teste:api` em outro terminal.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe a API recarregando a cada alteração |
| `npm start` | Sobe a API uma vez |
| `npm run check` | Confere os tipos |
| `npm run teste:api` | Testa a API no ar: saúde, rotas, erros, CORS e imagens (`API_URL` muda o endereço) |
| `npm run db:generate` | Gera a migração depois de mudar `src/db/schema.ts` |
| `npm run db:migrate` | Aplica as migrações pendentes |
| `npm run seed` | Carrega o conteúdo inicial |

## Rotas

Todas públicas nesta fase. Nenhuma devolve rascunho nem tópico excluído.

| Rota | Devolve |
| --- | --- |
| `GET /api/saude` | `{ ok: true, banco: 'ok' }`; **503** se o banco não responder |
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

## Problemas comuns

**`psql` não é reconhecido como comando.** A pasta `bin` do PostgreSQL não
está no PATH. Veja o passo 1.

**`password authentication failed for user "helpme"`.** A senha no `.env` não
bate com a que você definiu no passo 2.

**`ECONNREFUSED` ao rodar a migração.** O serviço do PostgreSQL não está no
ar. No PowerShell: `Get-Service postgresql*` mostra a situação, e
`Start-Service postgresql-x64-18` o inicia.

**`database "helpme" does not exist`.** Faltou o passo 2.

**`git pull` diz que `api/package-lock.json` seria sobrescrito.** Algum
`npm install` reescreveu o arquivo. Como ele é gerado, dá para descartar a
versão local sem perder nada:

```powershell
git restore api/package-lock.json
git pull
```

## Pendências

- O `drizzle-kit` traz um aviso de segurança de nível moderado no `esbuild`,
  que afeta apenas o servidor de desenvolvimento. Em produção:
  `npm audit --omit=dev` aponta zero.
- Autenticação, escrita e envio de imagem entram na fase 2.
