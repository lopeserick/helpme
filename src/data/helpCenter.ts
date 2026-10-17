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

/** Um bloco de conteúdo dentro de um tópico: parágrafo ou imagem. */
export type TopicBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; src: string; alt: string; caption?: string };

export interface Topic {
  id: string;
  /** Nome da rotina, exibido com o tópico fechado. */
  title: string;
  content: TopicBlock[];
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
    description: 'Como realizar as rotinas básicas do Acesse',
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

/**
 * Tópicos de cada página, por enquanto com textos de exemplo.
 *
 * Para editar: troque `title` e os blocos de `content`. Um bloco de texto é
 * `{ type: 'text', text: '...' }` e um de imagem é
 * `{ type: 'image', src: '/exemplos/arquivo.png', alt: 'o que a imagem mostra' }`,
 * com `caption` opcional. As imagens ficam em `public/` e o `src` começa com `/`.
 */
const placeholder = '/exemplos/tela-exemplo.svg';

export const topicsByPage = {
  estoque: [
    {
      id: 'cadastrar-produto',
      title: 'Como cadastrar um produto',
      content: [
        {
          type: 'text',
          text: 'Acesse o menu Estoque e escolha Produtos. Clique em Novo para abrir a ficha em branco.',
        },
        {
          type: 'text',
          text: 'Preencha descrição, unidade de medida e NCM. A descrição é o que aparece na nota fiscal, então use o mesmo padrão do catálogo.',
        },
        {
          type: 'image',
          src: placeholder,
          alt: 'Tela de cadastro de produto do Acesse',
          caption: 'Substitua por uma captura de tela do Acesse.',
        },
        {
          type: 'text',
          text: 'Salve com F9. O código do produto é gerado automaticamente e não pode ser alterado depois.',
        },
      ],
    },
    {
      id: 'entrada-por-nota',
      title: 'Lançar entrada de mercadoria por nota',
      content: [
        {
          type: 'text',
          text: 'Em Estoque, abra Entradas e importe o XML da nota do fornecedor. Os itens já chegam preenchidos.',
        },
        {
          type: 'text',
          text: 'Confira a relação entre o código do fornecedor e o seu código interno antes de confirmar: é o que evita produto duplicado no catálogo.',
        },
      ],
    },
    {
      id: 'inventario',
      title: 'Fazer inventário e ajustar saldo',
      content: [
        {
          type: 'text',
          text: 'Gere a lista de contagem em Estoque > Inventário, imprima e faça a contagem física.',
        },
        {
          type: 'text',
          text: 'Lance as quantidades contadas e confirme. O sistema cria o ajuste de saldo e guarda o histórico da diferença.',
        },
      ],
    },
    {
      id: 'transferencia-entre-filiais',
      title: 'Transferir produtos entre filiais',
      content: [
        {
          type: 'text',
          text: 'Use Estoque > Transferências, escolha a filial de origem e a de destino e informe os itens.',
        },
        {
          type: 'text',
          text: 'A baixa na origem só acontece quando a filial de destino confirma o recebimento.',
        },
      ],
    },
  ],
  financeiro: [
    {
      id: 'contas-a-pagar',
      title: 'Cadastrar uma conta a pagar',
      content: [
        {
          type: 'text',
          text: 'Em Financeiro > Contas a pagar, clique em Novo, informe o fornecedor, o valor e o vencimento.',
        },
        {
          type: 'text',
          text: 'Se a despesa se repete todo mês, marque como recorrente: o Acesse gera as parcelas seguintes sozinho.',
        },
      ],
    },
    {
      id: 'baixa-de-titulo',
      title: 'Dar baixa em um título',
      content: [
        {
          type: 'text',
          text: 'Localize o título em aberto, clique em Baixar e informe a data do pagamento e a conta usada.',
        },
        {
          type: 'image',
          src: placeholder,
          alt: 'Tela de baixa de título do Acesse',
          caption: 'Substitua por uma captura de tela do Acesse.',
        },
      ],
    },
    {
      id: 'conciliacao-bancaria',
      title: 'Conciliar o extrato bancário',
      content: [
        {
          type: 'text',
          text: 'Importe o arquivo OFX do banco em Financeiro > Conciliação. O sistema sugere os lançamentos equivalentes.',
        },
        {
          type: 'text',
          text: 'Confira as sugestões antes de confirmar: lançamentos de mesmo valor no mesmo dia podem ser trocados entre si.',
        },
      ],
    },
    {
      id: 'fluxo-de-caixa',
      title: 'Consultar o fluxo de caixa',
      content: [
        {
          type: 'text',
          text: 'Em Financeiro > Fluxo de caixa, escolha o período e se quer ver valores previstos, realizados ou os dois.',
        },
      ],
    },
  ],
  sintegra: [
    {
      id: 'gerar-arquivo',
      title: 'Gerar o arquivo do Sintegra',
      content: [
        {
          type: 'text',
          text: 'Em Fiscal > Sintegra, informe o mês de referência e a finalidade do arquivo, e clique em Gerar.',
        },
        {
          type: 'text',
          text: 'O arquivo é salvo na pasta configurada em Parâmetros fiscais. Gere sempre depois de fechar o movimento do mês.',
        },
      ],
    },
    {
      id: 'validar-arquivo',
      title: 'Validar o arquivo antes de enviar',
      content: [
        {
          type: 'text',
          text: 'Abra o validador da Sefaz e carregue o arquivo gerado. Erros de cadastro aparecem com a linha correspondente.',
        },
        {
          type: 'text',
          text: 'Os problemas mais comuns são inscrição estadual e NCM em branco no cadastro do produto.',
        },
      ],
    },
    {
      id: 'corrigir-rejeicao',
      title: 'Corrigir uma rejeição e regerar',
      content: [
        {
          type: 'text',
          text: 'Corrija o cadastro apontado pelo validador, volte em Fiscal > Sintegra e gere o arquivo de novo para o mesmo período.',
        },
      ],
    },
  ],
  'primeiros-passos': [
    {
      id: 'primeiro-acesso',
      title: 'Primeiro acesso ao Acesse',
      content: [
        {
          type: 'text',
          text: 'Use o usuário e a senha enviados pelo suporte. No primeiro acesso o sistema pede a troca da senha.',
        },
        {
          type: 'image',
          src: placeholder,
          alt: 'Tela de login do Acesse',
          caption: 'Substitua por uma captura de tela do Acesse.',
        },
      ],
    },
    {
      id: 'conhecer-menus',
      title: 'Entender os menus principais',
      content: [
        {
          type: 'text',
          text: 'O menu lateral separa as áreas: Cadastros, Estoque, Vendas, Financeiro e Fiscal. Cada área guarda as rotinas do dia a dia.',
        },
      ],
    },
    {
      id: 'cadastrar-usuario',
      title: 'Cadastrar um novo usuário',
      content: [
        {
          type: 'text',
          text: 'Em Configurações > Usuários, clique em Novo, informe nome e e-mail e escolha o perfil de permissões.',
        },
        {
          type: 'text',
          text: 'O perfil define quais menus a pessoa enxerga. Comece pelo mais restrito e vá liberando conforme a necessidade.',
        },
      ],
    },
  ],
  novidades: [
    {
      id: 'versao-atual',
      title: 'O que mudou na versão mais recente',
      content: [
        {
          type: 'text',
          text: 'Descreva aqui as mudanças da última versão, uma por parágrafo, começando pelo que afeta o dia a dia de quem usa.',
        },
      ],
    },
  ],
  relatorios: [
    {
      id: 'relatorio-de-vendas',
      title: 'Gerar o relatório de vendas do mês',
      content: [
        {
          type: 'text',
          text: 'Em Relatórios > Vendas, escolha o período, o vendedor e a filial. Dá para exportar em PDF ou planilha.',
        },
      ],
    },
    {
      id: 'curva-abc',
      title: 'Montar a curva ABC de produtos',
      content: [
        {
          type: 'text',
          text: 'Em Relatórios > Curva ABC, escolha se o critério é faturamento ou quantidade vendida e informe o período.',
        },
      ],
    },
  ],
} satisfies Record<string, Topic[]>;
