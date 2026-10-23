# API da central de ajuda

API de conteúdo do Help Me, do desenho em
[`../docs/arquitetura.md`](../docs/arquitetura.md). Tem a leitura pública (fase 1)
e, na fase 2, o login e as rotas do painel de edição.

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
porta, ajuste ali. Troque também o `CODIGO_CADASTRO` por um código seu: ele é
pedido na tela "Criar conta" do painel e, sem ele, o cadastro fica desligado.

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
| `npm run db:migrate` | Aplica as migrações pendentes (rode depois de cada `git pull`) |
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

### Login e cadastro

| Rota | Faz |
| --- | --- |
| `POST /api/auth/cadastro` | Cria a conta (nome, e-mail, senha e código de cadastro) e já abre a sessão |
| `POST /api/auth/login` | E-mail e senha; abre a sessão num cookie |
| `POST /api/auth/logout` | Encerra a sessão |
| `GET /api/auth/eu` | Quem está logado (401 se ninguém) |

Cadastro e login aceitam 10 tentativas por minuto por IP; passou disso, **429**.

### Painel (exige login)

Não há perfis: quem tem conta cria, edita, publica e exclui, e não existe etapa
de aprovação. Sem login, todas respondem **401**.

| Rota | Faz |
| --- | --- |
| `GET /api/admin/modulos` | Todos os módulos, com a contagem de tópicos |
| `POST /api/admin/modulos` | Cria um módulo; o slug sai do título |
| `PUT /api/admin/modulos/:id` | Edita título, descrição, subtítulo, ícone e se aparece na Home (o slug não muda) |
| `PUT /api/admin/modulos-ordem` | Nova ordem: `{ ids: [...] }` com todos os módulos |
| `GET /api/admin/topicos` | Lista, inclusive rascunhos, com quem alterou por último |
| `GET /api/admin/topicos/:id` | Abre um tópico para edição |
| `POST /api/admin/topicos` | Cria; nasce como rascunho e o endereço (slug) sai do título |
| `PUT /api/admin/topicos/:id` | Edita título, rótulo e blocos (o slug não muda) |
| `POST /api/admin/topicos/:id/publicar` | Publica; mantém a data se já estava publicado |
| `POST /api/admin/topicos/:id/despublicar` | Volta para rascunho |
| `DELETE /api/admin/topicos/:id` | Exclusão reversível (`excluido_em`) |
| `GET /api/admin/topicos/:id/historico` | Linha do tempo: ação, quem, quando e se dá para restaurar |
| `POST /api/admin/topicos/:id/restaurar/:alteracaoId` | Volta o conteúdo para aquela versão |
| `GET /api/admin/metricas?dias=30` | Buscas sem resultado, avaliações e mais acessados |
| `GET /api/admin/imagens/sem-uso` | Imagens que nenhum tópico usa |
| `DELETE /api/admin/imagens/:id` | Apaga uma imagem sem uso |
| `POST /api/admin/imagens/limpar` | Apaga todas as imagens sem uso |
| `POST /api/admin/imagens` | Envia uma imagem (multipart, campo `arquivo`); devolve `id` e `url` |

Cada ação grava uma linha em `alteracao` (quem, o quê, quando). Criar, editar
e restaurar guardam também uma cópia de título, rótulo e blocos, que é o que
permite restaurar. Linhas de antes da fase 4 só têm o título e não são
restauráveis. Ao restaurar, blocos com imagem que já foi apagada ficam de fora,
e a resposta diz quantos (`imagensPerdidas`).

**Módulos.** Os slugs `admin`, `api`, `uploads`, `assets` e `exemplos` são
reservados (`src/lib/modulos.ts`), porque já são caminhos do site ou do IIS. O
ícone precisa ser um de `database`, `dollar`, `book`, `star` e `chart`. Não há
exclusão de módulo, só ocultar da Home (`visivel`).

### Métricas (públicas)

| Rota | Faz |
| --- | --- |
| `POST /api/metricas/acesso` | `{ modulo, topico }`: soma uma abertura no dia |
| `POST /api/metricas/avaliacao` | `{ modulo, topico, ajudou }`: soma um voto |
| `POST /api/metricas/busca-vazia` | `{ termo }`: soma uma busca sem resultado (3 a 80 letras) |
| `GET /api/mais-acessados?limite=4` | Os mais abertos nos últimos 30 dias, para a Home |

