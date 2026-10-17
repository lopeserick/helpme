import PageShell from '../../components/PageShell';
import RoutineTopics from '../../components/RoutineTopics';
import { topicsByPage } from '../../data/helpCenter';

export default function Estoque() {
  return (
    <PageShell
      title="Gestão de Estoque"
      description="Produtos, entradas, inventário e transferências entre filiais."
    >
      <RoutineTopics topics={topicsByPage.estoque} />
    </PageShell>
  );
}
