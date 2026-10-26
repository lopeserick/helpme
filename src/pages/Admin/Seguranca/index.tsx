import { useState, type FormEvent } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import AsyncContent from '../../../components/AsyncContent';
import {
  confirmar2fa,
  desativar2fa,
  iniciar2fa,
  parseConta,
  trocarSenha,
  type Conta,
} from '../../../api/admin';
import { useApi } from '../../../api/useApi';
import { useAuth } from '../../../admin/auth-context';
import forms from '../forms.module.css';
import styles from './styles.module.css';

/** Minha conta: trocar a senha e ligar ou desligar a verificação em duas etapas. */
export default function Seguranca() {
  const { data, error, loading, retry } = useApi<{ conta: Conta }, Conta>(
    '/api/admin/conta',
    parseConta,
  );
  const { atualizarDoisFatores, exige2fa, usuario } = useAuth();
  const [ligada, setLigada] = useState<boolean | null>(null);
  const doisFatores = ligada ?? data?.doisFatores ?? false;
  const obrigatoriaPendente = exige2fa && !usuario?.doisFatores;

  function aoMudar2fa(valor: boolean) {
    setLigada(valor);
    atualizarDoisFatores(valor);
  }

  return (
    <AdminShell
      title="Minha conta"
      description={data ? `${data.nome} · ${data.email}` : undefined}
      back={{ to: '/', label: 'Voltar para a lista' }}
    >
      {obrigatoriaPendente && (
        <p className={`${forms.notice} ${styles.obrigatoria}`} role="status">
          Esta central exige a verificação em duas etapas. Ative abaixo para usar o painel.
        </p>
      )}

      <AsyncContent loading={loading} error={error} onRetry={retry} loadingLabel="Carregando…">
        {data && (
          <div className={styles.secoes}>
            {/* Sem CHAVE_2FA no servidor, a verificação em duas etapas não é usada
                nesta central e a seção nem aparece (a não ser para quem já a ligou). */}
            {(data.doisFatoresDisponivel || doisFatores) && (
              <DoisFatores
                ligada={doisFatores}
                disponivel={data.doisFatoresDisponivel}
                obrigatoria={data.exige2fa}
                onMudou={aoMudar2fa}
              />
            )}
            {!obrigatoriaPendente && <TrocarSenha />}
          </div>
        )}
      </AsyncContent>
    </AdminShell>
  );
}

