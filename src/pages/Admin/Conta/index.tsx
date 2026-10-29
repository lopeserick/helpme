import type { ComponentType, SVGProps } from 'react';
import { Link } from 'react-router-dom';
import { ImageOff, KeyRound, ScrollText, ShieldCheck } from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import AsyncContent from '../../../components/AsyncContent';
import { parseConta, type Conta } from '../../../api/admin';
import { useApi } from '../../../api/useApi';
import styles from './styles.module.css';

type Funcao = {
  to: string;
  titulo: string;
  texto: string;
  botao: string;
  icone: ComponentType<SVGProps<SVGSVGElement>>;
  situacao?: { texto: string; tom: 'ok' | 'neutro' };
};

/** Gerenciamento de conta: um cartão para cada função da conta e do painel. */
export default function GerenciamentoConta() {
  const { data, error, loading, retry } = useApi<{ conta: Conta }, Conta>(
    '/api/admin/conta',
    parseConta,
  );

  const funcoes: Funcao[] = data
    ? [
        {
          to: '/conta/senha',
          titulo: 'Senha',
          texto: 'Troque a senha de acesso. Os outros aparelhos conectados são desconectados.',
          botao: 'Trocar senha',
          icone: KeyRound,
        },
        {
          to: '/conta/dois-fatores',
          titulo: 'Verificação em duas etapas',
          texto: 'Além da senha, o login pede um código do aplicativo no celular.',
          botao: data.doisFatores ? 'Gerenciar' : 'Ativar',
          icone: ShieldCheck,
          situacao: data.doisFatores
            ? { texto: 'Ligada', tom: 'ok' }
            : data.doisFatoresDisponivel
              ? { texto: 'Desligada', tom: 'neutro' }
              : { texto: 'Não configurada no servidor', tom: 'neutro' },
        },
        {
          to: '/conta/imagens',
          titulo: 'Imagens sem uso',
          texto: 'Encontre as imagens que nenhum passo a passo usa e libere espaço no servidor.',
          botao: 'Verificar imagens',
          icone: ImageOff,
        },
        {
          to: '/conta/acessos',
          titulo: 'Acessos ao painel',
          texto: 'Logins, tentativas que falharam e mudanças de segurança, com IP e navegador.',
          botao: 'Visualizar acessos',
          icone: ScrollText,
        },
      ]
    : [];

  return (
    <AdminShell
      title="Gerenciamento de conta"
      description={data ? `${data.nome} · ${data.email}` : undefined}
      back={{ to: '/', label: 'Voltar para a lista' }}
    >
      <AsyncContent loading={loading} error={error} onRetry={retry} loadingLabel="Carregando…">
        <ul className={styles.grade}>
          {funcoes.map(({ to, titulo, texto, botao, icone: Icone, situacao }) => (
            <li key={to} className={styles.cartao}>
              <Icone aria-hidden="true" className={styles.icone} />
              <h2 className={styles.titulo}>{titulo}</h2>
              {situacao && (
                <span className={`${styles.situacao} ${situacao.tom === 'ok' ? styles.ok : ''}`}>
                  {situacao.texto}
                </span>
              )}
              <p className={styles.texto}>{texto}</p>
              <Link to={to} className={styles.botao}>
                {botao}
              </Link>
            </li>
          ))}
        </ul>
      </AsyncContent>
    </AdminShell>
  );
}
