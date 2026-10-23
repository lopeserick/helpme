import { useParams } from 'react-router-dom';
import AsyncContent from '../../components/AsyncContent';
import PageShell from '../../components/PageShell';
import RoutineTopics from '../../components/RoutineTopics';
import { parseModulePage, type ModuloResposta, type ModulePage } from '../../api/helpCenter';
import { ApiError } from '../../api/client';
import { useApi } from '../../api/useApi';
import NotFound from '../NotFound';

/**
 * Página de qualquer módulo, pelo endereço: /estoque, /relatorios, /nfc-e...
 * Um módulo criado no painel já ganha página, sem mexer no código.
 */
export default function Module() {
  const { slug = '' } = useParams();
  const { data, error, loading, retry } = useApi<ModuloResposta, ModulePage>(
    `/api/modulos/${encodeURIComponent(slug)}`,
    parseModulePage,
  );

  if (error instanceof ApiError && error.status === 404) return <NotFound />;

  return (
    <PageShell
      title={data?.title ?? (loading ? 'Carregando…' : 'Central de ajuda')}
      description={data?.subtitle}
    >
      <AsyncContent
        loading={loading}
        error={error}
        onRetry={retry}
        loadingLabel="Carregando os artigos…"
        empty={data?.topics.length === 0}
        emptyLabel="Os artigos desta página ainda estão sendo escritos."
      >
        {data && <RoutineTopics topics={data.topics} moduleSlug={data.slug} />}
      </AsyncContent>
    </PageShell>
  );
}
