import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import styles from './styles.module.css';

type Props = {
  title: string;
  children?: ReactNode;
};

/** Estrutura comum das páginas internas: link de volta, título e conteúdo. */
export default function PageShell({ title, children }: Props) {
  return (
    <main className="container">
      <Link to="/" className={styles.back}>
        <ArrowLeft aria-hidden="true" />
        Voltar para a central de ajuda
      </Link>

      <h1 className={styles.title}>{title}</h1>

      {children ?? (
        <p className={styles.note}>
          Os artigos desta página ainda estão sendo escritos.
        </p>
      )}
    </main>
  );
}
