import { Search } from 'lucide-react';
import PageHeader from '../PageHeader';
import styles from './styles.module.css';

export default function Header() {
  return (
    <PageHeader>
      <h1 className={styles.title}>Como podemos ajudar?</h1>
      <p className={styles.subtitle}>
        Pesquise na nossa base de conhecimento ou navegue por categorias
      </p>

      <div className={styles.search} role="search">
        <Search className={styles.icon} aria-hidden="true" />
        <input
          type="search"
          aria-label="Pesquisar na base de conhecimento"
          placeholder="Digite sua dúvida aqui..."
        />
      </div>
    </PageHeader>
  );
}
