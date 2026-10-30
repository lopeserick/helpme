import { useState } from 'react';
import AdminShell from '../../../components/AdminShell';
import AsyncContent from '../../../components/AsyncContent';
import { marcarSugestao, parseSugestoes, type SugestaoRecebida } from '../../../api/admin';
import { useApi } from '../../../api/useApi';
import { formatDateTime } from '../../../lib/texto';
import forms from '../forms.module.css';
import styles from './styles.module.css';

type Filtro = 'todas' | 'nao-lidas';

/**
 * Sugestões enviadas pelos clientes. Também chegam por e-mail; aqui ficam
 * guardadas mesmo se o e-mail falhar, e a equipe marca o que já leu.
 */
export default function Sugestoes() {
  const { data, error, loading, retry } = useApi<
    { sugestoes: SugestaoRecebida[] },
    SugestaoRecebida[]
  >('/api/admin/sugestoes', parseSugestoes);

  const [filtro, setFiltro] = useState<Filtro>('nao-lidas');
  const [lidas, setLidas] = useState<Record<number, boolean>>({});
  const [erro, setErro] = useState<string | null>(null);

  const estaLida = (s: SugestaoRecebida) => lidas[s.id] ?? s.lida;
  const visiveis = (data ?? []).filter((s) => filtro === 'todas' || !estaLida(s));
  const naoLidas = (data ?? []).filter((s) => !estaLida(s)).length;

  async function alternar(s: SugestaoRecebida) {
    const nova = !estaLida(s);
    setErro(null);
    setLidas((atual) => ({ ...atual, [s.id]: nova }));
    try {
      await marcarSugestao(s.id, nova);
    } catch (e) {
      setLidas((atual) => ({ ...atual, [s.id]: !nova }));
      setErro(e instanceof Error ? e.message : 'Não foi possível marcar.');
    }
  }

  return (
    <AdminShell
      title="Sugestões dos clientes"
      description="O que os clientes enviaram pela página de sugestões. Cada uma também chega por e-mail."
    >
      <div className={styles.topo}>
        <p className={styles.resumo} role="status">
          {naoLidas === 0
            ? 'Nenhuma sugestão por ler.'
            : `${naoLidas} ${naoLidas === 1 ? 'sugestão por ler' : 'sugestões por ler'}.`}
        </p>
        <label className={`${forms.field} ${styles.filtro}`}>
          <span className={forms.label}>Mostrar</span>
          <select
            className={forms.select}
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as Filtro)}
          >
            <option value="nao-lidas">Só as não lidas</option>
            <option value="todas">Todas</option>
          </select>
        </label>
      </div>

      {erro && (
        <p className={forms.error} role="alert">
          {erro}
        </p>
      )}

      <AsyncContent
        loading={loading}
        error={error}
        onRetry={retry}
        loadingLabel="Carregando as sugestões…"
        empty={data?.length === 0}
        emptyLabel="Nenhuma sugestão recebida ainda."
      >
        {visiveis.length === 0 ? (
          <p className={styles.vazio}>Tudo lido por aqui.</p>
        ) : (
          <ul className={styles.lista}>
            {visiveis.map((s) => (
              <li key={s.id} className={`${styles.item} ${estaLida(s) ? styles.lida : ''}`}>
                <div className={styles.cabecalho}>
                  <div>
                    <h2 className={styles.titulo}>{s.titulo}</h2>
                    <p className={styles.quem}>
                      {s.nome} · {s.empresa} ·{' '}
                      <a href={`mailto:${s.email}?subject=${encodeURIComponent(`Re: ${s.titulo}`)}`}>
                        {s.email}
                      </a>
                    </p>
                  </div>
                  <button type="button" className={forms.secondary} onClick={() => void alternar(s)}>
                    {estaLida(s) ? 'Marcar como não lida' : 'Marcar como lida'}
                  </button>
                </div>
                <p className={styles.texto}>{s.texto}</p>
                <p className={styles.meta}>
                  #{s.id} · {formatDateTime(s.criadaEm)}
                  {s.imagens > 0 && ` · ${s.imagens} ${s.imagens === 1 ? 'imagem' : 'imagens'} (no e-mail)`}
                  {s.enviadaEm ? (
                    ' · e-mail enviado'
                  ) : (
                    <span className={styles.falha}>
                      {' '}
                      · e-mail NÃO enviado{s.erroEnvio ? `: ${s.erroEnvio}` : ''}
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </AsyncContent>
    </AdminShell>
  );
}
