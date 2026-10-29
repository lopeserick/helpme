import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import AsyncContent from '../../../components/AsyncContent';
import {
  apagarImagem,
  formatarBytes,
  limparImagens,
  parseImagensSemUso,
  type ImagensSemUsoResposta,
} from '../../../api/admin';
import { mediaUrl } from '../../../api/client';
import { useApi } from '../../../api/useApi';
import { formatDateTime } from '../../../lib/texto';
import forms from '../forms.module.css';
import styles from './styles.module.css';

/**
 * Imagens que nenhum passo a passo usa, para liberar espaço no servidor.
 * Imagens de tópicos excluídos contam como em uso (a exclusão é reversível) e
 * as enviadas há menos de 1 hora não aparecem (podem estar num editor aberto).
 */
export default function Imagens() {
  const { data, error, loading, retry } = useApi<ImagensSemUsoResposta, ImagensSemUsoResposta>(
    '/api/admin/imagens/sem-uso',
    parseImagensSemUso,
  );

  const [apagadas, setApagadas] = useState<Set<string>>(() => new Set());
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const restantes = (data?.imagens ?? []).filter((i) => !apagadas.has(i.id));
  const bytesRestantes = restantes.reduce((soma, i) => soma + i.bytes, 0);

  async function apagarUma(id: string) {
    if (!window.confirm('Apagar esta imagem? Não dá para desfazer.')) return;
    setErro(null);
    setAviso(null);
    setOcupado(true);
    try {
      await apagarImagem(id);
      setApagadas((atual) => new Set(atual).add(id));
      setAviso('Imagem apagada.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível apagar a imagem.');
    } finally {
      setOcupado(false);
    }
  }

  async function apagarTodas() {
    const ok = window.confirm(
      `Apagar as ${restantes.length} imagens sem uso? Não dá para desfazer.`,
    );
    if (!ok) return;
    setErro(null);
    setAviso(null);
    setOcupado(true);
    try {
      const r = await limparImagens();
      setApagadas(new Set(data?.imagens.map((i) => i.id)));
      setAviso(
        r.apagadas === 1
          ? `1 imagem apagada (${formatarBytes(r.bytes)} liberados).`
          : `${r.apagadas} imagens apagadas (${formatarBytes(r.bytes)} liberados).`,
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível apagar as imagens.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <AdminShell
      title="Imagens sem uso"
      back={{ to: '/conta', label: 'Voltar para Gerenciamento de conta' }}
      description="Imagens enviadas que nenhum passo a passo usa. Apagar libera espaço no servidor."
    >
      <div aria-live="polite" className={styles.mensagens}>
        {erro && (
          <p className={forms.error} role="alert">
            {erro}
          </p>
        )}
        {aviso && <p className={forms.notice}>{aviso}</p>}
      </div>

      <AsyncContent
        loading={loading}
        error={error}
        onRetry={retry}
        loadingLabel="Procurando imagens sem uso…"
        empty={restantes.length === 0}
        emptyLabel="Nenhuma imagem sem uso. Está tudo em ordem."
      >
        <div className={styles.resumo}>
          <p>
            {restantes.length === 1
              ? '1 imagem sem uso'
              : `${restantes.length} imagens sem uso`}{' '}
            · {formatarBytes(bytesRestantes)}
          </p>
          <button
            type="button"
            className={forms.danger}
            disabled={ocupado}
            onClick={() => void apagarTodas()}
          >
            <Trash2 aria-hidden="true" />
            Apagar todas
          </button>
        </div>

        <ul className={styles.grade}>
          {restantes.map((img) => (
            <li key={img.id} className={styles.cartao}>
              <img src={mediaUrl(img.url)} alt="" loading="lazy" className={styles.miniatura} />
              <div className={styles.info}>
                <span>
                  {img.largura && img.altura ? `${img.largura} × ${img.altura} · ` : ''}
                  {formatarBytes(img.bytes)}
                </span>
                <span>
                  Enviada em {formatDateTime(img.criadaEm)}
                  {img.enviadaPor ? ` por ${img.enviadaPor}` : ''}
                </span>
              </div>
              <button
                type="button"
                className={forms.danger}
                disabled={ocupado}
                onClick={() => void apagarUma(img.id)}
                aria-label={`Apagar imagem enviada em ${formatDateTime(img.criadaEm)}`}
              >
                <Trash2 aria-hidden="true" />
                Apagar
              </button>
            </li>
          ))}
        </ul>
      </AsyncContent>
    </AdminShell>
  );
}
