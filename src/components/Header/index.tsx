import styles from './styles.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className="container">
        <h1 className={styles.title}>Como podemos ajudar?</h1>
        <p className={styles.subtitle}>
          Pesquise na nossa base de conhecimento ou navegue por categorias
        </p>

        <div className={styles.search}>
          <input placeholder="Digite sua dúvida aqui..." />
        </div>
      </div>
    </header>
  );
}
