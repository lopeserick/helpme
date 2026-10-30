import { Link } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import styles from './styles.module.css';

type Props = {
  /** 'cartao' na Home; 'linha' no fim das páginas de módulo. */
  formato?: 'cartao' | 'linha';
};

/** Convite para o cliente mandar uma sugestão. */
export default function ChamadaSugestao({ formato = 'cartao' }: Props) {
  if (formato === 'linha') {
    return (
      <p className={styles.linha}>
        Não achou o que procurava ou tem uma ideia para o sistema?{' '}
        <Link to="/sugestoes">Envie uma sugestão</Link>.
      </p>
    );
  }

  return (
    <Link to="/sugestoes" className={styles.cartao}>
      <span className={styles.icone}>
        <Lightbulb aria-hidden="true" />
      </span>
      <span className={styles.corpo}>
        <span className={styles.titulo}>Tem uma sugestão?</span>
        <span className={styles.texto}>
          Conte o que facilitaria o seu dia a dia no sistema. A equipe lê todas.
        </span>
      </span>
    </Link>
  );
}
