// Junta o santander-config.json com o conteúdo dos arquivos de certificado
// e gera o santander-config.pronto.json, que é o que vai pro segredo
// SANTANDER_CONFIG do Firebase:
//
//   node montar-config.js
//   firebase functions:secrets:set SANTANDER_CONFIG --data-file santander-config.pronto.json
//
// Depois APAGA o santander-config.pronto.json do computador -- ele tem a
// senha da API e a chave do certificado.
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'santander-config.json'), 'utf8'));
for (const cred of config.credenciais || []) {
  for (const campo of ['certificado', 'chavePrivada']) {
    const arq = path.resolve(__dirname, cred[campo]);
    if (!fs.existsSync(arq)) throw new Error(`${cred.nome}: arquivo ${arq} não encontrado`);
    cred[campo] = fs.readFileSync(arq, 'utf8');
  }
}
fs.writeFileSync(path.join(__dirname, 'santander-config.pronto.json'), JSON.stringify(config));
console.log('OK — santander-config.pronto.json gerado. Suba com:');
console.log('  firebase functions:secrets:set SANTANDER_CONFIG --data-file santander-config.pronto.json');
