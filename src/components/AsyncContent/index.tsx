import type { ReactNode } from 'react';
import styles from './styles.module.css';

type Props = {
  loading: boolean;
  error?: Error;
  /** Chamada pelo botão "Tentar de novo" quando a busca falha. */
  onRetry: () => void;
  /** Texto lido por leitor de tela e mostrado enquanto carrega. */
  loadingLabel?: string;
  /** Quando verdadeiro, mostra `emptyLabel` no lugar do conteúdo. */
  empty?: boolean;
  emptyLabel?: string;
  children: ReactNode;
};

/**
 * Cuida dos três estados de qualquer conteúdo vindo da API: carregando, erro
 * (com botão para tentar de novo) e vazio. O conteúdo só aparece quando existe.
 */
export default function AsyncContent({
  loading,
  error,
  onRetry,
  loadingLabel = 'Carregando…',
  empty = false,
  emptyLabel = 'Ainda não há conteúdo aqui.',
  children,
}: Props) {
  if (loading) {
    return (
      <p className={styles.state} role="status">
        {loadingLabel}
      </p>
    );
  }

  if (error) {
    return (
      <div className={styles.error} role="alert">
        <p>{error.message}</p>
        <button type="button" className={styles.retry} onClick={onRetry}>
          Tentar de novo
        </button>
      </div>
    );
  }

  if (empty) return <p className={styles.state}>{emptyLabel}</p>;

  return <>{children}</>;
}
