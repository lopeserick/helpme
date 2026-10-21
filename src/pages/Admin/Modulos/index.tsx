import { useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus } from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import AsyncContent from '../../../components/AsyncContent';
import CategoryIcon from '../../../components/CategoryIcon';
import {
  parseModulos,
  reordenarModulos,
  type ModuloCompleto,
  type ModulosAdminResposta,
} from '../../../api/admin';
import { useApi } from '../../../api/useApi';
import ModuloForm from './ModuloForm';
import forms from '../forms.module.css';
import styles from './styles.module.css';

/** null = formulário fechado; 'novo' = criando; número = editando esse módulo. */
type Edicao = null | 'novo' | number;

/**
 * Módulos da central: criar, editar, ocultar da Home e mudar a ordem. Não há
 * exclusão, para não deixar tópicos e links órfãos.
 */
export default function Modulos() {
  const lista = useApi<ModulosAdminResposta, ModuloCompleto[]>(
    '/api/admin/modulos',
    parseModulos,
  );

  // Cópia local para refletir as mudanças sem buscar tudo de novo.
  const [local, setLocal] = useState<ModuloCompleto[] | null>(null);
  const modulos = local ?? lista.data ?? [];

  const [edicao, setEdicao] = useState<Edicao>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function mover(indice: number, delta: -1 | 1) {
    const destino = indice + delta;
    if (destino < 0 || destino >= modulos.length) return;

    const nova = [...modulos];
    [nova[indice], nova[destino]] = [nova[destino], nova[indice]];

    setErro(null);
    setAviso(null);
    setOcupado(true);
    try {
      setLocal(await reordenarModulos(nova.map((m) => m.id)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível mudar a ordem.');
    } finally {
      setOcupado(false);
    }
  }

  function aoSalvar(salvo: ModuloCompleto, eraNovo: boolean) {
    setLocal((atual) => {
      const base = atual ?? lista.data ?? [];
      return eraNovo ? [...base, salvo] : base.map((m) => (m.id === salvo.id ? salvo : m));
    });
    setEdicao(null);
    setErro(null);
    setAviso(
      eraNovo
        ? `Módulo criado. A página já está em /${salvo.slug}.`
        : 'Módulo salvo.',
    );
  }

  const emEdicao = typeof edicao === 'number' ? modulos.find((m) => m.id === edicao) : undefined;

  return (
    <AdminShell
      title="Módulos"
      description="As categorias da central. Cada módulo tem sua página e pode aparecer na Home."
    >
      <div className={styles.topo}>
        <div aria-live="polite" className={styles.mensagens}>
          {erro && (
            <p className={forms.error} role="alert">
              {erro}
            </p>
          )}
          {aviso && <p className={forms.notice}>{aviso}</p>}
        </div>

        {edicao === null && (
          <button
            type="button"
            className={forms.primary}
            onClick={() => {
              setAviso(null);
              setEdicao('novo');
            }}
          >
            <Plus aria-hidden="true" />
            Novo módulo
          </button>
        )}
      </div>

      {edicao !== null && (
        <ModuloForm
          key={String(edicao)}
          modulo={emEdicao}
          onSalvo={aoSalvar}
          onCancelar={() => setEdicao(null)}
        />
      )}

      <AsyncContent
        loading={lista.loading}
        error={lista.error}
        onRetry={lista.retry}
        loadingLabel="Carregando os módulos…"
        empty={modulos.length === 0}
        emptyLabel="Nenhum módulo ainda."
      >
        <ol className={styles.lista}>
          {modulos.map((m, i) => (
            <li key={m.id} className={styles.item}>
              <span className={styles.icone}>
                <CategoryIcon name={m.icone} />
              </span>

              <div className={styles.corpo}>
                <div className={styles.linha}>
                  <span className={styles.titulo}>{m.titulo}</span>
                  <span className={m.visivel ? styles.naHome : styles.oculto}>
                    {m.visivel ? 'Na Home' : 'Oculto da Home'}
                  </span>
                </div>
                <p className={styles.descricao}>{m.descricao}</p>
                <p className={styles.meta}>
                  <a href={`/${m.slug}`} target="_blank" rel="noreferrer">
                    /{m.slug}
                    <ExternalLink aria-hidden="true" />
                  </a>
                  {' · '}
                  {m.topicos === 1 ? '1 passo a passo' : `${m.topicos} passo a passo`}
                </p>
              </div>

              <div className={styles.botoes}>
                <button
                  type="button"
                  className={styles.botaoIcone}
                  onClick={() => void mover(i, -1)}
                  disabled={ocupado || i === 0}
                  aria-label={`Subir ${m.titulo}`}
                >
                  <ArrowUp aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={styles.botaoIcone}
                  onClick={() => void mover(i, 1)}
                  disabled={ocupado || i === modulos.length - 1}
                  aria-label={`Descer ${m.titulo}`}
                >
                  <ArrowDown aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={forms.secondary}
                  onClick={() => {
                    setAviso(null);
                    setEdicao(m.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  aria-label={`Editar ${m.titulo}`}
                >
                  <Pencil aria-hidden="true" />
                  Editar
                </button>
              </div>
            </li>
          ))}
        </ol>
      </AsyncContent>
    </AdminShell>
  );
}
