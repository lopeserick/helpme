import { Link } from 'react-router-dom';
import { ArrowRight, Megaphone } from 'lucide-react';
import { pages, type Topic } from '../../data/helpCenter';
import styles from './styles.module.css';

type Props = {
  items: Topic[];
};

/**
 * Alerta de implantações no ERP, exibido na Home. Mostra o aviso mais recente
 * e leva para a página de novidades, que é o único caminho até ela.
 */
export default function NewsAlert({ items }: Props) {
  if (items.length === 0) return null;

  // Mais recente primeiro, independente da ordem em que foram escritos.
  const [latest] = [...items].sort((a, b) =>
    (b.date ?? '').localeCompare(a.date ?? ''),
  );
  const others = items.length - 1;

  return (
    <Link to={pages.novidades.path} className={styles.alert}>
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
