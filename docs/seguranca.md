# Segurança do painel

O que protege o painel, em camadas. A ideia central: **esconder o endereço não
protege** (o JavaScript de qualquer site pode ser lido). O que protege é o
atacante não alcançar as rotas do painel pelo site público e, chegando ao
painel, não conseguir entrar nem agir em nome de quem entrou.

O acesso ao painel continua aberto de fora da empresa, de propósito: a equipe
precisa usá-lo de qualquer lugar. Por isso a verificação em duas etapas é a
proteção principal.

## 1. Endereço próprio para o painel

| | Site público | Painel |
| --- | --- | --- |
| Endereço (exemplo) | `ajuda.suaempresa.com.br` | `painel.suaempresa.com.br` |
| Build | `dist/site` | `dist/painel` |
| Desenvolvimento | `npm run dev` (:5173) | `npm run dev:painel` (:5174) |
| Alcança `/api/admin` e `/api/auth` | **Não** (404 no IIS) | Sim |

- O build do site **não contém nenhum código do painel**: quem lê o JavaScript
  do site não descobre que o painel existe nem quais são as rotas dele.
- O IIS do site responde 404 para `/api/admin` e `/api/auth`
  ([`iis/site.web.config`](iis/site.web.config)). O painel tem o seu
  ([`iis/painel.web.config`](iis/painel.web.config)).
- O painel pede aos buscadores para não ser indexado (`noindex`).

## 2. Entrar

- **Senha** guardada só como hash scrypt. Mínimo de 8 caracteres.
- **Verificação em duas etapas** (código de 6 dígitos de um aplicativo como
  Google Authenticator), ligada em *Minha conta*:
  - o segredo fica **cifrado** no banco (AES-256-GCM, chave `CHAVE_2FA` no
    `.env`): uma cópia do banco sozinha não gera códigos;
  - o mesmo código não serve duas vezes;
  - depois da senha certa, a sessão fica "pela metade" por 5 minutos e não abre
    nada do painel até o código ser digitado;
  - com `EXIGIR_2FA=true`, toda conta é levada a ativar antes de usar o painel
    (a API também recusa, não só a tela).
- **Bloqueio por conta:** 5 senhas ou códigos errados seguidos bloqueiam a
  conta por 15 minutos (`LOGIN_MAX_FALHAS`, `LOGIN_BLOQUEIO_MIN`). Vale mesmo
  para quem troca de IP.
- **Limite por IP:** 10 tentativas por minuto em login, código e cadastro
  (`LIMITE_TENTATIVAS_IP`).
- **Cadastro com convite:** só com o `CODIGO_CADASTRO`. Depois de criar as
  contas da equipe, apague essa linha do `.env` e reinicie a API: a tela de
  cadastro passa a responder "desativado".

> O bloqueio por conta avisa "conta bloqueada", o que revela que aquele e-mail
> tem conta. Foi uma escolha consciente: sem o aviso, a pessoa da equipe não
> entende por que não consegue entrar. O limite por IP segura quem tenta
> descobrir e-mails em massa.

## 3. Depois de entrar

- **Sessão** em cookie `HttpOnly` (o JavaScript não lê) e `SameSite=Strict`
  (o navegador não envia o cookie em navegação vinda de outro site). O banco
  guarda só o hash do token.
- **Inatividade:** 30 minutos parado e a sessão cai (`SESSAO_INATIVIDADE_MIN`),
  além do limite de 12 horas (`SESSAO_HORAS`).
- **Checagem de origem (CSRF):** toda ação que grava algo em `/api/admin` e
  `/api/auth` precisa vir do endereço do painel (`PAINEL_ORIGENS`). Um site de
  terceiros que tente agir em nome de quem está logado é recusado com 403.
- **Mudanças sensíveis pedem a senha de novo:** ligar ou desligar a 2FA e
  trocar a senha. Trocar a senha ou ligar a 2FA desconecta os outros aparelhos.

## 4. Cabeçalhos de segurança

Na API (`@fastify/helmet`) e nas páginas (IIS):

- `Content-Security-Policy`: só carrega scripts, estilos e fontes do próprio
  endereço, e não pode ser aberto dentro de outro site;
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`;
- `Strict-Transport-Security` (HTTPS sempre), quando houver HTTPS;
- o IIS não diz qual servidor é (`removeServerHeader`).

## 5. Registro de acessos

A tela **Acessos** mostra logins, saídas, senhas e códigos errados, contas
bloqueadas e mudanças de segurança, com IP e navegador. Fica 180 dias. Muitas
falhas seguidas para a mesma conta são sinal de ataque.

## Quando alguém não consegue entrar

No terminal do servidor, na pasta `api`:

```powershell
npm run usuario -- listar                     # contas, situação e 2FA
npm run usuario -- desbloquear fulano@...     # tira o bloqueio
npm run usuario -- senha fulano@...           # gera uma senha temporária
npm run usuario -- desativar-2fa fulano@...   # perdeu o celular
npm run usuario -- desativar fulano@...       # saiu da equipe
```

Toda mudança encerra as sessões abertas da conta.

## Para publicar

No `.env` da API, em produção:

```
PAINEL_ORIGENS=https://painel.suaempresa.com.br
CORS_ORIGINS=https://ajuda.suaempresa.com.br,https://painel.suaempresa.com.br
COOKIE_SECURE=true
TRUST_PROXY=true
CHAVE_2FA=<gerada uma vez, guardada em lugar seguro>
EXIGIR_2FA=true
# CODIGO_CADASTRO só enquanto estiver criando as contas
```

Gerar a `CHAVE_2FA`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Trocar a `CHAVE_2FA` depois invalida a 2FA de todo mundo (cada um precisaria
ativar de novo). Guarde-a junto com o backup do banco, mas **não** no mesmo
lugar do banco.

## O que ainda não existe

- Códigos de recuperação da 2FA (hoje, quem perde o celular depende do comando
  `desativar-2fa`).
- Aviso por e-mail de login novo ou de conta bloqueada.
- Restrição por rede (IP): descartada, porque a equipe usa o painel de fora.
