// ══════════════════════════════════════════════════════════
// EXTRATO AUTOMÁTICO — API do Santander Empresas
//
// O site (index.html) é estático e roda no navegador, então NÃO pode falar
// direto com o Santander: a API exige Client Secret + certificado A1 (mTLS),
// e isso não pode ficar num arquivo que qualquer um abre. Essa função roda
// no servidor do Firebase e faz a ponte, usando o próprio banco de dados que
// o site já usa como "caixa de correio":
//
//   1. o site grava um pedido em  extratoPedidos/{id} = { data: 'AAAA-MM-DD' }
//   2. essa função acorda, busca o extrato daquele dia em todas as contas
//      configuradas, e grava só as SAÍDAS em  extratosApi/{data}/{conta}
//   3. marca o pedido como  status: 'ok'  (ou 'erro' + mensagem)
//   4. o site lê extratosApi/{data} e roda a MESMA conciliação de sempre
//      (rodarConciliacao), como se fosse um arquivo que ela subiu.
//
// Credenciais ficam no Secret Manager do Google (segredo SANTANDER_CONFIG),
// nunca no código. Formato: ver santander-config.exemplo.json e
// docs/INTEGRACAO-SANTANDER.md.
// ══════════════════════════════════════════════════════════
const { onValueCreated } = require('firebase-functions/v2/database');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const https = require('https');

admin.initializeApp();

const SANTANDER_CONFIG = defineSecret('SANTANDER_CONFIG');

const HOSTS = {
  producao: 'trust-open.api.santander.com.br',
  sandbox:  'trust-sandbox.api.santander.com.br',
};
// CNPJ do Banco Santander (Brasil) S.A. -- é o {bank_id} da URL do extrato.
const BANK_ID_SANTANDER = '90400888000142';
// Caminho da API "Saldo e Extrato". {conta} = statement_id no formato
// "AGENCIA.CONTA" que o portal do Santander mostra. Se a documentação do
// portal (developer.santander.com.br, logado) indicar outro caminho, dá pra
// sobrescrever com "caminhoExtrato" no SANTANDER_CONFIG sem mexer no código.
const CAMINHO_EXTRATO_PADRAO =
  `/bank_account_information/v1/banks/${BANK_ID_SANTANDER}/statements/{conta}`;
const ITENS_POR_PAGINA = 50;
const MAX_PAGINAS = 40; // 2.000 lançamentos/dia por conta é mais que suficiente

// ── HTTP com certificado (mTLS) ───────────────────────────
function requisicao({ host, path, method, headers, body, cert, key }) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { host, path, method, headers, cert, key, timeout: 30000 },
      res => {
        let dados = '';
        res.setEncoding('utf8');
        res.on('data', c => { dados += c; });
        res.on('end', () => resolve({ status: res.statusCode, texto: dados }));
      });
    req.on('timeout', () => req.destroy(new Error('Santander não respondeu em 30s')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function pegarToken(host, cred) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: cred.clientId,
    client_secret: cred.clientSecret,
  }).toString();
  const r = await requisicao({
    host, path: '/auth/oauth/v2/token', method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    },
    body, cert: cred.certificado, key: cred.chavePrivada,
  });
  if (r.status !== 200) throw new Error(`login no Santander falhou (${r.status}): ${r.texto.slice(0, 300)}`);
  return JSON.parse(r.texto).access_token;
}

// A resposta do Santander vem paginada em "_content". Lê com tolerância a
// nomes de campo diferentes, porque a documentação completa só aparece
// logado no portal -- a primeira transação bruta de cada conta fica salva
// em "amostra" justamente pra conferir isso no primeiro uso.
function listaDaResposta(json) {
  return json._content || json.content || json.transactions || json.data || [];
}

function paraSaida(t) {
  const valor = Number(t.amount ?? t.value ?? t.valor ?? 0);
  const tipo = String(t.creditDebitType ?? t.type ?? t.tipo ?? '').toUpperCase();
  // Mesma regra do extrato em arquivo: só SAÍDA entra na conciliação.
  const ehDebito = tipo ? (tipo.startsWith('D') || tipo.includes('DEB')) : valor < 0;
  if (!ehDebito || !valor) return null;
  const historico = [t.transactionName, t.historicComplement, t.description, t.historico]
    .filter(Boolean).map(s => String(s).trim()).join(' ').trim();
  return {
    data: String(t.transactionDate ?? t.date ?? t.data ?? ''),
    historico,
    valor: Math.round(Math.abs(valor) * 100) / 100,
  };
}

async function buscarSaidasDoDia(host, token, cred, contaId, dia, caminho) {
  const saidas = [];
  let amostra = null, total = 0;
  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const qs = new URLSearchParams({
      initialDate: dia, finalDate: dia,
      _limit: String(ITENS_POR_PAGINA), _offset: String(pagina),
    }).toString();
    const r = await requisicao({
      host, method: 'GET',
      path: caminho.replace('{conta}', encodeURIComponent(contaId)) + '?' + qs,
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Application-Key': cred.clientId,
        Accept: 'application/json',
      },
      cert: cred.certificado, key: cred.chavePrivada,
    });
    if (r.status !== 200) throw new Error(`extrato da conta ${contaId} falhou (${r.status}): ${r.texto.slice(0, 300)}`);
    const lista = listaDaResposta(JSON.parse(r.texto));
    if (!amostra && lista.length) amostra = lista[0];
    total += lista.length;
    for (const t of lista) { const s = paraSaida(t); if (s) saidas.push(s); }
    if (lista.length < ITENS_POR_PAGINA) break;
  }
  return { saidas, amostra, qtdTotal: total };
}

exports.extratoSantander = onValueCreated(
  {
    ref: '/extratoPedidos/{pedidoId}',
    instance: 'pagamento-diario-f3eba-default-rtdb',
    region: 'us-central1',
    secrets: [SANTANDER_CONFIG],
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async event => {
    const pedidoRef = event.data.ref;
    const pedido = event.data.val() || {};
    const dia = String(pedido.data || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
      await pedidoRef.update({ status: 'erro', erro: 'data inválida no pedido' });
      return;
    }

    try {
      const config = JSON.parse(SANTANDER_CONFIG.value());
      const host = HOSTS[config.ambiente] || HOSTS.producao;
      const caminho = config.caminhoExtrato || CAMINHO_EXTRATO_PADRAO;
      const resultado = {};
      const erros = [];

      for (const cred of config.credenciais || []) {
        let token;
        try { token = await pegarToken(host, cred); }
        catch (e) { erros.push(`${cred.nome || cred.clientId}: ${e.message}`); continue; }

        for (const c of cred.contas || []) {
          try {
            const r = await buscarSaidasDoDia(host, token, cred, c.id, dia, caminho);
            // Chave do Firebase não aceita ponto -- "0001.000130012345" vira "0001-000130012345".
            resultado[c.id.replace(/[.#$/[\]]/g, '-')] = {
              id: c.id,
              empresa: c.empresa || null,
              conta: c.id.split('.').pop(),
              saidas: r.saidas,
              qtdTotal: r.qtdTotal,
              amostra: r.amostra,
              buscadoEm: Date.now(),
            };
          } catch (e) { erros.push(e.message); }
        }
      }

      await admin.database().ref(`extratosApi/${dia}`).set(resultado);
      await pedidoRef.update({
        status: Object.keys(resultado).length ? 'ok' : 'erro',
        erro: erros.join(' | ') || null,
        terminadoEm: Date.now(),
      });
    } catch (e) {
      logger.error('extratoSantander', e);
      await pedidoRef.update({ status: 'erro', erro: e.message, terminadoEm: Date.now() });
    }
  });
