import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './styles.module.css';

type Props = {
  title: string;
  description: string;
  icon: ReactNode;
  to: string;
};

export default function CategoryCard({ title, description, icon, to }: Props) {
  return (
    <Link to={to}>
    <div className={styles.card}>
      <div className={styles.icon}> 
      {icon}
      </div>

      <h3>{title}</h3>
      <p>{description}</p>
    </div>
    </Link>
  );
}
