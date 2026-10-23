import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { and, desc, eq, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { imagem, usuario } from '../db/schema.js';
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
/** Nenhum tópico (nem excluído) tem um bloco que aponte para esta imagem. */
const semUso = sql`not exists (
  select 1 from topico t
  where t.blocos @> jsonb_build_array(jsonb_build_object('imagemId', ${imagem.id}::text))
)`;

const umaHoraAtras = () => new Date(Date.now() - 60 * 60 * 1000);

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

  /**
   * Imagens que nenhum tópico usa. Tópicos excluídos contam como uso, porque
   * a exclusão é reversível. Imagens enviadas há menos de 1 hora ficam de
   * fora: podem estar num editor aberto, ainda não salvo.
   */
  admin.get('/api/admin/imagens/sem-uso', async () => {
    const linhas = await db
      .select({
        id: imagem.id,
        arquivo: imagem.arquivo,
        bytes: imagem.bytes,
        largura: imagem.largura,
        altura: imagem.altura,
        criadaEm: imagem.criadaEm,
        enviadaPor: usuario.nome,
      })
      .from(imagem)
      .leftJoin(usuario, eq(imagem.enviadaPor, usuario.id))
      .where(and(semUso, lt(imagem.criadaEm, umaHoraAtras())))
      .orderBy(desc(imagem.criadaEm));

    return {
      imagens: linhas.map((l) => ({ ...l, url: urlDaImagem(l.arquivo) })),
      bytes: linhas.reduce((soma, l) => soma + l.bytes, 0),
    };
  });

  /** Apaga uma imagem, só se ela continuar sem uso. */
  admin.delete('/api/admin/imagens/:id', async (requisicao, resposta) => {
    const { id } = z.object({ id: z.uuid() }).parse(requisicao.params);

    const [apagada] = await db
      .delete(imagem)
      .where(and(eq(imagem.id, id), semUso, lt(imagem.criadaEm, umaHoraAtras())))
      .returning({ arquivo: imagem.arquivo });

    if (!apagada) {
      return resposta
        .code(409)
        .send({ erro: 'Essa imagem está em uso ou foi enviada há pouco. Ela não foi apagada.' });
    }

    await apagarImagem(apagada.arquivo);
    return resposta.code(204).send();
  });

  /** Apaga de uma vez todas as imagens sem uso. */
  admin.post('/api/admin/imagens/limpar', async () => {
    const apagadas = await db
      .delete(imagem)
      .where(and(semUso, lt(imagem.criadaEm, umaHoraAtras())))
      .returning({ arquivo: imagem.arquivo, bytes: imagem.bytes });

    for (const a of apagadas) await apagarImagem(a.arquivo);

    return {
      apagadas: apagadas.length,
      bytes: apagadas.reduce((soma, a) => soma + a.bytes, 0),
    };
  });
}
