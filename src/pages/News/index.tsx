import PageShell from '../../components/PageShell';
import RoutineTopics from '../../components/RoutineTopics';
import { topicsByPage } from '../../data/helpCenter';

export default function News() {
  return (
    <PageShell
      title="O que há de novo"
      description="Mudanças das versões mais recentes do Acesse."
    >
      <RoutineTopics topics={topicsByPage.novidades} />
    </PageShell>
  );
}
