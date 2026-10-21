import type { MouseEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import PageHeader from '../PageHeader';
import { useAuth } from '../../admin/auth-context';
import styles from './styles.module.css';

type Props = {
  title: string;
  description?: string;
  /** Para onde o link "voltar" leva. Por padrão, a central pública. */
  back?: { to: string; label: string };
  /** Chamado ao clicar em "voltar"; use `preventDefault` para impedir a saída. */
  onBack?: (event: MouseEvent<HTMLAnchorElement>) => void;
  children: ReactNode;
  /** Largura do conteúdo: 'narrow' para formulários curtos. */
  width?: 'wide' | 'narrow';
};

/**
 * Estrutura das telas do painel: faixa verde com o título, o nome de quem está
 * logado e o botão Sair (quando há alguém logado), e o conteúdo abaixo.
 */
export default function AdminShell({
  title,
  description,
  back = { to: '/', label: 'Ver a central de ajuda' },
  onBack,
  children,
  width = 'wide',
}: Props) {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();

  async function handleSair() {
    await sair();
    navigate('/admin/login', { replace: true });
  }

  return (
    <>
      <PageHeader size="compact">
        <div className={styles.top}>
          <Link to={back.to} className={styles.back} onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
            {back.label}
          </Link>

          {usuario && (
            <div className={styles.user}>
              <span>{usuario.nome}</span>
              <button type="button" className={styles.logout} onClick={handleSair}>
                <LogOut aria-hidden="true" />
                Sair
              </button>
            </div>
          )}
        </div>

        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </PageHeader>

      <main
        className={`container ${styles.content} ${width === 'narrow' ? styles.narrow : ''}`}
      >
        {children}
      </main>
    </>
  );
}
