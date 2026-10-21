import { useState } from 'react';
import { Link } from 'react-router-dom';
import AdminShell from '../../../components/AdminShell';
import AsyncContent from '../../../components/AsyncContent';
import { parseMetricas, type Metricas as Dados } from '../../../api/admin';
import { useApi } from '../../../api/useApi';
import forms from '../forms.module.css';
import tabela from '../Topicos/styles.module.css';
import styles from './styles.module.css';

const PERIODOS = [7, 30, 90];

/**
 * O que os clientes procuram e não acham, o que mais abrem e o que acham
 * confuso. Nada aqui identifica quem acessou: são contagens por dia.
 */
export default function Metricas() {
  const [dias, setDias] = useState(30);
  const { data, error, loading, retry } = useApi<Dados, Dados>(
    `/api/admin/metricas?dias=${dias}`,
    parseMetricas,
  );

  return (
    <AdminShell
      title="Métricas"
      description="O que os clientes procuram, abrem e acham útil na central."
    >
      <label className={`${forms.field} ${styles.periodo}`}>
        <span className={forms.label}>Período</span>
        <select
          className={forms.select}
          value={dias}
          onChange={(e) => setDias(Number(e.target.value))}
        >
          {PERIODOS.map((p) => (
            <option key={p} value={p}>
              Últimos {p} dias
            </option>
          ))}
        </select>
      </label>

      <AsyncContent
        loading={loading}
        error={error}
        onRetry={retry}
        loadingLabel="Carregando as métricas…"
      >
        {data && (
          <div className={styles.secoes}>
            <section aria-labelledby="titulo-buscas">
              <h2 id="titulo-buscas" className={styles.subtitulo}>
                Buscas sem resultado
              </h2>
              <p className={forms.hint}>
                Termos que os clientes digitaram e não acharam nada. É a lista do que
                escrever a seguir.
              </p>
              {data.buscasSemResultado.length === 0 ? (
                <p className={styles.vazio}>Nenhuma busca sem resultado no período.</p>
              ) : (
                <div className={tabela.tableWrap}>
                  <table className={tabela.table}>
                    <thead>
                      <tr>
                        <th scope="col">Termo buscado</th>
                        <th scope="col" className={styles.numero}>
                          Vezes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.buscasSemResultado.map((b) => (
                        <tr key={b.termo}>
                          <td>{b.termo}</td>
                          <td className={styles.numero}>{b.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section aria-labelledby="titulo-avaliacoes">
              <h2 id="titulo-avaliacoes" className={styles.subtitulo}>
                "Esta resposta ajudou?"
              </h2>
              <p className={forms.hint}>
                Os que mais receberam "não" aparecem primeiro: são os que pedem revisão.
              </p>
              {data.avaliacoes.length === 0 ? (
                <p className={styles.vazio}>Nenhuma avaliação no período.</p>
              ) : (
                <div className={tabela.tableWrap}>
                  <table className={tabela.table}>
                    <thead>
                      <tr>
                        <th scope="col">Passo a passo</th>
                        <th scope="col" className={styles.numero}>
                          Sim
                        </th>
                        <th scope="col" className={styles.numero}>
                          Não
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.avaliacoes.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <Link to={`/admin/topicos/${a.id}`} className={tabela.titulo}>
                              {a.titulo}
                            </Link>
                            <span className={tabela.tag}>{a.moduloTitulo}</span>
                          </td>
                          <td className={styles.numero}>{a.ajudou}</td>
                          <td
                            className={`${styles.numero} ${
                              a.naoAjudou > a.ajudou ? styles.alerta : ''
                            }`}
                          >
                            {a.naoAjudou}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section aria-labelledby="titulo-acessos">
              <h2 id="titulo-acessos" className={styles.subtitulo}>
                Mais acessados
              </h2>
              <p className={forms.hint}>
                Quantas vezes cada passo a passo foi aberto. Os quatro primeiros dos últimos
                30 dias aparecem na Home.
              </p>
              {data.maisAcessados.length === 0 ? (
                <p className={styles.vazio}>Nenhum acesso registrado no período.</p>
              ) : (
                <div className={tabela.tableWrap}>
                  <table className={tabela.table}>
                    <thead>
                      <tr>
                        <th scope="col">Passo a passo</th>
                        <th scope="col" className={styles.numero}>
                          Aberturas
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.maisAcessados.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <Link to={`/admin/topicos/${a.id}`} className={tabela.titulo}>
                              {a.titulo}
                            </Link>
                            <span className={tabela.tag}>{a.moduloTitulo}</span>
                          </td>
                          <td className={styles.numero}>{a.acessos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </AsyncContent>
    </AdminShell>
  );
}
