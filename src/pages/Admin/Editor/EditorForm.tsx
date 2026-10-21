import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Plus, Trash2 } from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import RoutineTopics from '../../../components/RoutineTopics';
import {
  criarTopico,
  despublicarTopico,
  enviarImagem,
  excluirTopico,
  publicarTopico,
  salvarTopico,
  TAMANHO_MAXIMO_IMAGEM,
  TIPOS_DE_IMAGEM,
  type BlocoAdmin,
  type ModuloResumo,
  type TopicoCompleto,
  type TopicoEntrada,
} from '../../../api/admin';
import { mediaUrl } from '../../../api/client';
import type { Topic, TopicBlock } from '../../../api/helpCenter';
import forms from '../forms.module.css';
import styles from './styles.module.css';

type Props = {
  /** Presente ao editar; ausente ao criar. */
  topico?: TopicoCompleto;
  /** Módulos para o seletor (só usados ao criar). */
  modulos: ModuloResumo[];
};

/** Um bloco no editor, com uma chave só para o React não confundir os blocos ao reordenar. */
type BlocoEdicao = BlocoAdmin & { chave: number };

let proximaChave = 0;
const comChave = (b: BlocoAdmin): BlocoEdicao => ({ ...b, chave: ++proximaChave });

const SUGESTOES_DE_ROTULO = ['Rotina nova', 'Programa novo', 'Validação fiscal'];

function semChave(b: BlocoEdicao): BlocoAdmin {
  return b.tipo === 'texto'
    ? { tipo: 'texto', texto: b.texto }
    : { tipo: 'imagem', imagemId: b.imagemId, alt: b.alt, legenda: b.legenda, url: b.url };
}

/** Resumo do que está no formulário, para saber se há alteração não salva. */
function assinatura(moduloId: number | '', titulo: string, tag: string, blocos: BlocoEdicao[]) {
  return JSON.stringify([moduloId, titulo, tag, blocos.map(semChave)]);
}

function horaAtual() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Formulário de um passo a passo: módulo, título, rótulo e a lista de blocos.
 * Simples de propósito: cada bloco de texto é um parágrafo, e a ordem se muda
 * com os botões de subir e descer.
 */
