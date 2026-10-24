/**
 * Administração de contas pelo terminal do servidor, para quando alguém não
 * consegue entrar no painel (esqueceu a senha, perdeu o celular da 2FA, conta
 * bloqueada). Só quem tem acesso ao servidor consegue rodar.
 *
 *   npm run usuario -- listar
 *   npm run usuario -- senha <email>          gera uma senha temporária
 *   npm run usuario -- desbloquear <email>    tira o bloqueio por tentativas
 *   npm run usuario -- desativar-2fa <email>  desliga a verificação em duas etapas
 *   npm run usuario -- desativar <email>      a pessoa não entra mais
 *   npm run usuario -- ativar <email>
 *
 * Toda mudança encerra as sessões abertas da conta.
 */
import { randomBytes } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import { conexao, db } from '../db/index.js';
import { usuario } from '../db/schema.js';
import { gerarHash } from '../lib/senha.js';
import { encerrarOutrasSessoes } from '../lib/sessao.js';

const [comando, emailInformado] = process.argv.slice(2);

function ajuda() {
  console.log(`Uso: npm run usuario -- <comando> [email]

  listar                  contas, situação e 2FA
  senha <email>           gera uma senha temporária
  desbloquear <email>     tira o bloqueio por tentativas
  desativar-2fa <email>   desliga a verificação em duas etapas
  desativar <email>       a pessoa não entra mais
  ativar <email>          volta a permitir a entrada`);
}

async function conta(email: string | undefined) {
  if (!email) throw new Error('Informe o e-mail da conta.');
  const [linha] = await db
    .select()
    .from(usuario)
    .where(eq(usuario.email, email.trim().toLowerCase()));
  if (!linha) throw new Error(`Nenhuma conta com o e-mail ${email}.`);
  return linha;
}

async function executar() {
  switch (comando) {
    case 'listar': {
      const contas = await db.select().from(usuario).orderBy(asc(usuario.email));
      if (contas.length === 0) return console.log('Nenhuma conta.');
      for (const c of contas) {
        const bloqueada = c.bloqueadoAte && c.bloqueadoAte > new Date() ? ' · BLOQUEADA' : '';
        console.log(
          `${c.email}  ${c.nome}  · ${c.ativo ? 'ativa' : 'DESATIVADA'} · 2FA ${c.totpSegredo ? 'ligada' : 'desligada'}${bloqueada}`,
        );
      }
      return;
    }
    case 'senha': {
      const c = await conta(emailInformado);
      // 15 caracteres fáceis de ditar (sem 0/O, 1/l): a pessoa troca em Minha conta.
      const letras = 'abcdefghjkmnpqrstuvwxyz23456789';
      const temporaria = Array.from(randomBytes(15), (b) => letras[b % letras.length]).join('');
      await db
        .update(usuario)
        .set({ senhaHash: await gerarHash(temporaria), falhasLogin: 0, bloqueadoAte: null })
        .where(eq(usuario.id, c.id));
      await encerrarOutrasSessoes(c.id);
      console.log(`Senha temporária de ${c.email}: ${temporaria}`);
      console.log('Passe por um canal seguro e peça para trocar em Minha conta.');
      return;
    }
    case 'desbloquear': {
      const c = await conta(emailInformado);
      await db.update(usuario).set({ falhasLogin: 0, bloqueadoAte: null }).where(eq(usuario.id, c.id));
      return console.log(`${c.email} desbloqueada.`);
    }
    case 'desativar-2fa': {
      const c = await conta(emailInformado);
      await db
        .update(usuario)
        .set({ totpSegredo: null, totpPendente: null, totpUltimoPasso: 0 })
        .where(eq(usuario.id, c.id));
      await encerrarOutrasSessoes(c.id);
      return console.log(`Verificação em duas etapas de ${c.email} desligada. Ela pode ativar de novo em Minha conta.`);
    }
    case 'desativar':
    case 'ativar': {
      const c = await conta(emailInformado);
      await db.update(usuario).set({ ativo: comando === 'ativar' }).where(eq(usuario.id, c.id));
      await encerrarOutrasSessoes(c.id);
      return console.log(`${c.email} ${comando === 'ativar' ? 'ativada' : 'desativada'}.`);
    }
    default:
      ajuda();
      process.exitCode = comando ? 1 : 0;
  }
}

executar()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => conexao.end());
