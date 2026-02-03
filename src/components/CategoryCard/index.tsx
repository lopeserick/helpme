import styles from './styles.module.css';

type Props = {
  title: string;
  description: string;
};

export default function CategoryCard({ title, description }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.icon} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
