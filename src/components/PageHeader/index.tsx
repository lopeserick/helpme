import type { ReactNode } from 'react';
import styles from './styles.module.css';

type Props = {
  /** 'hero' é o topo alto da Home; 'compact' é o das páginas internas. */
  size?: 'hero' | 'compact';
  children: ReactNode;
};

/** Faixa verde do topo, usada pela Home e pelas páginas internas. */
export default function PageHeader({ size = 'hero', children }: Props) {
  return (
    <header className={`${styles.band} ${styles[size]}`}>
      <div className={`container ${styles.inner}`}>{children}</div>
    </header>
  );
}
