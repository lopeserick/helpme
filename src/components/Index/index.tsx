import styles from './styles.module.css';

type Props = {
  items: string[];
  onItemClick?: (text: string, index: number) => void;
};

export default function Index({ items, onItemClick }: Props) {
  return (
    <section className={styles.container}>
      <h2 className={styles.title}>Rotinas mais acessadas</h2>

      <ul className={styles.list}>
        {items.map((item, i) => (
          <li
            key={i}
            className={styles.item}
            onClick={() => onItemClick?.(item, i)}
          >
            <span className={styles.badge}>{i + 1}</span>

            <span className={styles.text}>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