function DoisFatores({
  ligada,
  disponivel,
  obrigatoria,
  onMudou,
}: {
  ligada: boolean;
  disponivel: boolean;
  obrigatoria: boolean;
  onMudou: (ligada: boolean) => void;
}) {
  const [etapa, setEtapa] = useState<'parado' | 'senha' | 'qr' | 'desligar'>('parado');
  const [senha, setSenha] = useState('');
  const [codigo, setCodigo] = useState('');
  const [qr, setQr] = useState<{ segredo: string; qrCode: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function rodar(acao: () => Promise<void>) {
    setErro(null);
    setAviso(null);
    setOcupado(true);
    try {
      await acao();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      setOcupado(false);
    }
  }

  const comecar = (event: FormEvent) => {
    event.preventDefault();
    void rodar(async () => {
      setQr(await iniciar2fa(senha));
      setSenha('');
      setEtapa('qr');
    });
  };

  const confirmar = (event: FormEvent) => {
    event.preventDefault();
    void rodar(async () => {
      await confirmar2fa(codigo);
      setCodigo('');
      setQr(null);
      setEtapa('parado');
      onMudou(true);
      setAviso('Verificação em duas etapas ativada. Os outros aparelhos conectados foram desconectados.');
    });
  };

  const desligar = (event: FormEvent) => {
    event.preventDefault();
    void rodar(async () => {
      await desativar2fa(senha, codigo);
      setSenha('');
      setCodigo('');
      setEtapa('parado');
      onMudou(false);
      setAviso('Verificação em duas etapas desligada.');
    });
  };

  const campoCodigo = (
    <label className={forms.field}>
      <span className={forms.label}>Código de 6 números do aplicativo</span>
      <input
        className={`${forms.input} ${forms.codigo}`}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
      />
    </label>
  );

  const campoSenha = (
    <label className={forms.field}>
      <span className={forms.label}>Sua senha</span>
      <input
        className={forms.input}
        type="password"
        autoComplete="current-password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        autoFocus
      />
    </label>
  );

  return (
    <section className={forms.card} aria-labelledby="titulo-2fa">
      <div className={styles.cabecalho}>
        {ligada ? (
          <ShieldCheck aria-hidden="true" className={styles.iconeLigado} />
        ) : (
          <ShieldOff aria-hidden="true" className={styles.iconeDesligado} />
        )}
        <div>
          <h2 id="titulo-2fa" className={styles.subtitulo}>
            Verificação em duas etapas
          </h2>
          <p className={forms.hint}>
            {ligada
              ? 'Ligada. Além da senha, o login pede o código do aplicativo no celular.'
              : 'Desligada. Com ela, quem descobrir sua senha ainda não consegue entrar.'}
          </p>
        </div>
      </div>

      <div aria-live="polite" className={styles.mensagens}>
        {erro && (
          <p className={forms.error} role="alert">
            {erro}
          </p>
        )}
        {aviso && <p className={forms.notice}>{aviso}</p>}
      </div>

      {!disponivel && !ligada && (
        <p className={forms.notice}>
          A verificação em duas etapas ainda não foi configurada no servidor. Peça a quem
          administra a central para definir a CHAVE_2FA.
        </p>
      )}

      {disponivel && !ligada && etapa === 'parado' && (
        <div className={forms.actions}>
          <button type="button" className={forms.primary} onClick={() => setEtapa('senha')}>
            Ativar
          </button>
        </div>
      )}

      {!ligada && etapa === 'senha' && (
        <form className={forms.form} onSubmit={comecar} noValidate>
          <p>Para começar, confirme sua senha.</p>
          {campoSenha}
          <div className={forms.actions}>
            <button type="submit" className={forms.primary} disabled={ocupado || !senha}>
              Continuar
            </button>
            <button type="button" className={forms.secondary} onClick={() => setEtapa('parado')}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {!ligada && etapa === 'qr' && qr && (
        <form className={forms.form} onSubmit={confirmar} noValidate>
          <ol className={styles.passos}>
            <li>
              Instale um aplicativo autenticador no celular: Google Authenticator, Microsoft
              Authenticator ou Authy.
            </li>
            <li>No aplicativo, escolha adicionar conta e leia o QR code abaixo.</li>
            <li>Digite o código de 6 números que aparecer.</li>
          </ol>
          <div className={styles.qr}>
            <img src={qr.qrCode} alt="QR code para o aplicativo autenticador" width={240} height={240} />
            <div className={styles.segredo}>
              <span className={forms.hint}>Não consegue ler? Digite esta chave no aplicativo:</span>
              <code>{qr.segredo}</code>
            </div>
          </div>
          {campoCodigo}
          <div className={forms.actions}>
            <button
              type="submit"
              className={forms.primary}
              disabled={ocupado || codigo.length !== 6}
            >
              Confirmar e ativar
            </button>
            <button type="button" className={forms.secondary} onClick={() => setEtapa('parado')}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {ligada && !obrigatoria && etapa === 'parado' && (
        <div className={forms.actions}>
          <button type="button" className={forms.danger} onClick={() => setEtapa('desligar')}>
            Desligar
          </button>
        </div>
      )}

      {ligada && obrigatoria && (
        <p className={forms.hint}>Nesta central a verificação é obrigatória e não pode ser desligada.</p>
      )}

      {ligada && etapa === 'desligar' && (
        <form className={forms.form} onSubmit={desligar} noValidate>
          <p>Para desligar, confirme sua senha e um código do aplicativo.</p>
          {campoSenha}
          {campoCodigo}
          <div className={forms.actions}>
            <button
              type="submit"
              className={forms.danger}
              disabled={ocupado || !senha || codigo.length !== 6}
            >
              Desligar verificação
            </button>
            <button type="button" className={forms.secondary} onClick={() => setEtapa('parado')}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function TrocarSenha() {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirma, setConfirma] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setAviso(null);
    if (nova.length < 8) return setErro('A nova senha precisa ter ao menos 8 caracteres.');
    if (nova !== confirma) return setErro('A confirmação não bate com a nova senha.');

    setOcupado(true);
    try {
      await trocarSenha(atual, nova);
      setAtual('');
      setNova('');
      setConfirma('');
      setAviso('Senha trocada. Os outros aparelhos conectados foram desconectados.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível trocar a senha.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className={forms.card} aria-labelledby="titulo-senha">
      <h2 id="titulo-senha" className={styles.subtitulo}>
        Trocar senha
      </h2>
      <form className={forms.form} onSubmit={handleSubmit} noValidate>
        <div aria-live="polite" className={styles.mensagens}>
          {erro && (
            <p className={forms.error} role="alert">
              {erro}
            </p>
          )}
          {aviso && <p className={forms.notice}>{aviso}</p>}
        </div>
        <label className={forms.field}>
          <span className={forms.label}>Senha atual</span>
          <input
            className={forms.input}
            type="password"
            autoComplete="current-password"
            value={atual}
            onChange={(e) => setAtual(e.target.value)}
          />
        </label>
        <label className={forms.field}>
          <span className={forms.label}>Nova senha</span>
          <input
            className={forms.input}
            type="password"
            autoComplete="new-password"
            value={nova}
            onChange={(e) => setNova(e.target.value)}
          />
          <span className={forms.hint}>Use ao menos 8 caracteres. Uma frase longa é mais segura.</span>
        </label>
        <label className={forms.field}>
          <span className={forms.label}>Confirme a nova senha</span>
          <input
            className={forms.input}
            type="password"
            autoComplete="new-password"
            value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
          />
        </label>
        <div className={forms.actions}>
          <button type="submit" className={forms.primary} disabled={ocupado || !atual || !nova}>
            {ocupado ? 'Trocando…' : 'Trocar senha'}
          </button>
        </div>
      </form>
    </section>
  );
}
