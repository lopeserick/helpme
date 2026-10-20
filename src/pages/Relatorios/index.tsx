import PageShell from '../../components/PageShell';
import ModuleTopics from '../../components/ModuleTopics';

export default function Relatorios() {
  return (
    <PageShell
      title="Relatórios"
      description="Vendas, curva ABC e demais análises do sistema."
    >
      <ModuleTopics slug="relatorios" />
    </PageShell>
  );
}
