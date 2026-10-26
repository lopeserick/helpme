# Sugestões dos clientes

Página `/sugestoes` no site público. O cliente informa **nome, e-mail,
empresa, título e a sugestão** (todos obrigatórios) e pode anexar até 3
imagens. A sugestão vai por e-mail para a equipe e também fica guardada no
painel (seção **Sugestões**), mesmo se o e-mail falhar.

O caminho até a página: um cartão "Tem uma sugestão?" na Home e uma linha
"Envie uma sugestão" no fim de cada página de módulo.

## Como o e-mail chega

| Campo | O que aparece |
| --- | --- |
| Para | `SUGESTOES_DESTINO` (ex.: `sugestaobrasilsoftware@gmail.com`) |
| De | A conta que envia (`SMTP_USUARIO`), com o nome "Sugestões · Help Me" |
| Responder para | O e-mail do cliente: clicar em **Responder** já escreve para ele |
| Assunto | `Título — Nome (Empresa)`, ex.: `Filtrar vendas por vendedor — Ana Souza (Mercadinho Bom Preço)` |
| Corpo | Nome, e-mail e empresa no topo, depois o texto da sugestão e as imagens |
| Anexos | As imagens, em JPEG de até 1600 px de largura |

Por que o "De" não é o e-mail do cliente: o Gmail (e qualquer servidor sério)
recusa mensagens que fingem vir de outro endereço. O "Responder para" resolve
o mesmo problema sem isso.

## Configurar (no `.env` da API)

```
SUGESTOES_DESTINO=sugestaobrasilsoftware@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORTA=465
SMTP_SEGURO=true
SMTP_USUARIO=sugestaobrasilsoftware@gmail.com
SMTP_SENHA=<senha de app de 16 letras>
```

**A `SMTP_SENHA` não é a senha normal da conta.** No Gmail:

1. Entre em `myaccount.google.com` com a conta que vai enviar.
2. Em **Segurança**, ligue a **Verificação em duas etapas** (o Google só
   libera senha de app com ela ligada).
3. Ainda em Segurança, abra **Senhas de app**, crie uma com o nome "Help Me" e
   copie as 16 letras (sem os espaços) para `SMTP_SENHA`.
4. Reinicie a API.

Sem `SUGESTOES_DESTINO`, `SMTP_USUARIO` ou `SMTP_SENHA`, a página de sugestões
mostra "indisponível no momento" e a API recusa o envio.

## Proteções

- **Spam:** 5 envios por IP a cada 15 minutos (`LIMITE_SUGESTOES`) e um campo
  escondido que só robôs preenchem (o envio é descartado em silêncio). Se mesmo
  assim chegar lixo, o próximo passo é um captcha leve (Cloudflare Turnstile).
- **Imagens:** só PNG, JPEG ou WebP de verdade (conferido pelo conteúdo), até
  5 MB cada, no máximo 3.
- **Conteúdo:** o texto do cliente é escapado no HTML do e-mail, e quebras de
  linha no título, nome e empresa viram espaço (não dá para injetar
  cabeçalhos como `Bcc:`).
- **LGPD:** a página avisa que nome, e-mail e empresa servem só para responder
  a sugestão.

## Limites do Gmail

Uma conta Gmail comum envia até cerca de 500 e-mails por dia, folgado para
sugestões. Se um dia virar volume grande, troque o SMTP por um serviço de
envio (Brevo, Amazon SES) mudando só as variáveis `SMTP_*`.
