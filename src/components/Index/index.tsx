import styles from './styles.module.css';

type Props = {
  items: string[];
  onItemClick?: (text: string, index: number) => void;
};

export default function Index({ items, onItemClick }: Props) {
  return (
    <section>
      <h2 className={styles.title}>Rotinas mais acessadas</h2>

      <ol className={styles.list}>
        {items.map((item, i) => {
          const content = (
            <>
              <span className={styles.badge}>{i + 1}</span>
              <span className={styles.text}>{item}</span>
            </>
          );

          return (
            <li key={item}>
              {onItemClick ? (
                <button
                  type="button"
                  className={`${styles.item} ${styles.clickable}`}
                  onClick={() => onItemClick(item, i)}
                >
                  {content}
                </button>
              ) : (
                <div className={styles.item}>{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
