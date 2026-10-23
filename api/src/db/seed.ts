/**
 * Carrega o conteúdo inicial no banco: os módulos e tópicos que antes viviam
 * em `src/data/helpCenter.ts`, no projeto do site.
 *
 * É seguro rodar mais de uma vez: cada registro é inserido ou atualizado pelo
 * seu identificador natural (slug do módulo, módulo + slug do tópico).
 * Nada que já esteja no banco é apagado.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { count } from 'drizzle-orm';
import { conexao, db } from './index.js';
import { blocosSchema, imagem, modulo, topico, type Bloco } from './schema.js';
import { montarTextoBusca, normalizar } from '../lib/texto.js';

type Conteudo = {
  imagens: { id: string; arquivo: string; mime: string; bytes: number }[];
  modulos: {
    slug: string;
    titulo: string;
    descricao: string;
    subtitulo: string | null;
    icone: string;
    ordem: number;
    visivel: boolean;
  }[];
  topicos: {
    modulo: string;
    slug: string;
    titulo: string;
    tag: string | null;
    ordem: number;
    publicadoEm: string;
    blocos: unknown[];
  }[];
};

const caminho = fileURLToPath(new URL('./conteudo-inicial.json', import.meta.url));
const conteudo = JSON.parse(readFileSync(caminho, 'utf8')) as Conteudo;

async function executar() {
  for (const img of conteudo.imagens) {
    await db
      .insert(imagem)
      .values(img)
      .onConflictDoUpdate({ target: imagem.id, set: { arquivo: img.arquivo } });
  }

  const idPorSlug = new Map<string, number>();

  for (const m of conteudo.modulos) {
    const valores = { ...m, tituloBusca: normalizar(m.titulo) };

    const [linha] = await db
      .insert(modulo)
      .values(valores)
      .onConflictDoUpdate({
        target: modulo.slug,
        set: {
          titulo: valores.titulo,
          tituloBusca: valores.tituloBusca,
          descricao: valores.descricao,
          subtitulo: valores.subtitulo,
          icone: valores.icone,
          ordem: valores.ordem,
          visivel: valores.visivel,
        },
      })
      .returning({ id: modulo.id });

    idPorSlug.set(m.slug, linha.id);
  }

  for (const t of conteudo.topicos) {
    const moduloId = idPorSlug.get(t.modulo);
    if (!moduloId) throw new Error(`módulo desconhecido no conteúdo: ${t.modulo}`);

    // Valida antes de gravar: conteúdo fora do formato para aqui, não no site.
    const blocos: Bloco[] = blocosSchema.parse(t.blocos);

    await db
      .insert(topico)
      .values({
        moduloId,
        slug: t.slug,
        titulo: t.titulo,
        tag: t.tag,
        ordem: t.ordem,
        blocos,
        textoBusca: montarTextoBusca(t.titulo, blocos),
        publicadoEm: new Date(t.publicadoEm),
      })
      .onConflictDoUpdate({
        target: [topico.moduloId, topico.slug],
        set: {
          titulo: t.titulo,
          tag: t.tag,
          ordem: t.ordem,
          blocos,
          textoBusca: montarTextoBusca(t.titulo, blocos),
          publicadoEm: new Date(t.publicadoEm),
          atualizadoEm: new Date(),
        },
      });
  }

  const [{ modulos }] = await db.select({ modulos: count() }).from(modulo);
  const [{ topicos }] = await db.select({ topicos: count() }).from(topico);

  console.log(`conteúdo carregado: ${modulos} módulos, ${topicos} tópicos`);
}

executar()
  .catch((erro) => {
    console.error('falha ao carregar o conteúdo inicial:', erro);
    process.exitCode = 1;
  })
  .finally(() => conexao.end());
