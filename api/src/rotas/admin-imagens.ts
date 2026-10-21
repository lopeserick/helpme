import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { imagem } from '../db/schema.js';
import {
  apagarImagem,
  gravarImagem,
  ImagemInvalidaError,
  processarImagem,
  TAMANHO_MAXIMO_BYTES,
  urlDaImagem,
} from '../lib/uploads.js';

/**
 * Envio de imagens pelo painel (exige login, aplicado por `rotas/admin.ts`).
 *
 * O arquivo é validado, reduzido para no máximo 1600 px de largura, convertido
 * para WebP e gravado em disco com um nome novo (o id). A resposta traz o `id`,
 * que o tópico guarda no bloco de imagem, e a `url` para mostrar na hora.
 */
export async function rotasAdminImagens(admin: FastifyInstance) {
  admin.post('/api/admin/imagens', async (requisicao, resposta) => {
    const arquivo = await requisicao.file();
    if (!arquivo) {
      return resposta.code(400).send({ erro: 'Escolha um arquivo de imagem para enviar.' });
    }

    let entrada: Buffer;
    try {
      entrada = await arquivo.toBuffer();
    } catch (erro) {
      if ((erro as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
        return resposta.code(413).send({
          erro: `A imagem é grande demais. O limite é ${TAMANHO_MAXIMO_BYTES / 1024 / 1024} MB.`,
        });
      }
      throw erro;
    }

    let processada;
    try {
      processada = await processarImagem(entrada);
    } catch (erro) {
      if (erro instanceof ImagemInvalidaError) {
        return resposta.code(400).send({ erro: erro.message });
      }
      throw erro;
    }

    const id = randomUUID();
    const nome = `${id}.webp`;

    await gravarImagem(nome, processada.dados);

    try {
      await db.insert(imagem).values({
        id,
        arquivo: nome,
        mime: 'image/webp',
        bytes: processada.bytes,
        largura: processada.largura,
        altura: processada.altura,
        enviadaPor: requisicao.usuario!.id,
      });
    } catch (erro) {
      // Sem registro no banco o arquivo ficaria órfão: remove antes de falhar.
      await apagarImagem(nome);
      throw erro;
    }

    return resposta.code(201).send({
      imagem: {
        id,
        url: urlDaImagem(nome),
        largura: processada.largura,
        altura: processada.altura,
        bytes: processada.bytes,
      },
    });
  });
}
