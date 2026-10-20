import PageShell from '../../components/PageShell';
import ModuleTopics from '../../components/ModuleTopics';

export default function Financeiro() {
  return (
    <PageShell
      title="Financeiro"
      description="Contas a pagar, baixa de títulos, conciliação e fluxo de caixa."
    >
      <ModuleTopics slug="financeiro" />
    </PageShell>
  );
}
