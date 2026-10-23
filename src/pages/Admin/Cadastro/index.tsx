import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AdminShell from '../../../components/AdminShell';
import { useAuth } from '../../../admin/auth-context';
import styles from '../forms.module.css';

export default function Cadastro() {
  const { usuario, carregando, cadastrar } = useAuth();
  const navigate = useNavigate();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!carregando && usuario) return <Navigate to="/admin" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      await cadastrar({ nome, email, senha, codigo });
      navigate('/admin', { replace: true });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar a conta.');
      setEnviando(false);
    }
  }

  return (
    <AdminShell
      title="Criar conta"
      description="Para quem vai escrever e publicar na central de ajuda."
      back={{ to: '/', label: 'Voltar para a central de ajuda' }}
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
            <span className={styles.label}>Nome</span>
            <input
              className={styles.input}
              type="text"
              autoComplete="name"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>E-mail</span>
            <input
              className={styles.input}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Senha</span>
            <input
              className={styles.input}
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
            <span className={styles.hint}>Use ao menos 8 caracteres.</span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Código de cadastro</span>
            <input
              className={styles.input}
              type="password"
              autoComplete="off"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              required
            />
            <span className={styles.hint}>
              Quem administra a central passa esse código. Sem ele não é possível
              criar a conta.
            </span>
          </label>

          <div className={styles.actions}>
            <button type="submit" className={styles.primary} disabled={enviando}>
              {enviando ? 'Criando…' : 'Criar conta'}
            </button>
          </div>
        </form>
      </div>

      <p className={styles.alt}>
        Já tem conta? <Link to="/admin/login">Entrar</Link>
      </p>
    </AdminShell>
  );
}
