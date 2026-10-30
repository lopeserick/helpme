import type { FastifyInstance, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { z } from 'zod';
import { db } from '../db/index.js';
import { sugestao } from '../db/schema.js';
import { env } from '../env.js';
import { emailConfigurado, enviarEmail, escaparHtml, type Anexo } from '../lib/email.js';
import { TAMANHO_MAXIMO_BYTES } from '../lib/uploads.js';

/**
 * Página de sugestões do site: o cliente informa nome, e-mail, empresa,
 * título e texto (e até 3 imagens). A sugestão é guardada no banco e enviada
 * por e-mail para SUGESTOES_DESTINO.
 *
 * O e-mail sai da conta SMTP (o Gmail não deixa mandar "em nome" do cliente),
 * com o cliente no "Responder para": clicar em Responder já escreve para ele.
 */

const MAX_IMAGENS = 3;
const LARGURA_IMAGEM = 1600;

/** Campos de uma linha: quebras de linha e tabulações viram espaço. */
const umaLinha = (v: string) => v.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ');

const sugestaoSchema = z.object({
  nome: z.string({ error: 'Informe seu nome.' }).trim().min(2, 'Informe seu nome.').max(120, 'Nome longo demais.').transform(umaLinha),
  email: z
    .string({ error: 'Informe seu e-mail.' })
    .trim()
    .toLowerCase()
    .max(200, 'E-mail longo demais.')
    .pipe(z.email('Informe um e-mail válido.')),
  empresa: z.string({ error: 'Informe a empresa.' }).trim().min(2, 'Informe a empresa.').max(120, 'Nome da empresa longo demais.').transform(umaLinha),
  titulo: z.string({ error: 'Dê um título à sugestão.' }).trim().min(3, 'Dê um título à sugestão.').max(120, 'Título longo demais.').transform(umaLinha),
  texto: z
    .string({ error: 'Escreva a sugestão.' })
    .trim()
    .min(10, 'Conte um pouco mais sobre a sugestão.')
    .max(5000, 'O texto pode ter no máximo 5.000 caracteres.'),
});

class EntradaInvalida extends Error {}

/** Lê os campos e as imagens do formulário (multipart). */
async function lerFormulario(requisicao: FastifyRequest) {
  const campos: Record<string, string> = {};
  const imagens: Buffer[] = [];

  const partes = requisicao.parts({
    limits: { fileSize: TAMANHO_MAXIMO_BYTES, files: MAX_IMAGENS, fields: 10, fieldSize: 20_000 },
  });

  for await (const parte of partes) {
    if (parte.type === 'file') {
      try {
        const conteudo = await parte.toBuffer();
        if (conteudo.length > 0) imagens.push(conteudo);
      } catch (erro) {
        if ((erro as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
          throw new EntradaInvalida('Cada imagem pode ter no máximo 5 MB.');
        }
        throw erro;
      }
    } else {
      campos[parte.fieldname] = String(parte.value ?? '');
    }
  }

  return { campos, imagens };
}

/** Confere que é imagem de verdade e reduz para caber bem num e-mail. */
async function prepararImagem(entrada: Buffer, indice: number): Promise<Anexo> {
  try {
    const origem = sharp(entrada, { limitInputPixels: 50_000_000 });
    const { format } = await origem.metadata();
    if (!format || !['jpeg', 'png', 'webp'].includes(format)) throw new Error('formato');
    const conteudo = await origem
      .rotate()
      .resize({ width: LARGURA_IMAGEM, withoutEnlargement: true })
      // JPEG: o formato que todo programa de e-mail mostra.
      .jpeg({ quality: 82 })
      .toBuffer();
    return {
      nome: `imagem-${indice + 1}.jpg`,
      conteudo,
      tipo: 'image/jpeg',
      cid: `imagem-${indice + 1}@helpme`,
    };
  } catch {
    throw new EntradaInvalida(`A imagem ${indice + 1} não é PNG, JPEG ou WebP.`);
  }
}

function montarEmail(
  dados: z.infer<typeof sugestaoSchema>,
  anexos: Anexo[],
  id: number,
) {
  const assunto = `${dados.titulo} — ${dados.nome} (${dados.empresa})`;

  const texto = [
    `Nova sugestão #${id} pela central de ajuda`,
    '',
    `Nome: ${dados.nome}`,
    `E-mail: ${dados.email}`,
    `Empresa: ${dados.empresa}`,
    `Título: ${dados.titulo}`,
    '',
    dados.texto,
    anexos.length ? `\n${anexos.length} imagem(ns) em anexo.` : '',
  ].join('\n');

  const paragrafos = escaparHtml(dados.texto)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');

  const imagens = anexos
    .map(
      (a, i) =>
        `<p style="margin:16px 0 0"><img src="cid:${a.cid}" alt="Imagem ${i + 1} enviada pelo cliente" style="max-width:100%;border:1px solid #d9e4dd;border-radius:8px"></p>`,
    )
    .join('');

  const linha = (rotulo: string, valor: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#52645a">${rotulo}</td><td style="padding:4px 0"><strong>${escaparHtml(valor)}</strong></td></tr>`;

  const html = `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:24px;background:#f4f8f5;font-family:Arial,sans-serif;color:#1b2b23">
<div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #d9e4dd;border-radius:12px;padding:24px">
<p style="margin:0 0 4px;color:#1b8a58;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:1px">Nova sugestão #${id}</p>
<h1 style="margin:0 0 16px;font-size:22px">${escaparHtml(dados.titulo)}</h1>
<table style="border-collapse:collapse;margin:0 0 20px;font-size:14px">
${linha('Nome', dados.nome)}
${linha('E-mail', dados.email)}
${linha('Empresa', dados.empresa)}
</table>
<div style="font-size:15px;line-height:1.5">${paragrafos}</div>
${imagens}
<p style="margin:24px 0 0;font-size:12px;color:#52645a">Responda este e-mail para falar direto com ${escaparHtml(dados.nome)}.</p>
</div></body></html>`;

  return { assunto, texto, html };
}

export async function rotasSugestoes(app: FastifyInstance) {
  /** O site pergunta se o formulário está ligado, para mostrar ou não a página. */
  app.get('/api/sugestoes/disponivel', async () => ({ disponivel: emailConfigurado() }));

  app.post(
    '/api/sugestoes',
    // Poucos envios por IP: o formulário é aberto a qualquer pessoa.
    { config: { rateLimit: { max: env.LIMITE_SUGESTOES, timeWindow: '15 minutes' } } },
    async (requisicao, resposta) => {
      if (!emailConfigurado()) {
        return resposta
          .code(503)
          .send({ erro: 'O envio de sugestões está indisponível no momento. Tente mais tarde.' });
      }
      if (!requisicao.isMultipart()) {
        return resposta.code(400).send({ erro: 'Envie o formulário da página de sugestões.' });
      }

      let formulario;
      try {
        formulario = await lerFormulario(requisicao);
      } catch (erro) {
        if (erro instanceof EntradaInvalida) return resposta.code(400).send({ erro: erro.message });
        if ((erro as { code?: string }).code === 'FST_FILES_LIMIT') {
          return resposta.code(400).send({ erro: `Envie no máximo ${MAX_IMAGENS} imagens.` });
        }
        throw erro;
      }

      // Campo escondido que pessoas não veem: se veio preenchido, é robô.
      // Responde "ok" para o robô não perceber, mas não guarda nem envia nada.
      if (formulario.campos.site) {
        requisicao.log.warn('sugestão descartada: campo-armadilha preenchido');
        return resposta.code(201).send({ ok: true });
      }

      const dados = sugestaoSchema.parse(formulario.campos);

      let anexos: Anexo[];
      try {
        anexos = await Promise.all(formulario.imagens.map(prepararImagem));
      } catch (erro) {
        if (erro instanceof EntradaInvalida) return resposta.code(400).send({ erro: erro.message });
        throw erro;
      }

      // Guarda antes de enviar: se o e-mail falhar, a sugestão não se perde.
      const [salva] = await db
        .insert(sugestao)
        .values({ ...dados, imagens: anexos.length })
        .returning({ id: sugestao.id });

      try {
        const email = montarEmail(dados, anexos, salva.id);
        await enviarEmail({
          para: env.SUGESTOES_DESTINO!,
          responderPara: { nome: dados.nome, email: dados.email },
          assunto: email.assunto,
          texto: email.texto,
          html: email.html,
          anexos,
        });
        await db.update(sugestao).set({ enviadaEm: new Date() }).where(eq(sugestao.id, salva.id));
      } catch (erro) {
        // O cliente recebe "enviada" do mesmo jeito: ela está guardada e
        // aparece no painel, com o motivo da falha.
        requisicao.log.error(erro, 'falha ao enviar o e-mail da sugestão');
        await db
          .update(sugestao)
          .set({ erroEnvio: erro instanceof Error ? erro.message.slice(0, 300) : 'erro desconhecido' })
          .where(eq(sugestao.id, salva.id));
      }

      return resposta.code(201).send({ ok: true });
    },
  );
}
