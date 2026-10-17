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

      <section className="container categories">
        <h2>Categorias</h2>

        <div className="grid">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              title={category.title}
              description={category.description}
              icon={<CategoryIcon name={category.icon} />}
              to={category.path}
            />
          ))}
        </div>
      </section>

      <Index items={routines.map((routine) => routine.title)} />
    </>
  );
}
