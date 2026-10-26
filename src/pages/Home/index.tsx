import Header from '../../components/Header';
import AsyncContent from '../../components/AsyncContent';
import CategoryCard from '../../components/CategoryCard';
import CategoryIcon from '../../components/CategoryIcon';
import ChamadaSugestao from '../../components/ChamadaSugestao';
import Index from '../../components/Index';
import NewsAlert from '../../components/NewsAlert';
import {
  parseCategories,
  parsePopular,
  type MaisAcessadosResposta,
  type ModulosResposta,
} from '../../api/helpCenter';
import { useApi } from '../../api/useApi';
import './home.css';

export default function Home() {
  const { data, error, loading, retry } = useApi<
    ModulosResposta,
    ReturnType<typeof parseCategories>
  >('/api/modulos', parseCategories);

  // Os mais abertos nos últimos 30 dias. Sem dados ainda, ou com erro, a lista
  // simplesmente não aparece: é um atalho, não o conteúdo principal.
  const populares = useApi<MaisAcessadosResposta, ReturnType<typeof parsePopular>>(
    '/api/mais-acessados?limite=4',
    parsePopular,
  );

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

        <div>
          {populares.data && populares.data.length > 0 && <Index items={populares.data} />}
          <ChamadaSugestao />
        </div>
      </main>
    </>
  );
}
