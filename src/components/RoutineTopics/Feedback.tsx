import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { jaVotou, lembrarVoto, registrarAvaliacao } from '../../api/metricas';
import styles from './styles.module.css';

type Props = {
  moduleSlug: string;
  topicId: string;
};

/** "Esta resposta ajudou?" no fim de cada tópico. Um voto por tópico neste navegador. */
export default function Feedback({ moduleSlug, topicId }: Props) {
  const chave = `${moduleSlug}/${topicId}`;
  const [votou, setVotou] = useState(() => jaVotou(chave));

  function votar(ajudou: boolean) {
    registrarAvaliacao(moduleSlug, topicId, ajudou);
    lembrarVoto(chave);
    setVotou(true);
  }

  if (votou) {
    return (
      <p className={styles.feedback} role="status">
        Obrigado pela resposta!
      </p>
    );
  }

  return (
    <div className={styles.feedback}>
      <span>Esta resposta ajudou?</span>
      <button type="button" className={styles.voto} onClick={() => votar(true)}>
        <ThumbsUp aria-hidden="true" />
        Sim
      </button>
      <button type="button" className={styles.voto} onClick={() => votar(false)}>
        <ThumbsDown aria-hidden="true" />
        Não
      </button>
    </div>
  );
}
