import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '../PageHeader';
import styles from './styles.module.css';

type Props = {
  title: string;
  /** Linha curta abaixo do título, dentro da faixa verde. */
  description?: string;
  children?: ReactNode;
};

/** Estrutura comum das páginas internas: faixa verde no topo e conteúdo abaixo. */
export default function PageShell({ title, description, children }: Props) {
  return (
    <>
      <PageHeader size="compact">
        <Link to="/" className={styles.back}>
          <ArrowLeft aria-hidden="true" />
          Voltar para a central de ajuda
        </Link>

        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </PageHeader>

      <main className={`container ${styles.content}`}>
        {children ?? (
          <p className={styles.note}>
            Os artigos desta página ainda estão sendo escritos.
          </p>
        )}
      </main>
    </>
  );
}
