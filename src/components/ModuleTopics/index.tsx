import AsyncContent from '../AsyncContent';
import RoutineTopics from '../RoutineTopics';
import { parseTopics, type ModuloResposta } from '../../api/helpCenter';
import { useApi } from '../../api/useApi';

type Props = {
  /** Identificador do módulo na API, igual ao caminho da página: `estoque`. */
  slug: string;
};

/**
 * Busca os tópicos publicados de um módulo e os mostra recolhíveis. As páginas
 * de conteúdo só precisam informar o `slug`.
 */
export default function ModuleTopics({ slug }: Props) {
  const { data, error, loading, retry } = useApi<ModuloResposta, ReturnType<typeof parseTopics>>(
    `/api/modulos/${encodeURIComponent(slug)}`,
    parseTopics,
  );

  return (
    <AsyncContent
      loading={loading}
      error={error}
      onRetry={retry}
      loadingLabel="Carregando os artigos…"
      empty={data?.length === 0}
      emptyLabel="Os artigos desta página ainda estão sendo escritos."
    >
      {data && <RoutineTopics topics={data} />}
    </AsyncContent>
  );
}
