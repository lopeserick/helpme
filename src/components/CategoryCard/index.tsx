import { ReactNode } from 'react';
import styles from './styles.module.css';

type Props = {
  title: string;
  description: string;
  icon: ReactNode;
};

export default function CategoryCard({ title, description, icon }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.icon}> 
      {icon}
      </div>

      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
