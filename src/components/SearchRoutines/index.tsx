import { useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { pages, topicsByPage, type PageKey } from '../../data/helpCenter';
import styles from './styles.module.css';

type Suggestion = {
  /** Chave única na lista de sugestões: página + tópico. */
  key: string;
  /** Nome da rotina. */
  title: string;
  /** Nome da página onde a rotina está, mostrado como contexto. */
  pageTitle: string;
  /** Endereço com o tópico em destaque, por exemplo /estoque#inventario. */
  to: string;
};

const MAX_SUGGESTIONS = 6;

/** Tira acentos e caixa, para "fiscal" encontrar "Fiscal" e "sintegra", "Sintegra". */
function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Monta a lista de rotinas pesquisáveis a partir dos dados da central. */
function buildIndex(): Suggestion[] {
  return (Object.keys(topicsByPage) as PageKey[]).flatMap((pageKey) =>
    topicsByPage[pageKey].map((topic) => ({
      key: `${pageKey}:${topic.id}`,
      title: topic.title,
      pageTitle: pages[pageKey].title,
      to: `${pages[pageKey].path}#${topic.id}`,
    })),
  );
}

export default function SearchRoutines() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const index = useMemo(() => buildIndex(), []);

  const suggestions = useMemo(() => {
    const term = normalize(query);
    if (term.length < 2) return [];

    return index
      .filter(
        (item) =>
          normalize(item.title).includes(term) ||
          normalize(item.pageTitle).includes(term),
      )
      .slice(0, MAX_SUGGESTIONS);
  }, [index, query]);

  const showList = open && query.trim().length >= 2;

  function select(suggestion: Suggestion) {
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
    navigate(suggestion.to);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }

    if (!showList || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      select(suggestions[active] ?? suggestions[0]);
    }
  }

  return (
    <div
      className={styles.search}
      role="search"
      // Fecha a lista ao sair do campo, mas não ao clicar numa sugestão.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setOpen(false);
        }
      }}
    >
      <Search className={styles.icon} aria-hidden="true" />

      <input
        ref={inputRef}
        type="search"
        value={query}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && suggestions.length > 0
            ? `${listId}-${active}`
            : undefined
        }
        aria-label="Pesquisar rotinas na base de conhecimento"
        placeholder="Digite sua dúvida aqui..."
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {showList && (
        <ul className={styles.list} id={listId} role="listbox">
          {suggestions.length === 0 ? (
            <li className={styles.empty}>
              Nenhuma rotina encontrada para “{query.trim()}”.
            </li>
          ) : (
            suggestions.map((suggestion, i) => (
              <li key={suggestion.key} role="presentation">
                <button
                  type="button"
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={`${styles.option} ${i === active ? styles.active : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => select(suggestion)}
                >
                  <span className={styles.optionTitle}>{suggestion.title}</span>
                  <span className={styles.optionPage}>
                    {suggestion.pageTitle}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
