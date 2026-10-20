/**
 * Teste de conexão com a API em execução.
 *
 * Uso (com a API no ar):
 *   npm run teste:api
 *   API_URL=http://servidor:3000 npm run teste:api
 *
 * Confere saúde (API + banco), cada rota de leitura, os erros esperados
 * (400 e 404), o CORS e se as imagens dos tópicos abrem. Sai com código 1 se
 * qualquer verificação falhar, então serve também em rotina automática.
 */

// Marca o arquivo como módulo, o que permite usar await no topo.
export {};

const base = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const origemDoSite = process.env.SITE_URL ?? 'http://localhost:5173';

let falhas = 0;

async function verificar(nome: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ok    ${nome}`);
  } catch (erro) {
    falhas += 1;
    const motivo = erro instanceof Error ? erro.message : String(erro);
    console.log(`  FALHA ${nome}\n          ${motivo}`);
  }
}

function esperar(condicao: boolean, mensagem: string): asserts condicao {
  if (!condicao) throw new Error(mensagem);
}

async function buscar(caminho: string, init?: RequestInit) {
  const resposta = await fetch(`${base}${caminho}`, {
    ...init,
    signal: AbortSignal.timeout(8000),
  });
  return resposta;
}

async function json<T = unknown>(caminho: string, statusEsperado = 200): Promise<T> {
  const resposta = await buscar(caminho);
  esperar(
    resposta.status === statusEsperado,
    `GET ${caminho} devolveu ${resposta.status}, esperado ${statusEsperado}`,
  );
  return (await resposta.json()) as T;
}

console.log(`Testando a API em ${base}\n`);

await verificar('saúde: API e banco respondem', async () => {
  const corpo = await json<{ ok: boolean; banco: string }>('/api/saude');
  esperar(corpo.ok === true && corpo.banco === 'ok', 'saúde não informou banco ok');
});

interface Modulo {
  slug: string;
  titulo: string;
  descricao: string;
  icone: string;
}

interface Bloco {
  tipo: string;
  url?: string;
}

interface Topico {
  slug: string;
  blocos: Bloco[];
}

let modulos: Modulo[] = [];

await verificar('módulos: lista não vazia, com os campos da Home', async () => {
  const corpo = await json<{ modulos: Modulo[] }>('/api/modulos');
  modulos = corpo.modulos;
  esperar(modulos.length > 0, 'nenhum módulo devolvido (rodou o seed?)');
  for (const m of modulos) {
    esperar(
      [m.slug, m.titulo, m.descricao, m.icone].every((c) => typeof c === 'string'),
      `módulo ${m.slug ?? '?'} sem algum dos campos slug/titulo/descricao/icone`,
    );
  }
});

const urlsDeImagem = new Set<string>();

await verificar('cada módulo abre com tópicos e blocos válidos', async () => {
  esperar(modulos.length > 0, 'sem módulos para testar');
  for (const { slug } of modulos) {
    const corpo = await json<{ modulo: Modulo; topicos: Topico[] }>(`/api/modulos/${slug}`);
    esperar(corpo.modulo.slug === slug, `módulo ${slug} devolveu outro slug`);
    for (const t of corpo.topicos) {
      esperar(Array.isArray(t.blocos), `tópico ${t.slug} sem lista de blocos`);
      for (const b of t.blocos) {
        esperar(b.tipo === 'texto' || b.tipo === 'imagem', `bloco de tipo ${b.tipo}`);
        if (b.tipo === 'imagem' && b.url) urlsDeImagem.add(b.url);
      }
    }
  }
});

await verificar('novidades: devolve a lista e respeita o limite', async () => {
  const corpo = await json<{ novidades: unknown[] }>('/api/novidades?limite=2');
  esperar(Array.isArray(corpo.novidades), 'novidades não é uma lista');
  esperar(corpo.novidades.length <= 2, 'limite=2 devolveu mais de 2 itens');
});

await verificar('busca: acha resultado ignorando acento e caixa', async () => {
  const corpo = await json<{ resultados: unknown[] }>('/api/busca?q=RELATORIO');
  esperar(corpo.resultados.length > 0, 'busca por "RELATORIO" não achou nada');
});

await verificar('busca: termo curto devolve 400 com os problemas', async () => {
  const corpo = await json<{ problemas: unknown[] }>('/api/busca?q=a', 400);
  esperar(Array.isArray(corpo.problemas) && corpo.problemas.length > 0, 'sem problemas');
});

await verificar('módulo inexistente devolve 404', async () => {
  await json('/api/modulos/nao-existe', 404);
});

await verificar('imagens dos tópicos abrem', async () => {
  for (const url of urlsDeImagem) {
    const resposta = await buscar(url);
    esperar(resposta.status === 200, `${url} devolveu ${resposta.status}`);
  }
});

await verificar(`CORS: aceita o site em ${origemDoSite}`, async () => {
  const resposta = await buscar('/api/modulos', { headers: { Origin: origemDoSite } });
  esperar(
    resposta.headers.get('access-control-allow-origin') === origemDoSite,
    'a origem do site não está em CORS_ORIGINS',
  );
});

console.log(falhas === 0 ? '\nTudo certo.' : `\n${falhas} verificação(ões) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