export default function EditorForm({ topico: inicial, modulos }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const avisoInicial = (location.state as { aviso?: string } | null)?.aviso ?? null;

  const [topico, setTopico] = useState<TopicoCompleto | undefined>(inicial);
  const [moduloId, setModuloId] = useState<number | ''>(inicial?.moduloId ?? '');
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '');
  const [tag, setTag] = useState(inicial?.tag ?? '');
  const [blocos, setBlocos] = useState<BlocoEdicao[]>(() =>
    (inicial?.blocos ?? [{ tipo: 'texto', texto: '' } as BlocoAdmin]).map(comChave),
  );

  const [salvo, setSalvo] = useState(() =>
    assinatura(
      inicial?.moduloId ?? '',
      inicial?.titulo ?? '',
      inicial?.tag ?? '',
      (inicial?.blocos ?? [{ tipo: 'texto', texto: '' } as BlocoAdmin]).map(comChave),
    ),
  );
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(avisoInicial);
  const [previa, setPrevia] = useState(false);
  const seletorDeImagem = useRef<HTMLInputElement>(null);

  const sujo = assinatura(moduloId, titulo, tag, blocos) !== salvo;
  const publicado = topico?.situacao === 'publicado';

  // Avisa antes de fechar a aba com alterações não salvas.
  useEffect(() => {
    if (!sujo) return;
    const avisar = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [sujo]);

  function aoVoltar(event: MouseEvent<HTMLAnchorElement>) {
    if (sujo && !window.confirm('Há alterações que não foram salvas. Sair mesmo assim?')) {
      event.preventDefault();
    }
  }

  /* ---------------------------- edição dos blocos --------------------------- */

  function alterarBloco(chave: number, mudanca: Partial<BlocoEdicao>) {
    setBlocos((atual) =>
      atual.map((b) => (b.chave === chave ? ({ ...b, ...mudanca } as BlocoEdicao) : b)),
    );
  }

  function mover(indice: number, delta: -1 | 1) {
    setBlocos((atual) => {
      const destino = indice + delta;
      if (destino < 0 || destino >= atual.length) return atual;
      const copia = [...atual];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  }

  function remover(chave: number) {
    setBlocos((atual) => atual.filter((b) => b.chave !== chave));
  }

  function adicionarTexto() {
    setBlocos((atual) => [...atual, comChave({ tipo: 'texto', texto: '' })]);
  }

  /** Envia a imagem escolhida e a acrescenta no fim, para a pessoa descrevê-la. */
  async function aoEscolherImagem(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = ''; // permite escolher o mesmo arquivo de novo depois
    if (!arquivo) return;

    setErro(null);
    setAviso(null);

    if (!TIPOS_DE_IMAGEM.includes(arquivo.type)) {
      setErro('Escolha uma imagem PNG, JPEG ou WebP.');
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) {
      setErro('A imagem é grande demais. O limite é 5 MB.');
      return;
    }

    setOcupado(true);
    try {
      const enviada = await enviarImagem(arquivo);
      setBlocos((atual) => [
        ...atual,
        comChave({ tipo: 'imagem', imagemId: enviada.id, alt: '', legenda: '', url: enviada.url }),
      ]);
      setAviso('Imagem enviada. Descreva o que ela mostra e salve o passo a passo.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar a imagem.');
    } finally {
      setOcupado(false);
    }
  }

  /* --------------------------------- ações ---------------------------------- */

  /** Confere o formulário. Devolve a mensagem do primeiro problema, ou nada. */
  function validar(): string | null {
    if (!topico && moduloId === '') return 'Escolha o módulo.';
    if (titulo.trim().length < 3) return 'O título precisa ter ao menos 3 caracteres.';

    for (const [i, b] of blocos.entries()) {
      if (b.tipo === 'texto' && !b.texto.trim()) {
        return `O bloco ${i + 1} está vazio. Escreva o texto ou remova o bloco.`;
      }
      if (b.tipo === 'imagem' && !b.alt.trim()) {
        return `Descreva a imagem do bloco ${i + 1}: o texto alternativo é obrigatório.`;
      }
    }
    return null;
  }

  function entrada(): TopicoEntrada {
    return {
      titulo: titulo.trim(),
      tag: tag.trim() || null,
      blocos: blocos.map((b) => {
        const limpo = semChave(b);
        return limpo.tipo === 'texto' ? { ...limpo, texto: limpo.texto.trim() } : limpo;
      }),
    };
  }

  /** Salva (criando se for novo) e devolve o tópico gravado. */
  async function gravar(): Promise<TopicoCompleto> {
    const dados = entrada();
    const gravado = topico
      ? await salvarTopico(topico.id, dados)
      : await criarTopico(moduloId as number, dados);

    setTopico(gravado);
    setSalvo(assinatura(moduloId, titulo, tag, blocos));
    return gravado;
  }

  /** Roda uma ação do painel cuidando de "ocupado", erro e validação. */
  async function executar(
    acao: (() => Promise<void>) | null,
    { validarAntes }: { validarAntes: boolean },
  ) {
    setErro(null);
    setAviso(null);

    if (validarAntes) {
      const problema = validar();
      if (problema) {
        setErro(problema);
        return;
      }
    }

    setOcupado(true);
    try {
      await acao?.();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      setOcupado(false);
    }
  }

  function irParaOEditor(id: number, mensagem: string) {
    // Troca /novo por /:id; o editor recarrega o tópico já gravado.
    navigate(`/admin/topicos/${id}`, { replace: true, state: { aviso: mensagem } });
  }

  const salvar = () =>
    executar(
      async () => {
        const eraNovo = !topico;
        const gravado = await gravar();
        if (eraNovo) irParaOEditor(gravado.id, 'Rascunho criado.');
        else setAviso(`Salvo às ${horaAtual()}.`);
      },
      { validarAntes: true },
    );

  const publicar = () =>
    executar(
      async () => {
        const eraNovo = !topico;
        const gravado = await gravar();
        const noAr = await publicarTopico(gravado.id);
        setTopico(noAr);
        if (eraNovo) irParaOEditor(noAr.id, 'Publicado no site.');
        else setAviso(`Publicado no site às ${horaAtual()}.`);
      },
      { validarAntes: true },
    );

  const despublicar = () =>
    executar(
      async () => {
        if (!topico) return;
        setTopico(await despublicarTopico(topico.id));
        setAviso('Tirado do site. Voltou a ser rascunho.');
      },
      { validarAntes: false },
    );

  const excluir = () => {
    if (!topico) return;
    const confirmado = window.confirm(
      'Excluir este passo a passo? Ele sai do site e da lista do painel.',
    );
    if (!confirmado) return;

    return executar(
      async () => {
        await excluirTopico(topico.id);
        navigate('/admin', { replace: true, state: { aviso: 'Passo a passo excluído.' } });
      },
      { validarAntes: false },
    );
  };

  /* -------------------------------- prévia ---------------------------------- */

  const topicoDePrevia: Topic = {
    id: topico?.slug ?? 'previa',
    title: titulo.trim() || 'Sem título',
    tag: tag.trim() || undefined,
    content: blocos.flatMap<TopicBlock>((b) => {
      if (b.tipo === 'texto') return b.texto.trim() ? [{ type: 'text', text: b.texto }] : [];
      if (!b.url) return [];
      return [
        { type: 'image', src: mediaUrl(b.url), alt: b.alt, caption: b.legenda || undefined },
      ];
    }),
  };

  return (
    <AdminShell
      title={topico ? 'Editar passo a passo' : 'Novo passo a passo'}
      back={{ to: '/admin', label: 'Voltar para a lista' }}
      onBack={aoVoltar}
    >
      <form
        className={styles.layout}
        onSubmit={(event) => {
          event.preventDefault();
          void salvar();
        }}
        noValidate
      >
        <section className={forms.card} aria-label="Dados do passo a passo">
          <div className={forms.form}>
            <label className={forms.field}>
              <span className={forms.label}>Módulo</span>
              {topico ? (
                <input className={forms.input} value={topico.moduloTitulo} disabled readOnly />
              ) : (
                <select
                  className={forms.select}
                  value={moduloId}
                  onChange={(e) => setModuloId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Escolha o módulo</option>
                  {modulos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.titulo}
                    </option>
                  ))}
                </select>
              )}
              {topico && (
                <span className={forms.hint}>O módulo não muda depois de criado.</span>
              )}
            </label>

            <label className={forms.field}>
              <span className={forms.label}>Título</span>
              <input
                className={forms.input}
                value={titulo}
                maxLength={160}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Como cadastrar um produto"
              />
            </label>

            <label className={forms.field}>
              <span className={forms.label}>Rótulo (opcional)</span>
              <input
                className={forms.input}
                list="sugestoes-rotulo"
                value={tag}
                maxLength={60}
                onChange={(e) => setTag(e.target.value)}
              />
              <datalist id="sugestoes-rotulo">
                {SUGESTOES_DE_ROTULO.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <span className={forms.hint}>
                Aparece antes do título, como nas novidades ("Rotina nova").
              </span>
            </label>
          </div>
        </section>

        <section aria-label="Conteúdo" className={styles.blocos}>
          <h2 className={styles.subtitulo}>Passo a passo</h2>
          <p className={forms.hint}>
            Cada bloco de texto vira um parágrafo no site. Use os botões para mudar a ordem.
          </p>

          <ol className={styles.lista}>
            {blocos.map((b, i) => (
              <li key={b.chave} className={styles.bloco}>
                <div className={styles.blocoTopo}>
                  <span className={styles.blocoNome}>
                    Bloco {i + 1} · {b.tipo === 'texto' ? 'Texto' : 'Imagem'}
                  </span>

                  <div className={styles.blocoBotoes}>
                    <button
                      type="button"
                      className={styles.icone}
                      onClick={() => mover(i, -1)}
                      disabled={i === 0}
                      aria-label={`Subir o bloco ${i + 1}`}
                    >
                      <ArrowUp aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={styles.icone}
                      onClick={() => mover(i, 1)}
                      disabled={i === blocos.length - 1}
                      aria-label={`Descer o bloco ${i + 1}`}
                    >
                      <ArrowDown aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={styles.icone}
                      onClick={() => remover(b.chave)}
                      aria-label={`Remover o bloco ${i + 1}`}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {b.tipo === 'texto' ? (
                  <textarea
                    className={forms.textarea}
                    value={b.texto}
                    onChange={(e) => alterarBloco(b.chave, { texto: e.target.value })}
                    aria-label={`Texto do bloco ${i + 1}`}
                  />
                ) : (
                  <div className={styles.imagem}>
                    {b.url ? (
                      <img src={mediaUrl(b.url)} alt="" className={styles.miniatura} />
                    ) : (
                      <p className={forms.hint}>A imagem não está mais disponível.</p>
                    )}

                    <div className={forms.form}>
                      <label className={forms.field}>
                        <span className={forms.label}>Descrição da imagem (obrigatória)</span>
                        <input
                          className={forms.input}
                          value={b.alt}
                          onChange={(e) => alterarBloco(b.chave, { alt: e.target.value })}
                        />
                        <span className={forms.hint}>
                          Descreve a imagem para quem usa leitor de tela.
                        </span>
                      </label>

                      <label className={forms.field}>
                        <span className={forms.label}>Legenda (opcional)</span>
                        <input
                          className={forms.input}
                          value={b.legenda ?? ''}
                          onChange={(e) => alterarBloco(b.chave, { legenda: e.target.value })}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>

          <div className={forms.actions}>
            <button type="button" className={forms.secondary} onClick={adicionarTexto}>
              <Plus aria-hidden="true" />
              Adicionar texto
            </button>

            <button
              type="button"
              className={forms.secondary}
              disabled={ocupado}
              onClick={() => seletorDeImagem.current?.click()}
            >
              <ImagePlus aria-hidden="true" />
              Adicionar imagem
            </button>

            <input
              ref={seletorDeImagem}
              type="file"
              accept={TIPOS_DE_IMAGEM.join(',')}
              onChange={aoEscolherImagem}
              className={styles.arquivo}
              aria-label="Escolher imagem"
              tabIndex={-1}
            />
          </div>
          <p className={forms.hint}>
            Aceita PNG, JPEG e WebP de até 5 MB. A imagem é reduzida para no máximo 1600 px
            de largura, e a descrição dela é obrigatória.
          </p>
        </section>

        {previa && (
          <section aria-label="Pré-visualização" className={styles.previa}>
            <h2 className={styles.subtitulo}>Pré-visualização</h2>
            <p className={forms.hint}>
              É assim que aparece no site. Clique no título para abrir.
            </p>
            <RoutineTopics topics={[topicoDePrevia]} />
          </section>
        )}

        <div className={styles.rodape}>
          <div aria-live="polite" className={styles.mensagens}>
            {erro && (
              <p className={forms.error} role="alert">
                {erro}
              </p>
            )}
            {aviso && <p className={forms.notice}>{aviso}</p>}
            {!erro && !aviso && sujo && (
              <p className={forms.hint}>Há alterações que ainda não foram salvas.</p>
            )}
            {publicado && (
              <p className={forms.hint}>
                Este passo a passo está no site: ao salvar, a alteração já aparece lá.
              </p>
            )}
          </div>

          <div className={forms.actions}>
            <button type="submit" className={forms.secondary} disabled={ocupado}>
              {publicado ? 'Salvar alterações' : 'Salvar rascunho'}
            </button>

            {publicado ? (
              <button
                type="button"
                className={forms.secondary}
                disabled={ocupado}
                onClick={() => void despublicar()}
              >
                Tirar do site
              </button>
            ) : (
              <button
                type="button"
                className={forms.primary}
                disabled={ocupado}
                onClick={() => void publicar()}
              >
                Publicar
              </button>
            )}

            <button
              type="button"
              className={forms.secondary}
              onClick={() => setPrevia((v) => !v)}
            >
              {previa ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              {previa ? 'Esconder prévia' : 'Pré-visualizar'}
            </button>

            {topico && publicado && (
              <Link
                to={`/${topico.moduloSlug}#${topico.slug}`}
                target="_blank"
                rel="noreferrer"
                className={forms.secondary}
              >
                Ver no site
              </Link>
            )}

            {topico && (
              <button
                type="button"
                className={forms.danger}
                disabled={ocupado}
                onClick={() => void excluir()}
              >
                <Trash2 aria-hidden="true" />
                Excluir
              </button>
            )}
          </div>
        </div>
      </form>
    </AdminShell>
  );
}
