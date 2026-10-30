import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AdminShell from '../../../components/AdminShell';
import { useAuth } from '../../../admin/auth-context';
import { siteUrl } from '../../../lib/enderecos';
import styles from '../forms.module.css';

export default function Login() {
  const { usuario, carregando, entrar } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Quem já está logado não precisa ver a tela de login.
  if (!carregando && usuario) return <Navigate to={destino} replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      const resultado = await entrar(email, senha);
      if (resultado === 'codigo') {
        navigate('/login/codigo', { state: { from: destino } });
        return;
      }
      navigate(destino, { replace: true });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar.');
      setEnviando(false);
    }
  }

  return (
    <AdminShell
      title="Entrar no painel"
      description="Acesso da equipe que mantém a central de ajuda."
      back={{ href: siteUrl('/'), label: 'Voltar para a central de ajuda' }}
      width="narrow"
    >
      <div className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {erro && (
            <p className={styles.error} role="alert">
              {erro}
            </p>
          )}

          <label className={styles.field}>
            <span className={styles.label}>E-mail</span>
            <input
              className={styles.input}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Senha</span>
            <input
              className={styles.input}
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </label>

          <div className={styles.actions}>
            <button type="submit" className={styles.primary} disabled={enviando}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>

      <p className={styles.alt}>
        Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
      </p>
    </AdminShell>
  );
}
