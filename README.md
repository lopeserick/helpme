# 🏥 Help Center - Projeto React + TypeScript + Tailwind

Um sistema de central de ajuda moderno e responsivo, construído com React, TypeScript e Tailwind CSS.

## 📁 Estrutura do Projeto

```
help-center-project/
├── public/                        # Arquivos estáticos
├── src/
│   ├── components/
│   │   ├── CategoryCard/         # Card de categoria
│   │   │   └── index.tsx
│   │   ├── Header/               # Cabeçalho
│   │   │   └── index.tsx
│   │   ├── PopularArticles/      # Artigos populares
│   │   │   └── index.tsx
│   │   └── SearchInput/          # Campo de busca
│   │       └── index.tsx
│   ├── data/
│   │   └── helpCenter.ts         # Dados da aplicação
│   ├── App.tsx                   # Componente principal
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Estilos globais + Tailwind
├── index.html                     # HTML raiz
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

## 🚀 Como Rodar o Projeto

### 1. Instalar Dependências

```bash
npm install
```

ou

```bash
yarn install
```

### 2. Rodar em Desenvolvimento

```bash
npm run dev
```

ou

```bash
yarn dev
```

O projeto vai abrir automaticamente em `http://localhost:3000`

### 3. Build para Produção

```bash
npm run build
```

ou

```bash
yarn build
```

### 4. Preview do Build

```bash
npm run preview
```

## 📦 Dependências Principais

- **React 18** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework de estilos
- **PostCSS** - Processador CSS
- **Autoprefixer** - Prefixos CSS automáticos

## 🎨 Componentes

### CategoryCard
Exibe categorias de ajuda com:
- Ícones customizados (SVG)
- Cores por categoria
- Contador de artigos
- Efeitos de hover

### Header
Cabeçalho da página com:
- Título e subtítulo
- Campo de busca integrado
- Gradiente azul

### PopularArticles
Lista de artigos mais acessados:
- Badges numerados
- Hover effects
- Layout responsivo

### SearchInput
Campo de busca reutilizável:
- Ícone de lupa
- Placeholder customizável
- Gerenciamento de estado

## 🎯 Customização

### Adicionar Nova Categoria

Edite `src/data/helpCenter.ts`:

```typescript
{
  icon: 'nome-do-icone',
  title: "Título da Categoria",
  description: "Descrição breve",
  articles: 10,
  color: "blue" // blue, green, purple, orange, gray, red
}
```

### Adicionar Novo Ícone

No componente `CategoryCard`, adicione no objeto `icons`:

```typescript
'novo-icone': (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {/* SVG path aqui */}
  </svg>
)
```

### Alterar Cores do Tema

Edite `tailwind.config.js` para personalizar as cores padrão do Tailwind.

## 📱 Responsividade

O projeto é totalmente responsivo com breakpoints:
- **Mobile**: < 768px (1 coluna)
- **Tablet**: 768px - 1024px (2 colunas)
- **Desktop**: > 1024px (3 colunas)

## ✨ Recursos

- ✅ Componentes modulares
- ✅ TypeScript para type safety
- ✅ Tailwind CSS para estilização rápida
- ✅ Vite para build ultra-rápido
- ✅ Hot Module Replacement (HMR)
- ✅ SVG icons inline
- ✅ Hover effects e animações
- ✅ Design moderno e limpo

## 🛠️ Possíveis Expansões

- [ ] Sistema de busca funcional
- [ ] Roteamento para páginas de artigos
- [ ] API integration
- [ ] Sistema de autenticação
- [ ] Modo escuro/claro
- [ ] Internacionalização (i18n)
- [ ] Analytics de artigos

## 📝 Notas Técnicas

- **Vite**: Build tool moderno, muito mais rápido que Webpack
- **CSS Modules**: Removido para simplificar (usando apenas Tailwind)
- **SVG Icons**: Inline ao invés de biblioteca externa para reduzir bundle
- **TypeScript Strict**: Configurado para máxima type safety

## 🐛 Troubleshooting

### Tela branca após build
- Verifique se todas as dependências foram instaladas
- Execute `npm install` novamente
- Limpe o cache: `rm -rf node_modules && npm install`

### Tailwind não funciona
- Verifique se o PostCSS está configurado
- Confirme que `@tailwind` directives estão no `index.css`
- Reinicie o servidor de desenvolvimento

### Erros de TypeScript
- Execute `npm run build` para ver erros completos
- Verifique se todos os tipos estão corretos
- Consulte `tsconfig.json` para configurações

## 📄 Licença

MIT

## 👨‍💻 Desenvolvimento

Desenvolvido com ❤️ usando React, TypeScript e Tailwind CSS.
