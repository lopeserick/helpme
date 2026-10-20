import PageShell from '../../components/PageShell';
import ModuleTopics from '../../components/ModuleTopics';

export default function Estoque() {
  return (
    <PageShell
      title="Gestão de Estoque"
      description="Produtos, entradas, inventário e transferências entre filiais."
    >
      <ModuleTopics slug="estoque" />
    </PageShell>
  );
}
