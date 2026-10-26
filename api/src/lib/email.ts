import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../env.js';

/**
 * Envio de e-mail por SMTP (no caso desta central, a conta do Gmail das
 * sugestões). A conexão é criada na primeira vez que for usada.
 */

let transporte: Transporter | undefined;

export function emailConfigurado() {
  return Boolean(env.SUGESTOES_DESTINO && env.SMTP_USUARIO && env.SMTP_SENHA);
}

function obterTransporte() {
  transporte ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORTA,
    secure: env.SMTP_SEGURO,
    auth: { user: env.SMTP_USUARIO, pass: env.SMTP_SENHA },
    // Não deixar a pessoa esperando se o servidor de e-mail não responder.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporte;
}

export interface Anexo {
  nome: string;
  conteudo: Buffer;
  tipo: string;
  /** Identificador para mostrar a imagem dentro do corpo (cid:...). */
  cid?: string;
}

export interface Mensagem {
  para: string;
  /** Quem recebe a resposta quando se clica em "Responder". */
  responderPara?: { nome: string; email: string };
  assunto: string;
  texto: string;
  html: string;
  anexos?: Anexo[];
}

export async function enviarEmail(m: Mensagem) {
  await obterTransporte().sendMail({
    from: { name: env.SMTP_NOME_REMETENTE, address: env.SMTP_USUARIO! },
    to: m.para,
    replyTo: m.responderPara ? { name: m.responderPara.nome, address: m.responderPara.email } : undefined,
    // Quebra de linha num cabeçalho é a porta de entrada de ataques de e-mail.
    subject: m.assunto.replace(/[\r\n]+/g, ' ').slice(0, 250),
    text: m.texto,
    html: m.html,
    attachments: m.anexos?.map((a) => ({
      filename: a.nome,
      content: a.conteudo,
      contentType: a.tipo,
      cid: a.cid,
    })),
  });
}

/** Escapa texto para colocar dentro do HTML do e-mail. */
export function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
