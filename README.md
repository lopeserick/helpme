# Help Me — central de ajuda

Central de ajuda para o ERP (estoque, financeiro, fiscal/Sintegra), feita para
mostrar a ideia à empresa. Hoje é um front-end com dados dentro do código; a
estrutura já está pronta para trocar esses dados por uma API ou CMS depois.

## Tecnologias

- React 18 + TypeScript (modo estrito)
- Vite 5 (servidor de desenvolvimento e build)
- React Router 7 (rotas)
- CSS Modules + variáveis CSS (sem Tailwind)
- lucide-react (ícones) e Schibsted Grotesk (fonte, hospedada no projeto)
- ESLint 9 com typescript-eslint

Testado com Node 22.

## Como rodar

```bash
npm install
npm run dev
```

O Vite abre `http://localhost:3000` automaticamente.

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
├── data/helpCenter.ts       # Categorias e rotinas (fonte única dos dados)
├── components/
│   ├── Header/              # Topo com título e campo de busca
│   ├── CategoryCard/        # Linha de categoria (a linha inteira é um link)
│   ├── CategoryIcon/        # Converte o nome do ícone em componente
│   ├── Index/               # Lista "Rotinas mais acessadas"
│   └── PageShell/           # Estrutura das páginas internas (voltar + título)
├── pages/                   # Uma pasta por rota
└── styles/
    ├── theme.css            # Todas as cores, raios e sombras (variáveis)
    └── global.css           # Reset, corpo, container e foco
```

## Rotas

| Rota                | Página             | Estado               |
| ------------------- | ------------------ | -------------------- |
| `/`                 | Home               | Pronta               |
| `/estoque`          | Gestão de Estoque  | Em construção        |
| `/financeiro`       | Financeiro         | Em construção        |
| `/sintegra`         | Sintegra           | Em construção        |
| `/primeiros-passos` | Primeiros Passos   | Em construção        |
| `/novidades`        | O que há de novo   | Em construção (sem link na Home) |
| `/relatorios`       | Relatórios         | Em construção (sem link na Home) |
| qualquer outra      | Página não encontrada | Pronta            |

## Como adicionar uma categoria

1. Em `src/data/helpCenter.ts`, inclua um item em `categories` (`id`, `title`,
   `description`, `path` e `icon`). Se precisar de um ícone novo, acrescente o
   nome em `CategoryIconName` e o componente em `components/CategoryIcon`.
2. Crie a página em `src/pages/<Nome>/index.tsx` usando `PageShell`.
3. Registre a rota em `src/App.tsx`.

## Tema

Toda cor, raio e sombra vem de `src/styles/theme.css`. Se uma variável não
existe nesse arquivo, ela não deve ser usada nos componentes.

## Do código para uma API

Os tipos `Category` e `Routine` em `src/data/helpCenter.ts` são o contrato da
tela e só contêm dados simples (o ícone é um nome, não um componente). Quando os
dados vierem de um servidor ou CMS, mantenha esses tipos, troque o import da
Home por uma função assíncrona (por exemplo, `getCategories()`) e acrescente
estados de carregamento e de erro.

## Pendências conhecidas

- A busca do topo é só visual: digitar não filtra nada.
- As páginas de categoria ainda não têm artigos.
- Não há testes automatizados nem integração contínua.
- `npm audit` aponta 2 avisos que afetam apenas o servidor de desenvolvimento
  (Vite 5 / esbuild); corrigir exige subir o Vite de versão principal.
- `tsconfig.app.json` não é referenciado por `tsconfig.json` (o build usa o
  `tsconfig.json`).
- O nome aparece de três formas (Help Me, Help Center, "Suporte Rápido" no
  título da aba) e o texto da Home cita "Acesse Brasil"; vale padronizar.
