// node tests/repasse.test.js — cálculo do repasse (gestão, 10/10) contra uma planilha falsa: regras editáveis na aba "Regras de repasse"
const fs = require('fs'), path = require('path'), assert = require('assert');
const { fmt, planilha } = require('./planilha-falsa');
const HM = ['Data', 'Hora', 'Paciente', 'Profissional', 'Procedimento', 'Convênio (auto)', 'Modalidade (auto)', '⚠ Atenção na cobrança (auto)', 'O que aconteceu', 'Valor (R$)', 'Pago?', 'Data do pagamento', 'Forma de pagamento', 'Pagador habitual (auto)', 'Quem pagou (só se foi outra pessoa)', 'NF emitida?', 'Nº da NF', 'Guia assinada? (convênio)', 'Observação', 'ID', 'Registrado por (app)', 'Plano (ID)', 'Valor recebido (R$)'];
const L = o => HM.map(h => o[h] != null ? o[h] : '');
const d = new Date(2026, 9, 5, 12), at = (id, prof, proc, conv, valor, pago, extra) => L(Object.assign({ Data: d, Paciente: 'Paciente ' + id, Profissional: prof, Procedimento: proc, 'Convênio (auto)': conv, 'O que aconteceu': 'Atendido', 'Valor (R$)': valor, 'Pago?': pago, ID: id }, extra || {}));
const HR = ['Ativa', 'Profissional', 'Convênio', 'Procedimento (contém)', '% repasse', 'Valor da sessão (convênio) (R$)', 'Observação', 'Alterado por (app)'];
const ss = planilha({
  Outubro: [HM,
    at('J1', 'Juliana Ribeiro', 'Sessão de psicologia', 'Particular', 120, 'Sim'),
    at('J2', 'Juliana Ribeiro', 'Sessão de psicologia', 'Particular', 120, 'Parcial', { 'Valor recebido (R$)': 50 }),
    at('J3', 'Juliana Ribeiro', 'Sessão de psicologia', 'Particular', 70, 'Não'),
    at('J4', 'Juliana Ribeiro', 'Sessão de psicologia – convênio', 'Cedplan', '', 'Convênio (fatura)'),
    at('J5', 'Juliana Ribeiro', 'Sessão de psicologia – convênio', 'Sabin Sinai', '', 'Convênio (fatura)'),
    at('J6', 'Juliana Ribeiro', 'Avaliação neuropsicológica', 'Particular', 1050, 'Sim'),
    at('J7', 'Juliana Ribeiro', 'Sessão de psicologia – convênio', 'Sabin Sinai', 40, 'Perdido / glosa'),
    at('G1', 'Giovana Grossi', 'Sessão de psicologia', 'Particular', 120, 'Sim'),
    at('L1', 'Dra. Luciana Fiorilo', 'Consulta pediátrica', 'Sabin Sinai', '', 'Convênio (fatura)'),
    at('V1', 'Dr. Victor Cunha', 'Consulta pediátrica', 'Particular', 200, 'Sim'),
    at('M1', 'Juliana Ribeiro', 'Sessão de psicologia', 'Particular', 0, 'Incluída na mensalidade'),
    at('F1', 'Juliana Ribeiro', 'Sessão de psicologia', 'Particular', '', '', { 'O que aconteceu': 'Faltou sem aviso' })],
  'Regras de repasse': [HR,
    ['Sim', 'Juliana Ribeiro', 'Particular', '', 80, '', '', ''],
    ['Sim', 'Juliana Ribeiro', 'Cedplan', '', 40, '', 'direito 80%: 40% retido', ''],
    ['Sim', 'Juliana Ribeiro', 'Sabin Sinai', '', 80, '', '', ''],
    ['Sim', 'Todos', 'Sabin Sinai', '', '', 40, 'valor da sessão Sabin (50001183)', ''],
    ['Sim', 'Todos', 'Qualquer', 'Avaliação neuropsicológica', 0, '', '0% para todos', ''],
    ['Sim', 'Giovana Grossi', 'Qualquer', '', 0, '', 'estagiária', ''],
    ['Sim', 'Dra. Luciana Fiorilo', 'Qualquer', '', 40, '', '', ''],
    ['Não', 'Dr. Victor Cunha', 'Qualquer', '', 80, '', 'desligada pra testar', '']]
});
let email = 'administrativo@clinicanascente.com.br';
global.SpreadsheetApp = { getActiveSpreadsheet: () => ss, flush() { }, openById: () => ss, create: () => ss };
global.LockService = { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) };
global.Utilities = { formatDate: fmt };
global.Session = { getActiveUser: () => ({ getEmail: () => email }) };
const R = p => fs.readFileSync(path.join(__dirname, '..', 'app/server', p), 'utf8');
const API = (0, eval)(R('duplicatas.js') + '\n' + R('server.js'));
const r = API.repasseMes({ mes: 'Outubro' }); assert.ok(r.ok, JSON.stringify(r));
const l = id => r.linhas.filter(x => x.id === id)[0];
const conf = (id, pct, pago, prev, sit) => { const x = l(id); assert.ok(x, id); assert.deepStrictEqual([x.pct, x.repassePago, x.repassePrev, x.situacao], [pct, pago, prev, sit], id + ' ' + JSON.stringify(x)); };
conf('J1', 80, 96, 96, 'pago');
conf('J2', 80, 40, 96, 'pago em parte');
conf('J3', 80, 0, 56, 'em aberto');
conf('J4', 40, 0, 0, 'convênio a receber');          // Cedplan sem valor da sessão cadastrado: base 0 (preencher na regra)
conf('J5', 80, 0, 32, 'convênio a receber');         // Sabin: valor da sessão R$ 40 vem da regra "Todos · Sabin Sinai"
conf('J6', 0, 0, 0, 'pago');                         // avaliação neuro 0% (regra por procedimento ganha da regra Particular)
conf('J7', 80, 0, 0, 'perdido');                     // perdido / glosa: repasse 0
conf('G1', 0, 0, 0, 'pago');                         // estagiária 0%
conf('L1', 40, 0, 16, 'convênio a receber');         // Luciana · Qualquer 40% + valor Sabin 40
conf('M1', 80, 0, 0, 'incluída no pacote/mensalidade');
assert.strictEqual(l('V1').semRegra, true); assert.strictEqual(l('V1').pct, null); // regra do Victor desligada
assert.ok(!l('F1'), 'falta sem valor não entra');
const jul = r.porProfissional.filter(p => p.profissional === 'Juliana Ribeiro')[0];
assert.strictEqual(jul.repassePago, 136); assert.strictEqual(jul.repassePrev, 280); assert.strictEqual(r.semRegra, 1);
console.log('cálculo ok · Juliana: já recebido R$ ' + jul.repassePago + ' · previsto R$ ' + jul.repassePrev + ' · por convênio ' + jul.porConvenio.map(c => c.convenio + ' ' + c.pct + '%').join(', '));
// recepção não vê nem muda
email = 'atendimento@clinicanascente.com.br';
assert.strictEqual(API.repasseMes({ mes: 'Outubro' }).ok, false);
assert.strictEqual(API.salvarRegrasRepasse({ regras: [] }).ok, false);
// gestão muda uma regra, liga a do Victor e cria uma nova; nada é apagado
email = 'administrativo@clinicanascente.com.br';
const regras = r.regras.map(g => Object.assign({}, g));
regras.filter(g => g.profissional === 'Juliana Ribeiro' && g.convenio === 'Cedplan')[0].valorRef = 60;
regras.filter(g => g.profissional === 'Dr. Victor Cunha')[0].ativa = true;
regras.push({ ativa: true, profissional: 'Marileia Rodrigues', convenio: 'Qualquer', procedimento: '', pct: '40', valorRef: '', obs: 'nova' });
assert.strictEqual(API.salvarRegrasRepasse({ regras: regras.concat([{ profissional: '', pct: '50' }]) }).ok, false, 'regra sem profissional');
const sv = API.salvarRegrasRepasse({ regras: regras }); assert.ok(sv.ok, JSON.stringify(sv)); assert.strictEqual(sv.alteradas, 3);
const aba = ss._m['Regras de repasse'].d; assert.strictEqual(aba.filter(x => x[1]).length, 1 + 9);
assert.ok(/administrativo@/.test(aba[2][7]) && aba[1][7] === '', 'só a linha mudada ganha o carimbo');
const r2 = API.repasseMes({ mes: 'Outubro' });
assert.strictEqual(r2.linhas.filter(x => x.id === 'J4')[0].repassePrev, 24); assert.strictEqual(r2.linhas.filter(x => x.id === 'V1')[0].repassePago, 160); assert.strictEqual(r2.semRegra, 0);
console.log('regras ok · Cedplan R$ 60 → Juliana previsto R$ 24 · Victor ligado 80% → R$ 160 · recepção bloqueada');
console.log('repasse ok');
