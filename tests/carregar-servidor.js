// monta o código do servidor como o carregador (duplicatas + cobrança; server + server-cobranca) e devolve a string pra eval
const fs = require('fs'), path = require('path');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
module.exports = () => R('app/server/duplicatas.js') + '\n' + R('app/shared/cobranca.js') + '\n' + R('app/server/server.js').replace(/\nAPI;\s*$/, '\n') + '\n' + R('app/server/server-cobranca.js') + '\nAPI;\n';
