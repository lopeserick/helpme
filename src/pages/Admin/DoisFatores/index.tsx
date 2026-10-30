import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AdminShell from '../../../components/AdminShell';
import { useAuth } from '../../../admin/auth-context';
import { siteUrl } from '../../../lib/enderecos';
import styles from '../forms.module.css';

/** Segunda etapa do login: o código de 6 dígitos do aplicativo. */
export default function DoisFatores() {
  const { usuario, carregando, enviarCodigo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = (location.state as { from?: string } | null)?.from ?? '/';

  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!carregando && usuario) return <Navigate to={destino} replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await enviarCodigo(codigo);
      navigate(destino, { replace: true });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível conferir o código.');
      setCodigo('');
      setEnviando(false);
    }
  }

  return (
    <AdminShell
      title="Código de verificação"
      description="Abra o aplicativo autenticador no celular e digite o código do Help Me."
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
            <span className={styles.label}>Código de 6 números</span>
            <input
              className={`${styles.input} ${styles.codigo}`}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
            <span className={styles.hint}>O código muda a cada 30 segundos.</span>
          </label>

          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.primary}
              disabled={enviando || codigo.length !== 6}
            >
              {enviando ? 'Conferindo…' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>

      <p className={styles.alt}>
        Perdeu o acesso ao aplicativo? Peça a quem administra a central para desligar a
        verificação da sua conta. <Link to="/login">Voltar ao login</Link>
      </p>
    </AdminShell>
  );
}
