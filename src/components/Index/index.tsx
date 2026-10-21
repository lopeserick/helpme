import { Link } from 'react-router-dom';
import styles from './styles.module.css';

type Props = {
  items: { title: string; to: string }[];
};

/** Lista "Rotinas mais acessadas": cada item leva direto ao tópico. */
export default function Index({ items }: Props) {
  return (
    <section>
      <h2 className={styles.title}>Rotinas mais acessadas</h2>

      <ol className={styles.list}>
        {items.map((item, i) => (
          <li key={item.to}>
            <Link to={item.to} className={`${styles.item} ${styles.clickable}`}>
              <span className={styles.badge}>{i + 1}</span>
              <span className={styles.text}>{item.title}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
