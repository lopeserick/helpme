import PageShell from '../../components/PageShell';
import RoutineTopics from '../../components/RoutineTopics';
import { topicsByPage } from '../../data/helpCenter';

export default function Relatorios() {
  return (
    <PageShell
      title="Relatórios"
      description="Vendas, curva ABC e demais análises do sistema."
    >
      <RoutineTopics topics={topicsByPage.relatorios} />
    </PageShell>
  );
}
