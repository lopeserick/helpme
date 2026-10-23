import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { getJson } from '../../api/client';
import { registrarBuscaVazia } from '../../api/metricas';
import { parseSearch, type BuscaResposta, type SearchHit } from '../../api/helpCenter';
import styles from './styles.module.css';

const MAX_SUGGESTIONS = 6;
/** Espera a pessoa parar de digitar antes de consultar a API. */
const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;
/** Uma busca sem resultado só é registrada se a pessoa parar de digitar por este tempo. */
const REGISTRO_MS = 1500;

/** Resposta da busca, guardada junto do termo a que pertence. */
type Result = { term: string; hits: SearchHit[]; failed: boolean };

export default function SearchRoutines() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const term = query.trim();
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (term.length < MIN_CHARS) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      getJson<BuscaResposta>(
        `/api/busca?q=${encodeURIComponent(term)}&limite=${MAX_SUGGESTIONS}`,
        controller.signal,
      )
        .then((raw) => setResult({ term, hits: parseSearch(raw), failed: false }))
        .catch(() => {
          if (!controller.signal.aborted) {
            setResult({ term, hits: [], failed: true });
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  // Resposta de um termo anterior não vale: enquanto não chega a do termo
  // atual, a lista mostra "Buscando…".
  const current = result?.term === term ? result : null;
  const suggestions = current?.hits ?? [];
  const searching = current === null;

  const showList = open && term.length >= MIN_CHARS;

  // Registra o que foi procurado e não existe, para a equipe saber o que
  // escrever. Só termos "parados" (não cada letra digitada), uma vez cada.
  const registrados = useRef(new Set<string>());
  const semResultado =
    current !== null && !current.failed && current.hits.length === 0 && term.length >= 3;

  useEffect(() => {
    if (!semResultado || registrados.current.has(term)) return;
    const timer = window.setTimeout(() => {
      registrados.current.add(term);
      registrarBuscaVazia(term);
    }, REGISTRO_MS);
    return () => window.clearTimeout(timer);
  }, [semResultado, term]);

  function select(suggestion: SearchHit) {
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
          {searching ? (
            <li className={styles.empty} role="status">
              Buscando…
            </li>
          ) : current.failed ? (
            <li className={styles.empty} role="alert">
              Não foi possível buscar agora. Tente de novo em instantes.
            </li>
          ) : suggestions.length === 0 ? (
            <li className={styles.empty}>
              Nenhuma rotina encontrada para “{term}”.
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
