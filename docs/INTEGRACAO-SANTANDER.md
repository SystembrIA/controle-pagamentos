# Conciliação automática pela API do Santander Empresas

Hoje a conciliação funciona subindo o arquivo do extrato (Excel/CSV). Com a
integração ativa, aparece no modal **🔍 Conciliação bancária** o botão
**🏦 Puxar extrato do Santander (automático)**: ele busca direto no banco as
saídas do dia, em todas as contas, e roda a mesma conciliação de sempre
(✅ no que bateu, linha pendente ⏳ no que sobrou, trava do dia).

## Como funciona (e por que precisa de um servidor)

O site é uma página estática (GitHub Pages) e roda no navegador. A API do
Santander exige **Client Secret + certificado digital A1 (mTLS)**, e isso não
pode ficar no site, porque qualquer um que abre a página veria. Então quem
fala com o banco é uma **Cloud Function do Firebase** (pasta `functions/`),
usando o próprio banco de dados do sistema como "caixa de correio":

```
Site ──grava pedido──▶ Firebase (extratoPedidos/{id})
                          │
                          ▼
              Cloud Function extratoSantander ──mTLS──▶ API Santander
                          │
Site ◀──lê saídas──── Firebase (extratosApi/{dia}/{conta})
```

A senha da API e o certificado ficam guardados no **Secret Manager** do
Google, nunca no código nem no GitHub.

---

## Parte 1: com o banco (Michael/Juliana)

1. **Falar com o gerente PJ do Santander** e pedir a contratação da
   **API de Saldo e Extrato** (Santander Empresas, "API: soluções digitais").
   Perguntar:
   - se precisa contratar **por CNPJ** (cada empresa do grupo com CNPJ próprio
     normalmente tem a própria aplicação/credencial);
   - se tem tarifa;
   - se liberam o **ambiente sandbox** (teste) antes do de produção.
2. **Certificado digital A1 (e-CNPJ)** de cada CNPJ. Normalmente é o mesmo
   arquivo `.pfx` usado pra emitir nota fiscal (o contador costuma ter).
   Precisa ser **A1** (arquivo), não A3 (cartão/token).
3. **Entrar no portal** <https://developer.santander.com.br> com o usuário
   **master** do Internet Banking Empresas, e para cada CNPJ:
   - criar uma **Aplicação**;
   - vincular a API **Saldo e Extrato**;
   - enviar o certificado (`.crt`, ver Parte 2, passo 2);
   - anotar o **Client ID** e o **Client Secret** (guardar em lugar seguro,
     não mandar por WhatsApp/e-mail).
4. Anotar **agência e conta** de cada loja, no formato que o portal mostra
   para o extrato (normalmente `AGENCIA.CONTA`, ex.: `1234.000130012345`).
   Na documentação da API dentro do portal (logado), conferir o caminho do
   extrato. O padrão usado aqui é
   `/bank_account_information/v1/banks/90400888000142/statements/{AGENCIA.CONTA}`.
   Se for outro, dá pra trocar só na configuração (`caminhoExtrato`), sem
   mexer no código.

## Parte 2: no Firebase (quem for configurar a parte técnica)

1. **Plano Blaze** no projeto `pagamento-diario-f3eba` (console do Firebase,
   *Upgrade*). Cloud Functions e Secret Manager exigem isso. No volume de
   vocês (alguns cliques por dia) o custo fica na faixa gratuita, mas vale
   criar um **alerta de orçamento** (ex.: R$ 20/mês) no Google Cloud.
2. **Converter o certificado A1** (`.pfx`) em dois arquivos, dentro da pasta
   `functions/` (já estão no `.gitignore`, não sobem pro GitHub):
   ```bash
   openssl pkcs12 -in certificado.pfx -clcerts -nokeys -out certificado.crt
   openssl pkcs12 -in certificado.pfx -nocerts -nodes  -out chave-privada.pem
   # se der erro de algoritmo, repete os dois comandos com -legacy no final
   ```
3. **Instalar as ferramentas**: Node.js 20 e `npm install -g firebase-tools`,
   depois `firebase login`.
4. **Preencher a configuração**: copiar `functions/santander-config.exemplo.json`
   para `functions/santander-config.json` e preencher, para cada CNPJ, o
   `clientId`, o `clientSecret`, os arquivos do certificado e as contas. Em
   `"empresa"` vai a chave da loja no sistema:
   `BURGER_MATRIZ`, `GOURMET`, `SAO_BERNARDO`, `GUARULHOS`, `PIZZA`, `SUSHI`,
   `PIRITUBA`, `SERVICE`.
   Para testar primeiro no sandbox, usar `"ambiente": "sandbox"`.
5. **Guardar no Secret Manager e publicar a função**:
   ```bash
   cd functions
   npm install
   node montar-config.js
   firebase functions:secrets:set SANTANDER_CONFIG --data-file santander-config.pronto.json
   firebase deploy --only functions
   ```
   Depois de publicar, **apagar** `santander-config.json`,
   `santander-config.pronto.json`, `.crt`, `.pem` e `.pfx` do computador
   usado (ficam só no Secret Manager).
   Para trocar credencial depois: repetir `node montar-config.js` +
   `secrets:set` + `firebase deploy --only functions`.

## Parte 3: primeiro uso e conferência

1. Abrir o sistema, escolher um dia que **já foi conciliado por arquivo**,
   clicar **↩️ Desfazer conciliação**, depois **🔍 Conciliação bancária →
   🏦 Puxar extrato do Santander**. O resultado tem que bater com o do arquivo.
2. Se algo vier estranho, no console do Firebase (Realtime Database) abrir
   `extratosApi/{dia}/{conta}/amostra`: é a primeira transação **bruta** que
   o Santander devolveu. Conferir:
   - se o valor vem em `amount` e o tipo em `creditDebitType` (é o que a
     função espera; ela também aceita sinal negativo);
   - se o texto do histórico dos Pix de motoboy continua contendo
     **"PAGFOR"** e **"PIX"**: é isso que agrupa os Pix do motoboy na
     conciliação. Se a API escrever diferente do arquivo, precisa ajustar
     `ehPagforPixOutraInst` no `index.html`.
3. Erros aparecem no próprio modal (ex.: "login no Santander falhou (401)" =
   Client ID/Secret ou certificado errado). Logs detalhados:
   `firebase functions:log`.

## Segurança: ponto de atenção

O banco de dados do sistema hoje não exige login: quem tiver o endereço do
Firebase consegue ler os dados. Com a integração, os **extratos** também
passam a ficar lá (`extratosApi`). Recomendação forte: antes de ligar em
produção, colocar **login** no sistema (Firebase Authentication, só e-mails
de vocês) e fechar as regras do Realtime Database para usuários logados.