Abertas, porque o visitante não faz login, mas com limite de 60 por minuto por
IP. Só aceitam tópicos publicados. Guardam contagens por dia
(`acesso_dia`, `avaliacao_dia`, `busca_vazia_dia`), sem IP nem identificação.
O "dia" segue o fuso de America/Bahia.

### Envio de imagens

`POST /api/admin/imagens` recebe um arquivo e devolve `{ imagem: { id, url,
largura, altura, bytes } }`. O `id` é o que o bloco de imagem do tópico guarda;
a `url` serve para mostrar a imagem na hora.

- **Aceita PNG, JPEG e WebP, até 5 MB.** O tipo é conferido pelo conteúdo, não
  pela extensão: GIF, SVG, arquivo renomeado e imagens com mais de 50 milhões de
  pixels são recusados (**400**); acima de 5 MB, **413**.
- **Reduz para no máximo 1600 px de largura e converte para WebP**, com
  qualidade 82. A orientação do celular é corrigida e os metadados (como a
  localização da foto) são descartados.
- **O nome do arquivo é um id novo** (`<uuid>.webp`), então o navegador pode
  guardar em cache e não há como sobrescrever uma imagem existente.
- **Onde fica:** na pasta `UPLOADS_DIR` do `.env` (padrão: `api/uploads`). Em
  produção use um caminho absoluto fora do código, como `D:\helpme\uploads`, que
  o IIS serve em `/uploads` e que **precisa de backup junto com o banco**. Se
  trocar a pasta, copie para ela o `tela-exemplo.svg` usado pelo conteúdo de
  exemplo.
- **Limpeza pelo painel, não automática:** imagem enviada e não usada, ou
  removida de um tópico, fica no disco até alguém apagar em Painel > Imagens.
  Contam como "em uso" as imagens de tópicos excluídos (a exclusão é
  reversível); as enviadas há menos de 1 hora não aparecem, porque podem estar
  num editor ainda não salvo. Apagar uma imagem tira ela das versões antigas do
  histórico.

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
- **Senha com scrypt**, que já vem no Node (nada para compilar no Windows). O
  banco guarda só o hash, com os parâmetros dentro dele.
- **Sessão em cookie `HttpOnly`**, e o banco guarda apenas o SHA-256 do token.
  `COOKIE_SECURE=true` quando houver HTTPS; `TRUST_PROXY=true` atrás do IIS.
- **Cadastro com código.** A tela de criar conta é aberta, mas só quem sabe o
  `CODIGO_CADASTRO` consegue criar conta. Sem isso, qualquer pessoa da internet
  poderia publicar na central dos clientes. Trocar o código no `.env` e
  reiniciar a API desliga os convites antigos.
- **Exclusão é reversível** (`excluido_em`), e rascunho é `publicado_em`
  nulo. As duas regras já estão valendo nas rotas de leitura.

## Estrutura

```
api/
├── drizzle/              # Migrações geradas (versionadas)
├── uploads/              # Imagens em desenvolvimento
└── src/
    ├── server.ts         # Sobe o Fastify, CORS, upload, arquivos estáticos e tratamento de erro
    ├── env.ts            # Lê e valida a configuração do ambiente
    ├── db/
    │   ├── schema.ts     # Tabelas e o formato dos blocos
    │   ├── index.ts      # Conexão
    │   ├── seed.ts       # Carga do conteúdo inicial
    │   └── conteudo-inicial.json
    ├── rotas/
    │   ├── publico.ts        # Leitura aberta ao público
    │   ├── auth.ts           # Cadastro, login, logout
    │   ├── metricas.ts       # Registro público de acessos, votos e buscas
    │   ├── admin.ts          # Reúne as rotas do painel e exige login
    │   ├── admin-topicos.ts  # Tópicos, histórico e restauração
    │   ├── admin-modulos.ts  # Criar, editar e ordenar módulos
    │   ├── admin-metricas.ts # Resumo das métricas
    │   └── admin-imagens.ts  # Envio e limpeza de imagens
    └── lib/
        ├── texto.ts      # Normalização usada pela busca
        ├── senha.ts      # Hash de senha (scrypt)
        ├── sessao.ts     # Sessão em cookie e exigência de login
        ├── uploads.ts    # Validar, reduzir e gravar imagens
        ├── modulos.ts    # Ícones aceitos e slugs reservados
        └── metricas.ts   # Data do dia para as contagens
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
- Sem troca de módulo de um tópico, redefinição de senha nem gestão de contas.
