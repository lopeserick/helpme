import { useState } from 'react';
import { History } from 'lucide-react';
import {
  parseHistorico,
  restaurarVersao,
  type Acao,
  type EventoHistorico,
  type TopicoCompleto,
} from '../../../api/admin';
import { useApi } from '../../../api/useApi';
import { formatDateTime } from '../../../lib/texto';
import AsyncContent from '../../../components/AsyncContent';
import forms from '../forms.module.css';
import styles from './styles.module.css';

const VERBOS: Record<Acao, string> = {
  criou: 'criou',
  editou: 'editou',
  publicou: 'publicou no site',
  despublicou: 'tirou do site',
  excluiu: 'excluiu',
  restaurou: 'restaurou uma versão',
};

type Props = {
  topico: TopicoCompleto;
  /** Há alterações não salvas no formulário (restaurar as descartaria). */
  sujo: boolean;
  onRestaurado: (topico: TopicoCompleto, aviso: string) => void;
};

/**
 * Linha do tempo do passo a passo: quem fez o quê e quando. As versões salvas
 * a partir da fase 4 guardam o conteúdo e podem ser restauradas.
 */
export default function Historico({ topico, sujo, onRestaurado }: Props) {
  // A data da última alteração no endereço faz a lista recarregar depois de cada ação.
  const { data, error, loading, retry } = useApi<{ historico: EventoHistorico[] }, EventoHistorico[]>(
    `/api/admin/topicos/${topico.id}/historico?v=${encodeURIComponent(topico.atualizadoEm)}`,
    parseHistorico,
  );
  const [erro, setErro] = useState<string | null>(null);
  const [restaurando, setRestaurando] = useState<number | null>(null);

  // A versão atual é a mais recente com conteúdo: restaurá-la não mudaria nada.
  const atual = data?.find((e) => e.restauravel)?.id;

  async function restaurar(evento: EventoHistorico) {
    const pergunta = sujo
      ? 'Há alterações não salvas que serão perdidas. Restaurar esta versão mesmo assim?'
      : 'Restaurar esta versão? O conteúdo atual fica guardado no histórico.';
    if (!window.confirm(pergunta)) return;

    setErro(null);
    setRestaurando(evento.id);
    try {
      const r = await restaurarVersao(topico.id, evento.id);
      const perdidas =
        r.imagensPerdidas > 0
          ? ` ${r.imagensPerdidas === 1 ? '1 imagem não existia mais e ficou' : `${r.imagensPerdidas} imagens não existiam mais e ficaram`} de fora.`
          : '';
      const noSite = r.topico.situacao === 'publicado' ? ' Já vale no site.' : '';
      onRestaurado(r.topico, `Versão de ${formatDateTime(evento.em)} restaurada.${noSite}${perdidas}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível restaurar.');
      setRestaurando(null);
    }
  }

  return (
    <section aria-labelledby="titulo-historico" className={styles.historico}>
      <h2 id="titulo-historico" className={styles.subtitulo}>
        <History aria-hidden="true" />
        Histórico
      </h2>

      {erro && (
        <p className={forms.error} role="alert">
          {erro}
        </p>
      )}

      <AsyncContent
        loading={loading}
        error={error}
        onRetry={retry}
        loadingLabel="Carregando o histórico…"
        empty={data?.length === 0}
        emptyLabel="Nenhuma alteração registrada."
      >
        <ol className={styles.linhaDoTempo}>
          {data?.map((evento) => (
            <li key={evento.id} className={styles.evento}>
              <div>
                <p>
                  <strong>{evento.usuario ?? 'Alguém'}</strong> {VERBOS[evento.acao] ?? evento.acao}
                  {evento.titulo && evento.acao !== 'publicou' && (
                    <span className={styles.versaoTitulo}> · "{evento.titulo}"</span>
                  )}
                </p>
                <p className={forms.hint}>{formatDateTime(evento.em)}</p>
              </div>

              {evento.restauravel &&
                (evento.id === atual ? (
                  <span className={styles.versaoAtual}>Versão atual</span>
                ) : (
                  <button
                    type="button"
                    className={forms.secondary}
                    disabled={restaurando !== null}
                    onClick={() => void restaurar(evento)}
                  >
                    {restaurando === evento.id ? 'Restaurando…' : 'Restaurar'}
                  </button>
                ))}
            </li>
          ))}
        </ol>
      </AsyncContent>
    </section>
  );
}
