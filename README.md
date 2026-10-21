# Help Me — central de ajuda

Central de ajuda para o ERP (estoque, financeiro, fiscal/Sintegra), feita para
mostrar a ideia à empresa. O site lê o conteúdo (categorias, tópicos, novidades
e busca) da API que fica em [`api/`](api/README.md); não há mais conteúdo dentro
do código do site.

## Tecnologias

- React 18 + TypeScript (modo estrito)
- Vite 5 (servidor de desenvolvimento e build)
- React Router 7 (rotas)
- CSS Modules + variáveis CSS (sem Tailwind)
- lucide-react (ícones) e Schibsted Grotesk (fonte, hospedada no projeto)
- ESLint 9 com typescript-eslint

Testado com Node 22.

## Como rodar

O site precisa da API no ar. Com o PostgreSQL e a API configurados (passo a
passo em [`api/README.md`](api/README.md)), abra dois terminais:

```bash
# Terminal 1: API em http://localhost:3000
cd api
npm run dev

# Terminal 2: site
npm ci
npm run dev
```

O Vite abre `http://localhost:5173` e repassa `/api` e `/uploads` para a API em
`localhost:3000` (veja `vite.config.ts`). Se a API estiver em outro endereço,
crie um arquivo `.env.local` com `VITE_API_URL=http://servidor:3000`.

Com a API fora do ar, a Home e as páginas mostram uma mensagem de erro com o
botão "Tentar de novo".

| Comando           | O que faz                                      |
| ----------------- | ---------------------------------------------- |
| `npm run dev`     | Servidor de desenvolvimento                    |
| `npm run build`   | Checa os tipos (`tsc`) e gera a pasta `dist/`  |
| `npm run preview` | Serve o build gerado, para conferir como fica  |
| `npm run lint`    | Roda o ESLint                                  |

## Estrutura

```
src/
├── App.tsx                  # Rotas
├── main.tsx                 # Entrada: fonte, tema e estilos globais
├── api/
│   ├── client.ts            # Chamada à API, erros com texto amigável
│   ├── helpCenter.ts        # Tipos da tela e conversão da resposta da API
│   └── useApi.ts            # Hook: carregando, erro e "tentar de novo"
├── components/
│   ├── AsyncContent/        # Estados de carregando, erro e vazio
│   ├── Header/              # Topo com título e campo de busca
│   ├── CategoryCard/        # Linha de categoria (a linha inteira é um link)
│   ├── CategoryIcon/        # Converte o nome do ícone em componente
│   ├── Index/               # Lista "Rotinas mais acessadas"
│   ├── ModuleTopics/        # Busca os tópicos de um módulo e os exibe
│   ├── NewsAlert/           # Alerta de novidades do ERP, na Home
│   ├── PageHeader/          # Faixa verde do topo (Home e páginas internas)
│   ├── PageShell/           # Estrutura das páginas internas (voltar + título)
│   ├── RoutineTopics/       # Tópicos de rotina recolhíveis (texto e imagem)
│   └── SearchRoutines/      # Busca com sugestões de rotinas
├── pages/                   # Uma pasta por rota
└── styles/
    ├── theme.css            # Todas as cores, raios e sombras (variáveis)
    └── global.css           # Reset, corpo, container e foco
```

## Rotas

| Rota                | Página             | Estado               |
| ------------------- | ------------------ | -------------------- |
| `/`                 | Home               | Pronta               |
| `/estoque`          | Gestão de Estoque  | Tópicos da API       |
| `/financeiro`       | Financeiro         | Tópicos da API       |
| `/sintegra`         | Sintegra           | Tópicos da API       |
| `/primeiros-passos` | Primeiros Passos   | Tópicos da API       |
| `/novidades`        | O que há de novo   | Acessível pelo alerta da Home |
| `/relatorios`       | Relatórios         | Tópicos da API (sem link na Home) |
| `/admin/login`      | Entrar no painel   | Pronta               |
| `/admin/cadastro`   | Criar conta        | Exige o código de cadastro |
| `/admin`            | Lista de passo a passo | Exige login      |
| `/admin/topicos/novo` e `/admin/topicos/:id` | Editor | Exige login |
| qualquer outra      | Página não encontrada | Pronta            |

