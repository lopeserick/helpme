# Como explicar este projeto

Material para apresentar a central de ajuda a quem não acompanhou a
construção. O desenho técnico completo está em
[`arquitetura.md`](./arquitetura.md).

## Em uma frase

O conteúdo da central de ajuda saiu de dentro do código e foi para um banco
de dados, com uma API própria. Na prática: publicar um artigo novo deixa de
exigir um desenvolvedor e uma nova versão do site.

## O problema que isso resolve

Na primeira versão, os textos dos manuais ficavam escritos dentro do código
do site. Qualquer correção, por menor que fosse, exigia alterar o projeto e
publicar o site de novo. Isso não escala para uma base de conhecimento que
precisa crescer toda semana.

## Como está montado

Três partes separadas:

- **Site** — só exibe o conteúdo
- **API** — entrega o conteúdo e, mais à frente, recebe o que for cadastrado
- **Banco de dados** — guarda tudo

Quem escreve o artigo mexe apenas no banco, pelo painel, e o site reflete a
mudança na hora.

## O que já funciona

- Cinco tabelas, com os 6 módulos e 19 tópicos migrados do código
- Quatro rotas de leitura: lista de categorias, conteúdo de uma categoria,
  novidades e busca
- Tudo verificado rodando, com banco zerado, incluindo os casos de erro

## As decisões e o motivo de cada uma

**Rascunho e publicado.** Um artigo só aparece para o cliente quando alguém
decide publicar. Evita que algo escrito pela metade vá ao ar, e dá
pré-visualização sem trabalho extra.

**Exclusão reversível.** Apagar um artigo não destrói o conteúdo, apenas o
esconde. Numa ferramenta usada por várias pessoas, apagar sem querer é
questão de tempo.

**Toda entrada é validada.** Requisição fora do formato é recusada com a
explicação do que está errado, antes de chegar ao banco.

**Imagens em disco, referência no banco.** É mais rápido e mantém o banco
leve. Tem uma consequência prática: o backup precisa cobrir dois lugares, o
banco e a pasta de imagens.

**Busca dentro do texto, não só nos títulos**, ignorando acento e maiúscula.
Resolvido sem instalar extensão no PostgreSQL — quanto menos o projeto exigir
da infraestrutura existente, menor o atrito para aprovar.

**Blocos de conteúdo em JSON.** Um tópico é uma sequência de blocos de texto
e imagem, em qualquer ordem. Guardar isso como JSON dentro do tópico evita
tabelas extras para algo que nunca é consultado isoladamente.

**Nenhuma ligação com o ERP.** A API não acessa o banco nem os serviços do
Acesse. Se a central de ajuda sair do ar, o sistema continua funcionando.

## O que ainda não está pronto

Esta é a fase 1 de quatro. Faltam o painel com login para a equipe cadastrar
conteúdo, o envio de imagens e o histórico de alterações. Tudo desenhado em
[`arquitetura.md`](./arquitetura.md).

## Perguntas frequentes

**Quanto custa?**
Nenhuma licença. Roda na VM que já existe, com o PostgreSQL que a empresa já
usa. Todas as tecnologias são de código aberto.

**Quem mantém?**
Hoje, quem construiu. O código está no GitHub da empresa, com documentação de
instalação e operação, e usa tecnologias comuns de mercado — nada exótico.
Concentrar a manutenção numa pessoa é um ponto de atenção real, e a resposta
para isso é documentação e escolhas convencionais.

**É seguro, sendo público?**
A leitura é aberta, mas expõe apenas conteúdo de manual, que é público por
natureza. Escrever exige login com conta individual, o que permite saber quem
alterou o quê. O painel de administração fica restrito à rede interna.

**E os dados de clientes nas capturas de tela?**
As capturas saem da base interna com dados voltados a manuais públicos, que a
empresa já mantém para esse fim.

**Por que não usar um CMS pronto?**
Para uma base pequena, um CMS resolveria. A opção por construir dá controle
sobre o formato do conteúdo e evita mais uma ferramenta para manter e
licenciar — com o custo de ser mais trabalho de desenvolvimento.

**Quando fica pronto?**
Depende do tempo disponível. A próxima fase, o painel, é a que entrega valor
direto para a equipe que escreve.
