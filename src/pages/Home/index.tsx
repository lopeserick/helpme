import Header from '../../components/Header';
import CategoryCard from '../../components/CategoryCard';
import CategoryIcon from '../../components/CategoryIcon';
import Index from '../../components/Index';
import { categories, routines } from '../../data/helpCenter';
import './home.css';

export default function Home() {
  return (
    <>
      <Header />

      <main className="container home">
        <section>
          <h2 className="home-heading">Categorias</h2>

          <ul className="category-list">
            {categories.map((category) => (
              <li key={category.id}>
                <CategoryCard
                  title={category.title}
                  description={category.description}
                  icon={<CategoryIcon name={category.icon} />}
                  to={category.path}
                />
              </li>
            ))}
          </ul>
        </section>

        <Index items={routines.map((routine) => routine.title)} />
      </main>
    </>
  );
}
