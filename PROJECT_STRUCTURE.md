# 📁 Estrutura do Projeto Help Center

```
help-center-project/
│
├── 📄 README.md                          # Documentação do projeto
├── 📄 package.json                       # Dependências e scripts
├── 📄 tsconfig.json                      # Configuração TypeScript
│
└── src/
    │
    ├── 📄 App.tsx                        # Componente principal da aplicação
    │
    ├── components/                       # Todos os componentes React
    │   │
    │   ├── CategoryCard/                 # Card de categoria
    │   │   ├── 📄 index.tsx              # Componente CategoryCard
    │   │   └── 🎨 styles.module.css      # Estilos isolados
    │   │
    │   ├── Header/                       # Cabeçalho da página
    │   │   ├── 📄 index.tsx              # Componente Header
    │   │   └── 🎨 styles.module.css      # Estilos isolados
    │   │
    │   ├── PopularArticles/              # Seção de artigos populares
    │   │   ├── 📄 index.tsx              # Componente PopularArticles
    │   │   └── 🎨 styles.module.css      # Estilos isolados
    │   │
    │   └── SearchInput/                  # Campo de busca
    │       └── 📄 index.tsx              # Componente SearchInput
    │
    ├── data/                             # Dados da aplicação
    │   └── 📊 helpCenter.ts              # Categorias e artigos
    │
    └── styles/                           # Configurações de tema
        ├── 🎨 appTheme.ts                # Cores e espaçamentos
        └── 🎨 theme.ts                   # Breakpoints e sombras
```

## 🔍 Descrição dos Arquivos

### Root Level
- **README.md**: Documentação completa do projeto
- **package.json**: Gerenciamento de dependências NPM
- **tsconfig.json**: Configurações do TypeScript

### src/
- **App.tsx**: Componente raiz que orquestra toda a aplicação

### src/components/
Cada componente tem sua própria pasta com:
- **index.tsx**: Lógica do componente
- **styles.module.css**: Estilos CSS Modules (quando aplicável)

#### CategoryCard/
- Exibe cards de categorias com ícones
- Cores customizáveis por categoria
- Hover effects

#### Header/
- Título da página
- Subtítulo
- Integra o SearchInput

#### PopularArticles/
- Lista de artigos mais acessados
- Badges numerados
- Interativo com hover

#### SearchInput/
- Campo de busca reutilizável
- Ícone SVG integrado
- Placeholder customizável

### src/data/
- **helpCenter.ts**: Centralizador de todos os dados mockados

### src/styles/
- **appTheme.ts**: Sistema de design (cores, espaçamentos)
- **theme.ts**: Configurações adicionais (breakpoints, sombras)

## 📊 Fluxo de Dados

```
App.tsx
  ↓
  ├→ Header → SearchInput
  ↓
  ├→ CategoryCard (map sobre categories)
  ↓
  └→ PopularArticles (recebe popularArticles)
```

## 🎯 Princípios de Organização

1. **Separação de Responsabilidades**: Cada componente tem uma única responsabilidade
2. **Modularidade**: Componentes independentes e reutilizáveis
3. **Centralização de Dados**: Todos os dados em `src/data/`
4. **Estilos Isolados**: CSS Modules previne conflitos
5. **TypeScript**: Type safety em toda aplicação
6. **Escalabilidade**: Fácil adicionar novos componentes
