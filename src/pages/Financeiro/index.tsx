import PageShell from '../../components/PageShell';
import RoutineTopics from '../../components/RoutineTopics';
import { topicsByPage } from '../../data/helpCenter';

export default function Financeiro() {
  return (
    <PageShell
      title="Financeiro"
      description="Contas a pagar, baixa de títulos, conciliação e fluxo de caixa."
    >
      <RoutineTopics topics={topicsByPage.financeiro} />
    </PageShell>
  );
}
