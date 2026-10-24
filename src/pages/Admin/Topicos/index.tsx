import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import AsyncContent from '../../../components/AsyncContent';
import {
  parseModulos,
  parseTopicos,
  type ModulosAdminResposta,
  type TopicoResumo,
  type TopicosAdminResposta,
} from '../../../api/admin';
import { useApi } from '../../../api/useApi';
import { formatDateTime, normalize } from '../../../lib/texto';
import forms from '../forms.module.css';
import styles from './styles.module.css';

type FiltroSituacao = 'todos' | 'publicado' | 'rascunho';

/** Lista dos passo a passo, com rascunhos, filtrável por módulo, situação e texto. */
export default function Topicos() {
  const location = useLocation();
  const aviso = (location.state as { aviso?: string } | null)?.aviso;

  const lista = useApi<TopicosAdminResposta, TopicoResumo[]>(
    '/api/admin/topicos',
    parseTopicos,
  );
  const modulos = useApi<ModulosAdminResposta, ReturnType<typeof parseModulos>>(
    '/api/admin/modulos',
    parseModulos,
  );

  const [modulo, setModulo] = useState('');
  const [situacao, setSituacao] = useState<FiltroSituacao>('todos');
  const [busca, setBusca] = useState('');

  const termo = normalize(busca);
  const visiveis = (lista.data ?? []).filter(
    (t) =>
      (!modulo || t.moduloSlug === modulo) &&
      (situacao === 'todos' || t.situacao === situacao) &&
      (!termo ||
        normalize(t.titulo).includes(termo) ||
        normalize(t.moduloTitulo).includes(termo)),
  );

  return (
    <AdminShell
      title="Painel da central"
      description="Escreva, edite e publique os passo a passo que aparecem no site."
    >
      {aviso && (
        <p className={`${forms.notice} ${styles.aviso}`} role="status">
          {aviso}
        </p>
      )}

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <label className={forms.field}>
            <span className={forms.label}>Buscar</span>
            <input
              className={forms.input}
              type="search"
              placeholder="Título ou módulo"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </label>

          <label className={forms.field}>
            <span className={forms.label}>Módulo</span>
            <select
              className={forms.select}
              value={modulo}
              onChange={(e) => setModulo(e.target.value)}
            >
              <option value="">Todos</option>
              {modulos.data?.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.titulo}
                </option>
              ))}
            </select>
          </label>

          <label className={forms.field}>
            <span className={forms.label}>Situação</span>
            <select
              className={forms.select}
              value={situacao}
              onChange={(e) => setSituacao(e.target.value as FiltroSituacao)}
            >
              <option value="todos">Todas</option>
              <option value="publicado">Publicados</option>
              <option value="rascunho">Rascunhos</option>
            </select>
          </label>
        </div>

        <Link to="/topicos/novo" className={forms.primary}>
          <Plus aria-hidden="true" />
          Novo passo a passo
        </Link>
      </div>

      <AsyncContent
        loading={lista.loading}
        error={lista.error}
        onRetry={lista.retry}
        loadingLabel="Carregando os passo a passo…"
        empty={lista.data?.length === 0}
        emptyLabel="Ainda não há nenhum passo a passo. Comece pelo botão acima."
      >
        <p className={styles.count} role="status">
          {visiveis.length === 1 ? '1 passo a passo' : `${visiveis.length} passo a passo`}
        </p>

        {visiveis.length === 0 ? (
          <p className={styles.vazio}>Nada encontrado com esses filtros.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Título</th>
                  <th scope="col">Módulo</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Última alteração</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link to={`/topicos/${t.id}`} className={styles.titulo}>
                        {t.titulo}
                      </Link>
                      {t.tag && <span className={styles.tag}>{t.tag}</span>}
                    </td>
                    <td>{t.moduloTitulo}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          t.situacao === 'publicado' ? styles.publicado : styles.rascunho
                        }`}
                      >
                        {t.situacao === 'publicado' ? 'Publicado' : 'Rascunho'}
                      </span>
                    </td>
                    <td>
                      {formatDateTime(t.atualizadoEm)}
                      {t.atualizadoPor && (
                        <span className={styles.por}> por {t.atualizadoPor}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AsyncContent>
    </AdminShell>
  );
}