## Painel de edição

Em `/admin` a equipe escreve, edita, publica e exclui os passo a passo, sem
mexer em código. Não há perfis nem aprovação: quem tem conta publica.

1. Defina o `CODIGO_CADASTRO` no `.env` da API (veja `api/README.md`) e rode
   `npm run db:migrate` na pasta `api` para criar a tabela de sessões.
2. Abra `http://localhost:5173/admin/cadastro`, informe nome, e-mail, senha e
   o código. A conta já entra logada.
3. Em "Novo passo a passo", escolha o módulo, escreva o título e os blocos de
   texto e salve como rascunho. **Publicar** coloca no site; **Tirar do site**
   volta para rascunho. Depois de publicado, salvar uma edição já vale no site.

O editor mantém, edita e remove as imagens que já existem nos tópicos, mas ainda
não envia imagens novas (fase 3). Telas em `src/pages/Admin/`, sessão em
`src/admin/`.

## Onde o conteúdo é cadastrado

O site público só exibe. Módulos, tópicos, imagens e avisos vêm do banco, pela
API. Os tópicos se cadastram pelo painel; módulos e imagens novas ainda entram
pelo `seed` (`api/src/db/conteudo-inicial.json`) ou direto no banco.

- **Categoria da Home:** é um módulo visível na API. O `icone` precisa ser um
  dos nomes de `components/CategoryIcon` (`database`, `dollar`, `book`,
  `star`); um nome desconhecido cai no ícone de livro.
- **Página de um módulo:** crie `src/pages/<Nome>/index.tsx` com `PageShell` e
  `<ModuleTopics slug="<slug-do-modulo>" />`, e registre a rota em
  `src/App.tsx`. O caminho da página precisa ser igual ao slug do módulo
  (`/estoque` ↔ `estoque`), porque a busca e o alerta montam os links assim.
- **Tópico:** lista de blocos de texto e imagem. O `alt` das imagens é
  obrigatório na API, porque descreve a imagem para leitor de tela.

## Avisos de novidades do ERP

Os avisos são os tópicos do módulo `novidades`, que não aparece na lista de
categorias. O mais recente vira o alerta da Home (`components/NewsAlert`), que
é o caminho até `/novidades`. A data exibida é a de publicação. Sem nenhum
aviso publicado, o alerta não aparece; se a API falhar, ele some sem atrapalhar
o resto da Home.

## Busca

A busca da Home consulta `GET /api/busca` a partir de duas letras digitadas,
esperando 250 ms depois da última tecla. Procura no nome da rotina, no texto
dos tópicos e no nome da página, ignorando acentos e maiúsculas. Ao escolher uma
sugestão, a pessoa vai para a página com o id do tópico no endereço
(`/estoque#inventario`); `RoutineTopics` lê esse id, abre o tópico e o destaca
por alguns segundos. Qualquer endereço nesse formato pode ser compartilhado e
abre direto no tópico certo.

## Tema

Toda cor, raio e sombra vem de `src/styles/theme.css`. Se uma variável não
existe nesse arquivo, ela não deve ser usada nos componentes.

## Pendências conhecidas

- O painel não tem histórico de alterações na tela, troca de módulo de um
  tópico, redefinição de senha nem gestão de contas (a API já grava o histórico
  em `alteracao`).
- "Rotinas mais acessadas" (Home) ainda é uma lista fixa no código: a API não
  registra acessos.
- Não há testes automatizados nem integração contínua.
- `npm audit` aponta 2 avisos que afetam apenas o servidor de desenvolvimento
  (Vite 5 / esbuild); corrigir exige subir o Vite de versão principal.
- `tsconfig.app.json` não é referenciado por `tsconfig.json` (o build usa o
  `tsconfig.json`).
- O nome do projeto aparece de três formas (Help Me, Help Center e "Suporte
  Rápido" no título da aba); vale padronizar. O ERP se chama Acesse.
- O conteúdo no banco ainda é de exemplo, para ser substituído pelo real.
