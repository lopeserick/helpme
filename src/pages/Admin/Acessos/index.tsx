import { useState } from 'react';
import AdminShell from '../../../components/AdminShell';
import AsyncContent from '../../../components/AsyncContent';
import { parseAcessos, type EventoAcesso } from '../../../api/admin';
import { useApi } from '../../../api/useApi';
import { formatDateTime } from '../../../lib/texto';
import tabela from '../Topicos/styles.module.css';
import styles from './styles.module.css';

const EVENTOS: Record<string, { rotulo: string; alerta?: boolean }> = {
  login: { rotulo: 'Entrou' },
  logout: { rotulo: 'Saiu' },
  cadastro: { rotulo: 'Criou a conta' },
  senha_errada: { rotulo: 'Senha errada', alerta: true },
  codigo_errado: { rotulo: 'Código errado', alerta: true },
  conta_bloqueada: { rotulo: 'Tentou com a conta bloqueada', alerta: true },
  senha_alterada: { rotulo: 'Trocou a senha' },
  '2fa_ativada': { rotulo: 'Ativou a verificação em duas etapas' },
  '2fa_desativada': { rotulo: 'Desligou a verificação em duas etapas', alerta: true },
};

/** Resume o "user agent" em algo legível: navegador e sistema. */
function navegador(ua: string | null) {
  if (!ua) return '—';
  const nome = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Outro';
  const sistema = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad/.test(ua)
        ? 'iOS'
        : /Mac OS/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  return sistema ? `${nome} · ${sistema}` : nome;
}

/**
 * Quem entrou no painel, quando e de onde, e as tentativas que falharam.
 * Muitas senhas erradas seguidas para a mesma conta são sinal de ataque.
 */
export default function Acessos() {
  const { data, error, loading, retry } = useApi<{ acessos: EventoAcesso[] }, EventoAcesso[]>(
    '/api/admin/acessos?limite=200',
    parseAcessos,
  );

  // Momento em que a tela abriu, para contar as falhas das últimas 24 horas.
  const [abertaEm] = useState(() => Date.now());

  const falhasRecentes =
    data?.filter(
      (a) =>
        EVENTOS[a.evento]?.alerta &&
        a.evento !== '2fa_desativada' &&
        abertaEm - new Date(a.em).getTime() < 24 * 60 * 60 * 1000,
    ).length ?? 0;

  return (
    <AdminShell
      title="Acessos ao painel"
      description="Logins, tentativas que falharam e mudanças de segurança, dos mais recentes para os mais antigos."
    >
      <AsyncContent
        loading={loading}
        error={error}
        onRetry={retry}
        loadingLabel="Carregando os acessos…"
        empty={data?.length === 0}
        emptyLabel="Nenhum acesso registrado ainda."
      >
        <p className={styles.resumo} role="status">
          {falhasRecentes === 0
            ? 'Nenhuma tentativa com falha nas últimas 24 horas.'
            : `${falhasRecentes} ${falhasRecentes === 1 ? 'tentativa com falha' : 'tentativas com falha'} nas últimas 24 horas.`}
        </p>

        <div className={tabela.tableWrap}>
          <table className={tabela.table}>
            <thead>
              <tr>
                <th scope="col">Quando</th>
                <th scope="col">O quê</th>
                <th scope="col">Conta</th>
                <th scope="col">IP</th>
                <th scope="col">Navegador</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((a) => {
                const evento = EVENTOS[a.evento] ?? { rotulo: a.evento };
                return (
                  <tr key={a.id}>
                    <td className={styles.quando}>{formatDateTime(a.em)}</td>
                    <td>
                      <span className={evento.alerta ? styles.alerta : undefined}>
                        {evento.rotulo}
                      </span>
                    </td>
                    <td>
                      {a.nome ?? '—'}
                      {a.email && <span className={tabela.tag}>{a.email}</span>}
                    </td>
                    <td className={styles.ip}>{a.ip ?? '—'}</td>
                    <td>{navegador(a.navegador)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AsyncContent>
    </AdminShell>
  );
}
