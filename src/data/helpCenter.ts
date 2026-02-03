export interface Category {
  icon: string;
  title: string;
  description: string;
  articles: number;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'gray' | 'red';
}

export const categories: Category[] = [
  {
    icon: 'package',
    title: "Gestão de Estoque",
    description: "Aprenda a gerenciar produtos, entradas e saídas",
    articles: 24,
    color: "blue"
  },
  {
    icon: 'dollar',
    title: "Financeiro",
    description: "Contas a pagar, receber e fluxo de caixa",
    articles: 18,
    color: "green"
  },
  {
    icon: 'users',
    title: "Clientes e Vendas",
    description: "Cadastros, pedidos e relacionamento",
    articles: 31,
    color: "purple"
  },
  {
    icon: 'chart',
    title: "Relatórios",
    description: "Análises, dashboards e indicadores",
    articles: 15,
    color: "orange"
  },
  {
    icon: 'settings',
    title: "Configurações",
    description: "Personalize o sistema conforme sua necessidade",
    articles: 12,
    color: "gray"
  },
  {
    icon: 'book',
    title: "Primeiros Passos",
    description: "Guia completo para iniciantes",
    articles: 8,
    color: "red"
  }
];

export const popularArticles: string[] = [
  "Como cadastrar um novo produto",
  "Emitir nota fiscal eletrônica",
  "Configurar formas de pagamento",
  "Gerar relatório de vendas mensal"
];
