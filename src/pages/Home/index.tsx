import Header from '../../components/Header';
import AsyncContent from '../../components/AsyncContent';
import CategoryCard from '../../components/CategoryCard';
import CategoryIcon from '../../components/CategoryIcon';
import Index from '../../components/Index';
import NewsAlert from '../../components/NewsAlert';
import { parseCategories, type ModulosResposta } from '../../api/helpCenter';
import { useApi } from '../../api/useApi';
import './home.css';

/**
 * Ainda fixas no código: a API não tem como saber quais rotinas são as mais
 * acessadas, porque ainda não registra acessos. Quando passar a registrar, esta
 * lista vira uma rota de leitura.
 */
const popularRoutines = [
  'Como cadastrar produto',
  'Emitir nota fiscal',
  'Gerar relatório mensal',
  'Configurar formas de pagamento',
];

export default function Home() {
  const { data, error, loading, retry } = useApi<
    ModulosResposta,
    ReturnType<typeof parseCategories>
  >('/api/modulos', parseCategories);

  return (
    <>
      <Header />

      <main className="container home">
        <NewsAlert />

        <section>
          <h2 className="home-heading">Categorias</h2>

          <AsyncContent
            loading={loading}
            error={error}
            onRetry={retry}
            loadingLabel="Carregando as categorias…"
            empty={data?.length === 0}
            emptyLabel="Ainda não há categorias publicadas."
          >
            <ul className="category-list">
              {data?.map((category) => (
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
          </AsyncContent>
        </section>

        <Index items={popularRoutines} />
      </main>
    </>
  );
}
