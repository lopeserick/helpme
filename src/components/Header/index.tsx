import PageHeader from '../PageHeader';
import SearchRoutines from '../SearchRoutines';
import styles from './styles.module.css';

export default function Header() {
  return (
    <PageHeader>
      <h1 className={styles.title}>Como podemos ajudar?</h1>
      <p className={styles.subtitle}>
        Pesquise na nossa base de conhecimento ou navegue por categorias
      </p>

      <SearchRoutines />
    </PageHeader>
  );
}
