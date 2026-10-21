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
│   ├── Index/               # Lista "Rotinas mais acessadas" (da API)
│   ├── NewsAlert/           # Alerta de novidades do ERP, na Home
│   ├── PageHeader/          # Faixa verde do topo (Home e páginas internas)
│   ├── PageShell/           # Estrutura das páginas internas (voltar + título)
│   ├── RoutineTopics/       # Tópicos de rotina recolhíveis (texto e imagem)
│   └── SearchRoutines/      # Busca com sugestões de rotinas
├── pages/                   # Home, Module (qualquer módulo), NotFound e Admin/
└── styles/
    ├── theme.css            # Todas as cores, raios e sombras (variáveis)
    └── global.css           # Reset, corpo, container e foco
```

## Rotas

| Rota                | Página             | Estado               |
| ------------------- | ------------------ | -------------------- |
| `/`                 | Home               | Pronta               |
| `/:modulo`          | Página do módulo (`/estoque`, `/relatorios`, `/novidades`...) | Uma página só para todos, lida da API |
| `/admin/login`      | Entrar no painel   | Pronta               |
| `/admin/cadastro`   | Criar conta        | Exige o código de cadastro |
| `/admin`            | Lista de passo a passo | Exige login      |
| `/admin/topicos/novo` e `/admin/topicos/:id` | Editor, com histórico | Exige login |
| `/admin/modulos`    | Módulos            | Exige login          |
| `/admin/metricas`   | Métricas           | Exige login          |
| `/admin/imagens`    | Imagens sem uso    | Exige login          |
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

Para colocar uma imagem, use **Adicionar imagem** (PNG, JPEG ou WebP, até 5 MB).
Ela é reduzida para 1600 px de largura e convertida para WebP, e você precisa
descrever o que ela mostra (texto para quem usa leitor de tela). Telas em
`src/pages/Admin/`, sessão em `src/admin/`.

O painel tem quatro seções:

- **Passo a passo:** lista e editor. No fim do editor fica o **Histórico**:
  quem criou, editou, publicou ou tirou do site, e quando. As versões salvas a
  partir da fase 4 têm o botão **Restaurar**, que volta título, rótulo e blocos
  para aquela versão (o conteúdo de antes fica guardado no histórico).
- **Módulos:** criar, editar, mostrar ou ocultar da Home e mudar a ordem. O
  endereço sai do título na criação ("NFC-e" vira `/nfc-e`) e não muda depois.
  Não há exclusão, só ocultar.
- **Métricas:** buscas sem resultado, "Esta resposta ajudou?" e os mais
  abertos, nos últimos 7, 30 ou 90 dias.
- **Imagens:** as que nenhum passo a passo usa, para apagar e liberar espaço.

## Onde o conteúdo é cadastrado

O site público só exibe. Módulos, tópicos, imagens e avisos vêm do banco, pela
API, e tudo se cadastra pelo painel. O `seed` (`api/src/db/conteudo-inicial.json`)
só serve para começar um banco vazio.

- **Categoria da Home:** é um módulo visível na API. O `icone` precisa ser um
  dos nomes de `components/CategoryIcon` (`database`, `dollar`, `book`,
  `star`, `chart`); um nome desconhecido cai no ícone de livro.
- **Página de um módulo:** é uma só (`src/pages/Module`), na rota `/:slug`.
  Ela busca `/api/modulos/:slug` e mostra título, subtítulo (ou a descrição)
  e os tópicos. Módulo criado no painel já tem página; slug inexistente mostra
  "Página não encontrada".
- **Tópico:** lista de blocos de texto e imagem. O `alt` das imagens é
  obrigatório na API, porque descreve a imagem para leitor de tela.
- **Imagens:** ficam em disco, na pasta `UPLOADS_DIR` da API (veja
  `api/README.md`), e o IIS as serve em `/uploads`.

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

## Métricas

O site registra, sem guardar IP nem nada que identifique quem acessou (só
contagens por dia):

- **Abertura de tópico:** uma por tópico enquanto a página está aberta, não a
  cada clique. Os 4 mais abertos dos últimos 30 dias viram "Rotinas mais
  acessadas" na Home; sem acessos ainda, essa lista não aparece.
- **"Esta resposta ajudou?"** no fim de cada tópico. O navegador lembra o voto
  para não perguntar de novo.
- **Busca sem resultado:** só depois que a pessoa para de digitar por 1,5 s, e
  com ao menos 3 letras, para não registrar cada letra.

## Tema

Toda cor, raio e sombra vem de `src/styles/theme.css`. Se uma variável não
existe nesse arquivo, ela não deve ser usada nos componentes.

## Pendências conhecidas

- O painel não tem troca de módulo de um tópico, redefinição de senha nem
  gestão de contas.
- O histórico só permite restaurar versões salvas a partir da fase 4; as
  anteriores mostram apenas quem fez o quê e quando.
- Não há testes automatizados nem integração contínua.
- `npm audit` aponta 2 avisos que afetam apenas o servidor de desenvolvimento
  (Vite 5 / esbuild); corrigir exige subir o Vite de versão principal.
- `tsconfig.app.json` não é referenciado por `tsconfig.json` (o build usa o
  `tsconfig.json`).
- O nome do projeto aparece de três formas (Help Me, Help Center e "Suporte
  Rápido" no título da aba); vale padronizar. O ERP se chama Acesse.
- O conteúdo no banco ainda é de exemplo, para ser substituído pelo real.
