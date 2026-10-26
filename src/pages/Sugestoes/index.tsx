import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';
import AsyncContent from '../../components/AsyncContent';
import PageShell from '../../components/PageShell';
import {
  enviarSugestao,
  MAX_IMAGENS_SUGESTAO,
  parseDisponivel,
  TAMANHO_MAXIMO_IMAGEM_SUGESTAO,
  TIPOS_IMAGEM_SUGESTAO,
} from '../../api/sugestoes';
import { useApi } from '../../api/useApi';
import forms from '../Admin/forms.module.css';
import styles from './styles.module.css';

const VAZIO = { nome: '', email: '', empresa: '', titulo: '', texto: '' };

/**
 * Página de sugestões: o cliente conta o que melhoraria no sistema. Vai por
 * e-mail para a equipe e fica guardada no painel.
 */
export default function Sugestoes() {
  const disponivel = useApi<{ disponivel: boolean }, boolean>(
    '/api/sugestoes/disponivel',
    parseDisponivel,
  );

  const [campos, setCampos] = useState(VAZIO);
  const [imagens, setImagens] = useState<File[]>([]);
  const [armadilha, setArmadilha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const seletor = useRef<HTMLInputElement>(null);

  const mudar = (campo: keyof typeof VAZIO) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setCampos((atual) => ({ ...atual, [campo]: e.target.value }));

  function aoEscolherImagens(event: ChangeEvent<HTMLInputElement>) {
    const escolhidas = Array.from(event.target.files ?? []);
    event.target.value = '';
    setErro(null);

    for (const arquivo of escolhidas) {
      if (!TIPOS_IMAGEM_SUGESTAO.includes(arquivo.type)) {
        return setErro(`"${arquivo.name}" não é PNG, JPEG ou WebP.`);
      }
      if (arquivo.size > TAMANHO_MAXIMO_IMAGEM_SUGESTAO) {
        return setErro(`"${arquivo.name}" passa de 5 MB.`);
      }
    }
    const todas = [...imagens, ...escolhidas];
    if (todas.length > MAX_IMAGENS_SUGESTAO) {
      return setErro(`Envie no máximo ${MAX_IMAGENS_SUGESTAO} imagens.`);
    }
    setImagens(todas);
  }

  function validar() {
    if (campos.nome.trim().length < 2) return 'Informe seu nome.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campos.email.trim())) return 'Informe um e-mail válido.';
    if (campos.empresa.trim().length < 2) return 'Informe a empresa.';
    if (campos.titulo.trim().length < 3) return 'Dê um título à sugestão.';
    if (campos.texto.trim().length < 10) return 'Conte um pouco mais sobre a sugestão.';
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problema = validar();
    if (problema) return setErro(problema);

    setErro(null);
    setEnviando(true);
    try {
      await enviarSugestao({ ...campos, imagens, site: armadilha });
      setEnviada(true);
      setCampos(VAZIO);
      setImagens([]);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <PageShell
      title="Envie uma sugestão"
      description="Conte o que facilitaria o seu dia a dia no sistema. A equipe lê todas as sugestões."
    >
      <AsyncContent
        loading={disponivel.loading}
        error={disponivel.error}
        onRetry={disponivel.retry}
        loadingLabel="Carregando…"
        empty={disponivel.data === false}
        emptyLabel="O envio de sugestões está indisponível no momento. Tente mais tarde."
      >
        {enviada ? (
          <div className={`${forms.card} ${styles.sucesso}`} role="status">
            <h2 className={styles.subtitulo}>Obrigado! Sua sugestão foi enviada.</h2>
            <p>A equipe vai ler e, se precisar, responde no e-mail que você informou.</p>
            <div className={forms.actions}>
              <button type="button" className={forms.secondary} onClick={() => setEnviada(false)}>
                Enviar outra sugestão
              </button>
            </div>
          </div>
        ) : (
          <form className={`${forms.card} ${forms.form} ${styles.formulario}`} onSubmit={handleSubmit} noValidate>
            {erro && (
              <p className={forms.error} role="alert">
                {erro}
              </p>
            )}

            <div className={styles.duasColunas}>
              <label className={forms.field}>
                <span className={forms.label}>Seu nome</span>
                <input
                  className={forms.input}
                  autoComplete="name"
                  maxLength={120}
                  value={campos.nome}
                  onChange={mudar('nome')}
                  required
                />
              </label>
              <label className={forms.field}>
                <span className={forms.label}>Seu e-mail</span>
                <input
                  className={forms.input}
                  type="email"
                  autoComplete="email"
                  maxLength={200}
                  value={campos.email}
                  onChange={mudar('email')}
                  required
                />
              </label>
            </div>

            <label className={forms.field}>
              <span className={forms.label}>Empresa</span>
              <input
                className={forms.input}
                autoComplete="organization"
                maxLength={120}
                value={campos.empresa}
                onChange={mudar('empresa')}
                required
              />
            </label>

            <label className={forms.field}>
              <span className={forms.label}>Título da sugestão</span>
              <input
                className={forms.input}
                maxLength={120}
                placeholder="Ex.: Filtrar o relatório de vendas por vendedor"
                value={campos.titulo}
                onChange={mudar('titulo')}
                required
              />
            </label>

            <label className={forms.field}>
              <span className={forms.label}>Sua sugestão</span>
              <textarea
                className={`${forms.textarea} ${styles.texto}`}
                maxLength={5000}
                value={campos.texto}
                onChange={mudar('texto')}
                required
              />
              <span className={forms.hint}>{campos.texto.length} de 5.000 caracteres</span>
            </label>

            <div className={forms.field}>
              <span className={forms.label}>Imagens (opcional)</span>
              {imagens.length > 0 && (
                <ul className={styles.imagens}>
                  {imagens.map((img, i) => (
                    <li key={`${img.name}-${i}`}>
                      <span>{img.name}</span>
                      <button
                        type="button"
                        className={styles.remover}
                        onClick={() => setImagens((atual) => atual.filter((_, j) => j !== i))}
                        aria-label={`Remover ${img.name}`}
                      >
                        <X aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {imagens.length < MAX_IMAGENS_SUGESTAO && (
                <div>
                  <button
                    type="button"
                    className={forms.secondary}
                    onClick={() => seletor.current?.click()}
                  >
                    <ImagePlus aria-hidden="true" />
                    Adicionar imagem
                  </button>
                </div>
              )}
              <input
                ref={seletor}
                type="file"
                accept={TIPOS_IMAGEM_SUGESTAO.join(',')}
                multiple
                onChange={aoEscolherImagens}
                className={styles.escondido}
                aria-label="Escolher imagens"
                tabIndex={-1}
              />
              <span className={forms.hint}>
                Até {MAX_IMAGENS_SUGESTAO} imagens PNG, JPEG ou WebP, de até 5 MB cada. Um print da
                tela ajuda muito.
              </span>
            </div>

            {/* Armadilha para robôs: invisível para pessoas e para leitores de tela. */}
            <div className={styles.armadilha} aria-hidden="true">
              <label>
                Site
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={armadilha}
                  onChange={(e) => setArmadilha(e.target.value)}
                />
              </label>
            </div>

            <p className={forms.hint}>
              Usamos seu nome, e-mail e empresa só para responder a esta sugestão.
            </p>

            <div className={forms.actions}>
              <button type="submit" className={forms.primary} disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviar sugestão'}
              </button>
            </div>
          </form>
        )}
      </AsyncContent>
    </PageShell>
  );
}
