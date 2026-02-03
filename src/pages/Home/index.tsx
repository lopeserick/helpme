import Header from '../../components/Header';
import CategoryCard from '../../components/CategoryCard';
import './home.css';

export default function Home() {
  return (
    <>
      <Header />

      <section className="container categories">
        <h2>Categorias</h2>

        <div className="grid">
          <CategoryCard
            title="Gestão de Estoque"
            description="Gerencie produtos e movimentações"
          />

          <CategoryCard
            title="Financeio"
            description="Controle de contas e fluxo de caixa"
          />
        </div>
      </section>
    </>
  );
}
