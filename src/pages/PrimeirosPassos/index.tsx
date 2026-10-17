import PageShell from '../../components/PageShell';
import RoutineTopics from '../../components/RoutineTopics';
import { topicsByPage } from '../../data/helpCenter';

export default function PrimeirosPassos() {
  return (
    <PageShell
      title="Primeiros Passos"
      description="O básico para começar a usar o Acesse no dia a dia."
    >
      <RoutineTopics topics={topicsByPage['primeiros-passos']} />
    </PageShell>
  );
}
