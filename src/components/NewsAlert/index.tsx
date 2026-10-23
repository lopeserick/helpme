import { Link } from 'react-router-dom';
import { ArrowRight, Megaphone } from 'lucide-react';
import { parseNews, pathFor, type NovidadesResposta } from '../../api/helpCenter';
import { useApi } from '../../api/useApi';
import styles from './styles.module.css';

/** Quantos avisos recentes a Home pede à API. */
const RECENT_LIMIT = 5;

/**
 * Alerta de implantações no ERP, exibido na Home. Mostra o aviso mais recente
 * e leva para a página de novidades, que é o único caminho até ela.
 *
 * Busca os próprios dados. Enquanto carrega, ou se a busca falhar, não mostra
 * nada: o alerta é um extra e não deve atrapalhar o resto da Home.
 */
export default function NewsAlert() {
  const { data: items } = useApi<
    NovidadesResposta,
    ReturnType<typeof parseNews>
  >(`/api/novidades?limite=${RECENT_LIMIT}`, parseNews);

  // A API já devolve do mais recente para o mais antigo.
  const latest = items?.[0];
  if (!items || !latest) return null;

  const others = items.length - 1;

  return (
    <Link to={pathFor('novidades')} className={styles.alert}>
      <span className={styles.icon}>
        <Megaphone aria-hidden="true" />
      </span>

      <span className={styles.body}>
        <span className={styles.label}>
          Novidades no Acesse
          {latest.tag && <span className={styles.tag}>{latest.tag}</span>}
        </span>

        <span className={styles.headline}>{latest.title}</span>

        {others > 0 && (
          <span className={styles.more}>
            {others === 1
              ? 'E mais 1 aviso recente'
              : `E mais ${others} avisos recentes`}
          </span>
        )}
      </span>

      <ArrowRight className={styles.arrow} aria-hidden="true" />
    </Link>
  );
}
