import { useParams } from 'react-router-dom';
import AdminShell from '../../../components/AdminShell';
import AsyncContent from '../../../components/AsyncContent';
import {
  parseModulos,
  parseTopico,
  type ModulosAdminResposta,
  type TopicoAdminResposta,
  type TopicoCompleto,
} from '../../../api/admin';
import { useApi } from '../../../api/useApi';
import EditorForm from './EditorForm';

const voltar = { to: '/admin', label: 'Voltar para a lista' };

/** Abre um passo a passo que já existe. */
function Editar({ id }: { id: string }) {
  const { data, error, loading, retry } = useApi<TopicoAdminResposta, TopicoCompleto>(
    `/api/admin/topicos/${encodeURIComponent(id)}`,
    parseTopico,
  );

  if (!data) {
    return (
      <AdminShell title="Editar passo a passo" back={voltar}>
        <AsyncContent
          loading={loading}
          error={error}
          onRetry={retry}
          loadingLabel="Abrindo o passo a passo…"
        >
          {null}
        </AsyncContent>
      </AdminShell>
    );
  }

  // A chave refaz o formulário do zero se a pessoa trocar de tópico.
  return <EditorForm key={data.id} topico={data} modulos={[]} />;
}

/** Começa um passo a passo novo; só precisa da lista de módulos para o seletor. */
function Criar() {
  const { data, error, loading, retry } = useApi<
    ModulosAdminResposta,
    ReturnType<typeof parseModulos>
  >('/api/admin/modulos', parseModulos);

  if (!data) {
    return (
      <AdminShell title="Novo passo a passo" back={voltar}>
        <AsyncContent loading={loading} error={error} onRetry={retry}>
          {null}
        </AsyncContent>
      </AdminShell>
    );
  }

  return <EditorForm key="novo" modulos={data} />;
}

export default function Editor() {
  const { id } = useParams();
  return id ? <Editar id={id} /> : <Criar />;
}
