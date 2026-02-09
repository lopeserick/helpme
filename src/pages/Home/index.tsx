import Header from '../../components/Header';
import CategoryCard from '../../components/CategoryCard';
import './home.css';
import Index from '../../components/Index';
import { CircleDollarSign, Database, CircleStar, BookOpenText } from 'lucide-react';



export default function Home() {

  const routines = [
    "Como cadastrar produto",
    "Emitir nota fiscal",
    "Gerar relatório mensal",
    "Configurar formas de pagamento"
  ];  

  return (
    <>
      <Header />

      <section className="container categories">
        <h2>Categorias</h2>

        <div className="grid">
          <CategoryCard
            title="Gestão de Estoque"
            description="Gerencie produtos e movimentações"
            icon = {<Database />}
          />

          <CategoryCard
            title="Financeiro"
            description="Controle de contas e fluxo de caixa"
            icon = {<CircleDollarSign />}
          />
          <CategoryCard
            title="Sintegra"
            description="Arquivos e Relatórios Fiscais"
            icon = {<BookOpenText />}
          />
          
          <CategoryCard
            title="Primeiros Passos"
            description="Como realizar as rotinas básicas do Acesse Brasil"
            icon ={<CircleStar />}
          />

        </div>
      </section> 
      
      <Index items={routines} />

    </>
  );
}
