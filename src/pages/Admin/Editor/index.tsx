import { useState } from 'react';
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
  const [versao, setVersao] = useState(0);
  const [restaurado, setRestaurado] = useState<{
    id: number;
    topico: TopicoCompleto;
    aviso: string;
  } | null>(null);

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

  // Depois de restaurar uma versão, o formulário recomeça com o conteúdo dela.
  const atual = restaurado?.id === data.id ? restaurado : null;

  // A chave refaz o formulário do zero ao trocar de tópico ou restaurar.
  return (
    <EditorForm
      key={`${data.id}-${versao}`}
      topico={atual?.topico ?? data}
      modulos={[]}
      avisoAoAbrir={atual?.aviso}
      onRestaurado={(topico, aviso) => {
        setRestaurado({ id: data.id, topico, aviso });
        setVersao((n) => n + 1);
      }}
    />
  );
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
