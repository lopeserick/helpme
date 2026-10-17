import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import styles from './styles.module.css';

type Props = {
  title: string;
  description: string;
  icon: ReactNode;
  to: string;
};

export default function CategoryCard({ title, description, icon, to }: Props) {
  return (
    <Link to={to} className={styles.row}>
      <span className={styles.icon}>{icon}</span>

      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        <span className={styles.description}>{description}</span>
      </span>

      <ChevronRight className={styles.chevron} aria-hidden="true" />
    </Link>
  );
}
