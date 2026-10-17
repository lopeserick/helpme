import PageShell from '../../components/PageShell';
import RoutineTopics from '../../components/RoutineTopics';
import { topicsByPage } from '../../data/helpCenter';

/**
 * Página de novidades do ERP. Não aparece na lista de categorias: o caminho
 * até ela é o alerta da Home (`components/NewsAlert`).
 */
export default function News() {
  return (
    <PageShell
      title="O que há de novo"
      description="Rotinas, programas e validações fiscais implantados no Acesse, do mais recente para o mais antigo."
    >
      <RoutineTopics topics={topicsByPage.novidades} />
    </PageShell>
  );
}
