import PageShell from '../../components/PageShell';
import RoutineTopics from '../../components/RoutineTopics';
import { topicsByPage } from '../../data/helpCenter';

export default function Sintegra() {
  return (
    <PageShell
      title="Sintegra"
      description="Geração, validação e correção do arquivo fiscal."
    >
      <RoutineTopics topics={topicsByPage.sintegra} />
    </PageShell>
  );
}
