import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { Topic } from '../../data/helpCenter';
import styles from './styles.module.css';

type Props = {
  topics: Topic[];
};

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date);
}

/**
 * Lista de rotinas em tópicos recolhíveis. Cada tópico começa fechado,
 * mostrando só o nome; a seta abre o conteúdo (textos e imagens).
 *
 * Usa <details>/<summary> do próprio HTML: abre e fecha sem JavaScript e já
 * funciona com teclado e leitor de tela.
 *
 * Quando o endereço traz o id de um tópico (por exemplo /estoque#inventario,
 * como a busca da Home monta), esse tópico abre sozinho e fica destacado.
 */
export default function RoutineTopics({ topics }: Props) {
  const { hash } = useLocation();
  const refs = useRef(new Map<string, HTMLDetailsElement>());
  const [highlighted, setHighlighted] = useState<string | null>(null);

  useEffect(() => {
    const id = decodeURIComponent(hash.replace('#', ''));
    const target = id ? refs.current.get(id) : undefined;
    if (!target) return;

    target.open = true;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setHighlighted(id);

    const timer = window.setTimeout(() => setHighlighted(null), 2500);
    return () => window.clearTimeout(timer);
  }, [hash]);

  return (
    <div className={styles.list}>
      {topics.map((topic) => (
        <details
          key={topic.id}
          id={topic.id}
          ref={(node) => {
            if (node) refs.current.set(topic.id, node);
            else refs.current.delete(topic.id);
          }}
          className={`${styles.topic} ${
            highlighted === topic.id ? styles.highlighted : ''
          }`}
        >
          <summary className={styles.summary}>
            <span className={styles.heading}>
              {(topic.tag || topic.date) && (
                <span className={styles.meta}>
                  {topic.tag && <span className={styles.tag}>{topic.tag}</span>}
                  {topic.date && <span>{formatDate(topic.date)}</span>}
                </span>
              )}
              <span className={styles.title}>{topic.title}</span>
            </span>

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
