/**
 * Fonte única dos dados da central de ajuda.
 *
 * Os tipos abaixo descrevem o formato que a tela espera. Hoje os dados vivem
 * neste arquivo; quando virarem API/CMS, basta devolver o mesmo formato
 * (por exemplo, numa função `getCategories()`), sem mexer nos componentes.
 * Por isso os valores são dados simples e serializáveis: nada de componentes
 * React aqui (o ícone é um nome, resolvido em `components/CategoryIcon`).
 */

export type CategoryIconName = 'database' | 'dollar' | 'book' | 'star';

export interface Category {
  id: string;
  title: string;
  description: string;
  /** Rota da página da categoria (ver `App.tsx`). */
  path: string;
  icon: CategoryIconName;
}

export interface Routine {
  id: string;
  title: string;
}

export const categories: Category[] = [
  {
    id: 'estoque',
    title: 'Gestão de Estoque',
    description: 'Gerencie produtos e movimentações',
    path: '/estoque',
    icon: 'database',
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    description: 'Controle de contas e fluxo de caixa',
    path: '/financeiro',
    icon: 'dollar',
  },
  {
    id: 'sintegra',
    title: 'Sintegra',
    description: 'Arquivos e Relatórios Fiscais',
    path: '/sintegra',
    icon: 'book',
  },
  {
    id: 'primeiros-passos',
    title: 'Primeiros Passos',
    description: 'Como realizar as rotinas básicas do Acesse Brasil',
    path: '/primeiros-passos',
    icon: 'star',
  },
];

export const routines: Routine[] = [
  { id: 'cadastrar-produto', title: 'Como cadastrar produto' },
  { id: 'emitir-nota-fiscal', title: 'Emitir nota fiscal' },
  { id: 'relatorio-mensal', title: 'Gerar relatório mensal' },
  { id: 'formas-de-pagamento', title: 'Configurar formas de pagamento' },
];
