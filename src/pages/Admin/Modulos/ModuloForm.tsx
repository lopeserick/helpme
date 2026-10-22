import { useState, type FormEvent } from 'react';
import CategoryIcon from '../../../components/CategoryIcon';
import {
  criarModulo,
  ICONES,
  salvarModulo,
  type ModuloCompleto,
} from '../../../api/admin';
import forms from '../forms.module.css';
import styles from './styles.module.css';

type Props = {
  /** Presente ao editar; ausente ao criar. */
  modulo?: ModuloCompleto;
  onSalvo: (modulo: ModuloCompleto, eraNovo: boolean) => void;
  onCancelar: () => void;
};

export default function ModuloForm({ modulo, onSalvo, onCancelar }: Props) {
  const [titulo, setTitulo] = useState(modulo?.titulo ?? '');
  const [descricao, setDescricao] = useState(modulo?.descricao ?? '');
  const [subtitulo, setSubtitulo] = useState(modulo?.subtitulo ?? '');
  const [icone, setIcone] = useState(modulo?.icone ?? 'book');
  const [visivel, setVisivel] = useState(modulo?.visivel ?? true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    if (titulo.trim().length < 2) return setErro('O título precisa ter ao menos 2 caracteres.');
    if (descricao.trim().length < 3) {
      return setErro('Escreva uma descrição curta para o cartão da Home.');
    }

    const dados = {
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      subtitulo: subtitulo.trim() || null,
      icone,
      visivel,
    };

    setEnviando(true);
    try {
      const salvo = modulo ? await salvarModulo(modulo.id, dados) : await criarModulo(dados);
      onSalvo(salvo, !modulo);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o módulo.');
      setEnviando(false);
    }
  }

  return (
    <section className={`${forms.card} ${styles.formulario}`} aria-label="Dados do módulo">
      <h2 className={styles.subtitulo}>{modulo ? `Editar ${modulo.titulo}` : 'Novo módulo'}</h2>

      <form className={forms.form} onSubmit={handleSubmit} noValidate lang="pt-BR" spellCheck>
        {erro && (
          <p className={forms.error} role="alert">
            {erro}
          </p>
        )}

        <label className={forms.field}>
          <span className={forms.label}>Título</span>
          <input
            className={forms.input}
            value={titulo}
            maxLength={80}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: NFC-e"
            autoFocus
          />
          <span className={forms.hint}>
            {modulo
              ? `O endereço continua /${modulo.slug}, mesmo trocando o título.`
              : 'O endereço da página sai do título e não muda depois.'}
          </span>
        </label>

        <label className={forms.field}>
          <span className={forms.label}>Descrição (cartão da Home)</span>
          <input
            className={forms.input}
            value={descricao}
            maxLength={160}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: Cupom fiscal eletrônico"
          />
        </label>

        <label className={forms.field}>
          <span className={forms.label}>Subtítulo da página (opcional)</span>
          <input
            className={forms.input}
            value={subtitulo}
            maxLength={240}
            onChange={(e) => setSubtitulo(e.target.value)}
          />
          <span className={forms.hint}>Aparece abaixo do título. Vazio: usa a descrição.</span>
        </label>

        <fieldset className={styles.icones}>
          <legend className={forms.label}>Ícone</legend>
          {ICONES.map((i) => (
            <label
              key={i.nome}
              className={`${styles.opcaoIcone} ${icone === i.nome ? styles.escolhido : ''}`}
            >
              <input
                type="radio"
                name="icone"
                value={i.nome}
                checked={icone === i.nome}
                onChange={() => setIcone(i.nome)}
              />
              <CategoryIcon name={i.nome} />
              <span>{i.rotulo}</span>
            </label>
          ))}
        </fieldset>

        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={visivel}
            onChange={(e) => setVisivel(e.target.checked)}
          />
          Mostrar na Home
        </label>
        <span className={forms.hint}>
          Oculto, o módulo continua com página e endereço, mas não aparece como categoria
          (como as Novidades).
        </span>

        <div className={forms.actions}>
          <button type="submit" className={forms.primary} disabled={enviando}>
            {enviando ? 'Salvando…' : modulo ? 'Salvar módulo' : 'Criar módulo'}
          </button>
          <button type="button" className={forms.secondary} onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}
