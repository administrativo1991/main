// node tests/perdido-glosa.test.js [copia.json ID-da-linha] — Pago? = "Perdido / glosa" (gestão, 10/10)
// Sem argumentos usa uma planilha de exemplo. Com uma cópia dos dados reais (JSON { aba: [[...linhas]] }) e o ID de uma
// linha, roda o mesmo roteiro em cima da cópia: nada é gravado na planilha real.
const fs = require('fs'), path = require('path'), assert = require('assert');
const { fmt, planilha } = require('./planilha-falsa');

const HM = ['Data', 'Hora', 'Paciente', 'Profissional', 'Procedimento', 'Convênio (auto)', 'Modalidade (auto)', '⚠ Atenção na cobrança (auto)', 'O que aconteceu', 'Valor (R$)', 'Pago?', 'Data do pagamento', 'Forma de pagamento', 'Pagador habitual (auto)', 'Quem pagou (só se foi outra pessoa)', 'NF emitida?', 'Nº da NF', 'Guia assinada? (convênio)', 'Observação', 'ID', 'Registrado por (app)', 'Plano (ID)'];
function linha(o) { return HM.map(h => o[h] != null ? o[h] : ''); }
function exemplo() {
  const HP = ['Nome', 'Código de controle (ControleOdonto)', 'CPF', 'Data de nascimento', 'Ativo', 'Cobrança', 'ID ControleOdonto (pessoaId)', 'Grupo de duplicata', 'Motivo da duplicata', 'Possível não-paciente', 'Anotação no campo "controle" (original)', 'Observação da extração', 'Decisão da revisão (Roberta, 29/09)', 'Histórico de cobrança (antigo)', 'Pagador habitual (responsável financeiro)', 'Nome do pagador como aparece no extrato', 'Convênio'];
  const pac = (n, cob, conv) => { const l = HP.map(() => ''); l[0] = n; l[4] = 'Sim'; l[5] = cob; l[16] = conv; return l; };
  const d = new Date(2026, 8, 25, 12);
  return {
    Pacientes: [HP, pac('Emilia Convenio Teste', 'Convênio', 'Sabin Sinai'), pac('Bruno Particular Teste', 'Tabela', 'Particular')],
    Listas: [['O que aconteceu', 'Pago?'], ['Atendido', 'Sim'], ['Faltou sem aviso', 'Não'], ['', 'Convênio (fatura)'], ['', 'Pacote (sessão já paga)'], ['', 'Não se aplica (pro bono / permuta)'], ['', 'Perdido / glosa'], ['', 'Parcial'], ['', 'Incluída na mensalidade']],
    Profissionais: [['Profissional', 'Especialidade'], ['Juliana Ribeiro', 'Psicologia']],
    Procedimentos: [['Procedimento', 'Especialidade', 'Valor', 'Obs'], ['Sessão de psicologia', 'Psicologia', 120, '']],
    Setembro: [HM,
      linha({ Data: d, Paciente: 'Emilia Convenio Teste', Profissional: 'Juliana Ribeiro', Procedimento: 'Sessão de psicologia – convênio', 'Convênio (auto)': 'Sabin Sinai', 'O que aconteceu': 'Atendido', 'Pago?': 'Convênio (fatura)', 'Guia assinada? (convênio)': 'Não', ID: 'A-T1', 'Registrado por (app)': 'recepcao · 25/09/2026 10:00' }),
      linha({ Data: d, Paciente: 'Bruno Particular Teste', Profissional: 'Juliana Ribeiro', Procedimento: 'Sessão de psicologia', 'Convênio (auto)': 'Particular', 'O que aconteceu': 'Atendido', 'Valor (R$)': 120, 'Pago?': 'Não', ID: 'A-T2' }),
      linha({ Data: d, Paciente: 'Bruno Particular Teste', Profissional: 'Juliana Ribeiro', Procedimento: 'Sessão de psicologia', 'Convênio (auto)': 'Particular', 'O que aconteceu': 'Atendido', 'Valor (R$)': 120, 'Pago?': 'Sim', 'Forma de pagamento': 'Pix', ID: 'A-T3' })]
  };
}
const real = process.argv[2], abas = real ? JSON.parse(fs.readFileSync(real, 'utf8')) : exemplo(), ID = process.argv[3] || 'A-T1';
if (real) Object.keys(abas).forEach(k => { abas[k] = abas[k].map(l => l.map(v => (typeof v === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(v)) ? new Date(+v.slice(6), +v.slice(3, 5) - 1, +v.slice(0, 2), 12) : v)); });
const ss = planilha(abas);
let email = 'administrativo@clinicanascente.com.br';
global.SpreadsheetApp = { getActiveSpreadsheet: () => ss, flush() { }, openById: () => ss, create: () => ss };
global.LockService = { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) };
global.Utilities = { formatDate: fmt };
global.Session = { getActiveUser: () => ({ getEmail: () => email }) };
const R = p => fs.readFileSync(path.join(__dirname, '..', 'app/server', p), 'utf8');
const S = (0, eval)(R('duplicatas.js') + '\n' + R('server.js') + '\n;({ API: API, pendenciasDe_: pendenciasDe_ })'), API = S.API;
const brl = n => 'R$ ' + (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
const resumo = () => { const r = API.gestaoResumo({ mes: 'Setembro' }); assert.ok(r.ok, JSON.stringify(r)); return r; };
const aReceber = r => r.pagamentoPendente.reduce((a, x) => a + (x.pago === 'Parcial' ? x.valor - (x.recebido || 0) : x.valor || 0), 0);
const tem = (l, id) => (l || []).some(x => x.id === id);
const sm = ss._m.Setembro, hS = sm.d[0], col = n => hS.indexOf(n), linhaDe = id => sm.d.findIndex(l => String(l[col('ID')]) === id);
assert.ok(linhaDe(ID) > 0, 'ID ' + ID + ' não está na aba Setembro');
const antes = resumo(), lin0 = sm.d[linhaDe(ID)].slice();
const pacT = lin0[col('Paciente')], dataT = lin0[col('Data')] instanceof Date ? lin0[col('Data')] : new Date();
const pend0 = S.pendenciasDe_([pacT], new Date(dataT.getFullYear(), dataT.getMonth() + 1, 5))[pacT] || [];
console.log('ANTES   · linha ' + (linhaDe(ID) + 1) + ' ' + ID + ' · ' + pacT + ' · Pago? = "' + lin0[col('Pago?')] + '" · Valor = ' + (lin0[col('Valor (R$)')] || '(vazio)'));
console.log('          a receber (particular) ' + brl(aReceber(antes)) + ' · está no a receber? ' + tem(antes.pagamentoPendente, ID) + ' · convênio sem guia? ' + tem(antes.semGuia, ID) + ' · pendência na chegada? ' + pend0.some(x => x.id === ID) + ' · recebido ' + brl(antes.recebido) + ' · perdidos ' + antes.perdidos.length);

// 1) recepção não marca
email = 'atendimento@clinicanascente.com.br';
let r = API.corrigirLancamento({ aba: 'Setembro', id: ID, campos: { pago: 'Perdido / glosa', motivoPerdido: 'teste' } });
assert.strictEqual(r.ok, false); console.log('recepção tenta marcar → recusado: ' + r.erros[0]);
assert.strictEqual(API.registrarAtendimento({ paciente: pacT, profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia', data: '25/09/2026', oque: 'Atendido', pago: 'Perdido / glosa', observacao: 'x' }).ok, false);
// 2) gestão sem motivo → recusado
email = 'administrativo@clinicanascente.com.br';
r = API.corrigirLancamento({ aba: 'Setembro', id: ID, campos: { pago: 'Perdido / glosa' } });
assert.strictEqual(r.ok, false); console.log('gestão sem motivo → recusado: ' + r.erros[0]);
// 3) gestão marca, com motivo e valor de referência
r = API.corrigirLancamento({ aba: 'Setembro', id: ID, campos: { pago: 'Perdido / glosa', motivoPerdido: 'TESTE guia não autorizada pelo convênio', valor: '40', quemInformou: 'teste perdido/glosa' } });
assert.ok(r.ok, JSON.stringify(r));
const lin1 = sm.d[linhaDe(ID)];
assert.strictEqual(lin1[col('Pago?')], 'Perdido / glosa'); assert.strictEqual(lin1[col('Valor (R$)')], 40);
assert.ok(/PERDIDO \/ glosa: TESTE guia não autorizada/.test(lin1[col('Observação')]));
assert.ok(/corrigido por administrativo@clinicanascente\.com\.br · .*\(.*Pago\?.*\)/.test(lin1[col('Registrado por (app)')]));
const depois = resumo(), pend1 = S.pendenciasDe_([pacT], new Date(dataT.getFullYear(), dataT.getMonth() + 1, 5))[pacT] || [];
assert.ok(!tem(depois.pagamentoPendente, ID) && !tem(depois.semGuia, ID) && !tem(depois.faltas, ID) && !pend1.some(x => x.id === ID));
assert.ok(tem(depois.perdidos, ID)); assert.strictEqual(depois.recebido, antes.recebido);
const p1 = depois.perdidos.filter(x => x.id === ID)[0];
console.log('DEPOIS  · Pago? = "' + lin1[col('Pago?')] + '" · Valor = ' + lin1[col('Valor (R$)')] + ' · Data/Forma do pagamento: "' + lin1[col('Data do pagamento')] + '" / "' + lin1[col('Forma de pagamento')] + '"');
console.log('          a receber (particular) ' + brl(aReceber(depois)) + ' · está no a receber? ' + tem(depois.pagamentoPendente, ID) + ' · convênio sem guia? ' + tem(depois.semGuia, ID) + ' · pendência na chegada? ' + pend1.some(x => x.id === ID) + ' · recebido ' + brl(depois.recebido));
console.log('          relatório "Perdidos e glosas": ' + depois.perdidos.length + ' linha(s), ' + brl(depois.perdidos.reduce((a, x) => a + (x.valor || 0), 0)) + ' · ' + [p1.data, p1.paciente, p1.profissional, p1.convenio || '—', brl(p1.valor), p1.obs].join(' | '));
console.log('          coluna U: ' + lin1[col('Registrado por (app)')]);
// 4) recepção vê o status mas não recebe nem desmarca; não aparece o relatório
email = 'atendimento@clinicanascente.com.br';
assert.strictEqual(API.corrigirLancamento({ aba: 'Setembro', id: ID, campos: { recebidoAgora: '40', forma: 'Pix' } }).ok, false);
assert.strictEqual(API.corrigirLancamento({ aba: 'Setembro', id: ID, campos: { pago: 'Sim', forma: 'Pix' } }).ok, false);
assert.deepStrictEqual(resumo().perdidos, []);
assert.strictEqual(API.lancamentos({ mes: 'Setembro', paciente: pacT }).linhas.filter(x => x.id === ID)[0].pago, 'Perdido / glosa');
console.log('recepção: vê "Perdido / glosa" na linha, não recebe nem desmarca, não vê o relatório');
// 5) o dinheiro entrou: gestão troca pra Sim
email = 'administrativo@clinicanascente.com.br';
r = API.corrigirLancamento({ aba: 'Setembro', id: ID, campos: { pago: 'Sim', dataPagamento: '05/10/2026', forma: 'Pix' } });
assert.ok(r.ok, JSON.stringify(r));
const fim = resumo();
assert.ok(!tem(fim.perdidos, ID)); assert.strictEqual(Math.round((fim.recebido - antes.recebido) * 100) / 100, /^Atendido/.test(lin1[col('O que aconteceu')]) ? 40 : 0);
console.log('gestão troca pra Sim (05/10, Pix) → sai dos perdidos, recebido +' + brl(fim.recebido - antes.recebido));
console.log('perdido/glosa ok');
