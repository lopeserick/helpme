import { ChevronDown } from 'lucide-react';
import type { Topic } from '../../data/helpCenter';
import styles from './styles.module.css';

type Props = {
  topics: Topic[];
};

/**
 * Lista de rotinas em tópicos recolhíveis. Cada tópico começa fechado,
 * mostrando só o nome; a seta abre o conteúdo (textos e imagens).
 *
 * Usa <details>/<summary> do próprio HTML: abre e fecha sem JavaScript e já
 * funciona com teclado e leitor de tela.
 */
export default function RoutineTopics({ topics }: Props) {
  return (
    <div className={styles.list}>
      {topics.map((topic) => (
        <details key={topic.id} className={styles.topic}>
          <summary className={styles.summary}>
            <span className={styles.title}>{topic.title}</span>
            <ChevronDown className={styles.chevron} aria-hidden="true" />
          </summary>

          <div className={styles.content}>
            {topic.content.map((block, i) =>
              block.type === 'text' ? (
                <p key={i}>{block.text}</p>
              ) : (
                <figure key={i} className={styles.figure}>
                  <img src={block.src} alt={block.alt} loading="lazy" />
                  {block.caption && <figcaption>{block.caption}</figcaption>}
                </figure>
              ),
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
