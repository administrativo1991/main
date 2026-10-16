// node tests/servidor-parcelas.test.js — Parcelamentos (Fase 2) contra a planilha falsa: serviço parcelado (cada pagamento vira um
// lançamento no mês do pagamento, "parcela 2/3"), dívida renegociada (pagamento abatido nas linhas antigas, da mais antiga; em dia
// sai do a receber, atrasado volta), recepção cria e recebe, cancelar com motivo, nada apagado.
const assert = require('assert');
const { fmt, planilha } = require('./planilha-falsa');
const HP = ['Nome', 'Código', 'CPF', 'Data de nascimento', 'Ativo', 'Cobrança', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'Histórico de cobrança (antigo)', 'Pagador habitual (responsável financeiro)', 'Nome do pagador como aparece no extrato', 'Convênio'];
const pac = (nome, pagador) => { const l = HP.map(() => ''); l[0] = nome; l[4] = 'Sim'; l[14] = pagador || ''; l[16] = 'Particular'; return l; };
const HM = ['Data', 'Hora', 'Paciente', 'Profissional', 'Procedimento', 'Convênio (auto)', 'Modalidade (auto)', '⚠ Atenção na cobrança (auto)', 'O que aconteceu', 'Valor (R$)', 'Pago?', 'Data do pagamento', 'Forma de pagamento', 'Pagador habitual (auto)', 'Quem pagou (só se foi outra pessoa)', 'NF emitida?', 'Nº da NF', 'Guia assinada? (convênio)', 'Observação', 'ID', 'Registrado por (app)', 'Valor recebido (R$)'];
const L = (id, data, paciente, valor, pago, receb) => [data, '09:00', paciente, 'Juliana Ribeiro', 'Sessão de psicologia', 'Particular', '', '', 'Atendido', valor, pago, '', '', '', '', '', '', '', '', id, 'rec@x', receb || ''];
let AGORA = new Date(2026, 9, 16, 10, 0); const RealDate = Date;
global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(AGORA.getTime()); } static now() { return AGORA.getTime(); } };
const ss = planilha({
  Pacientes: [HP, pac('Vitor Aval'), pac('Dani Divida', 'Mae Dani'), pac('Rui Atraso')],
  'Parâmetros': [['Parâmetro', 'Valor', 'Descrição']],
  Listas: [['O que aconteceu', 'Pago?', 'Gestão'], ['Atendido', 'Sim', 'gestao@clinicanascente.com.br'], ['', 'Não', ''], ['', 'Parcial', '']],
  Profissionais: [['Profissional', 'Especialidade', 'Ativo'], ['Juliana Ribeiro', 'Psicologia', 'Sim'], ['Giovana Grossi', 'Psicologia', 'Sim']],
  Procedimentos: [['Procedimento', 'Especialidade', 'Valor', 'Obs'], ['Sessão de psicologia', 'Psicologia', 120, ''], ['Avaliação neuropsicológica', 'Psicologia', 1800, '']],
  Agosto: [HM, L('D1', '05/08/2026', 'Dani Divida', 120, 'Não')],
  Setembro: [HM, L('D2', '10/09/2026', 'Dani Divida', 120, 'Não'), L('D3', '20/09/2026', 'Dani Divida', 120, 'Parcial', 20)],
  Outubro: [HM], Novembro: [HM], Dezembro: [HM]
});
let email = 'recepcao@clinicanascente.com.br';
global.SpreadsheetApp = { getActiveSpreadsheet: () => ss, flush() { } };
global.LockService = { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) };
global.Utilities = { formatDate: fmt };
global.Session = { getActiveUser: () => ({ getEmail: () => email }) };
const API = (0, eval)(require('./carregar-servidor')());
const ok = (r, msg) => { if (!r || r.ok === false) { console.error(msg, JSON.stringify(r)); process.exit(1); } return r; };
const acordo = id => API.parcelamentos({ todos: true }).acordos.find(a => a.id === id);
const col = (aba, nome) => ss._m[aba].d[0].indexOf(nome);

// serviço parcelado (recepção cria): 1.800 em 3x a partir de hoje
assert.strictEqual(API.criarParcelamento({ tipo: 'avaliacao', paciente: 'Vitor Aval', total: 1800, parcelas: 3, primeiroVencimento: '16/10/2026', profissional: 'Giovana Grossi' }).ok, false, 'sem procedimento');
const av = ok(API.criarParcelamento({ tipo: 'avaliacao', paciente: 'Vitor Aval', total: 1800, parcelas: 3, primeiroVencimento: '16/10/2026', procedimento: 'Avaliação neuropsicológica', profissional: 'Giovana Grossi' }), 'cria avaliação');
assert.deepStrictEqual(av.vencimentos, [{ venc: '16/10/2026', valor: 600 }, { venc: '16/11/2026', valor: 600 }, { venc: '16/12/2026', valor: 600 }]);
const P = ss._m.Parcelamentos.d; assert.deepStrictEqual(P[0].slice(0, 5), ['ID', 'Data do acordo', 'Paciente', 'Pagador', 'Tipo']);
assert.strictEqual(P[1][P[0].indexOf('Vencimentos')], '16/10/2026 R$ 600,00; 16/11/2026 R$ 600,00; 16/12/2026 R$ 600,00');
assert.strictEqual(P[1][P[0].indexOf('Tipo')], 'Serviço parcelado');
// paga a 1ª: lançamento novo em Outubro, ligado ao acordo
let r = ok(API.pagarParcela({ id: av.id, valor: 600, data: '16/10/2026', forma: 'Pix', nfNumero: '77' }), 'paga 1');
assert.strictEqual(r.parcelas, 'parcela 1/3');
const O = ss._m.Outubro.d, o1 = O[O.length - 1];
assert.deepStrictEqual([o1[2], o1[3], o1[4], o1[8], o1[9], o1[10], o1[12], o1[16]], ['Vitor Aval', 'Giovana Grossi', 'Avaliação neuropsicológica', 'Atendido', 600, 'Sim', 'Pix', '77']);
assert.ok(/parcela 1\/3 do parcelamento P/.test(o1[18]), o1[18]); assert.strictEqual(o1[col('Outubro', 'Parcelamento (ID)')], av.id);
let a = acordo(av.id); assert.deepStrictEqual([a.pago, a.saldo, a.proxima.n, a.atrasado], [600, 1200, 2, false]);
assert.strictEqual(API.pagarParcela({ id: av.id, valor: 1300, forma: 'Pix' }).ok, false, 'passa do saldo');
assert.strictEqual(API.pagarParcela({ id: av.id, valor: 100 }).ok, false, 'sem forma');
r = ok(API.pagarParcela({ id: av.id, valor: 1200, data: '16/10/2026', forma: 'Cartão de crédito' }), 'paga 2 e 3');
assert.strictEqual(r.parcelas, 'parcelas 2–3/3'); assert.strictEqual(r.quitado, true);
assert.strictEqual(acordo(av.id).situacao, 'quitado'); assert.strictEqual(API.pagarParcela({ id: av.id, valor: 1, forma: 'Pix' }).ok, false);
assert.strictEqual(ss._m['Pagamentos de parcelas'].d.length, 3);
console.log('serviço parcelado ok');

// dívida renegociada: 3 sessões em aberto (120 + 120 + 100 de saldo) em 2x de 170
assert.strictEqual(API.criarParcelamento({ tipo: 'divida', paciente: 'Dani Divida', parcelas: 2, primeiroVencimento: '30/10/2026', linhas: [] }).ok, false, 'sem linhas');
const dv = ok(API.criarParcelamento({ tipo: 'divida', paciente: 'Dani Divida', parcelas: 2, primeiroVencimento: '30/10/2026', linhas: [{ aba: 'Agosto', id: 'D1' }, { aba: 'Setembro', id: 'D2' }, { aba: 'Setembro', id: 'D3' }] }), 'cria dívida');
assert.strictEqual(dv.total, 340); assert.deepStrictEqual(dv.vencimentos.map(v => v.valor), [170, 170]);
assert.strictEqual(ss._m.Agosto.d[1][col('Agosto', 'Parcelamento (ID)')], dv.id, 'linha antiga ligada (coluna nova no fim)');
assert.strictEqual(col('Agosto', 'Parcelamento (ID)'), HM.length);
const outro = API.criarParcelamento({ tipo: 'divida', paciente: 'Dani Divida', parcelas: 1, primeiroVencimento: '30/10/2026', linhas: [{ aba: 'Agosto', id: 'D1' }] });
assert.strictEqual(outro.ok, false); assert.ok(/já está no parcelamento/.test(outro.erros[0]));
email = 'gestao@clinicanascente.com.br';
assert.deepStrictEqual(ok(API.aReceber()).linhas.map(x => x.id), [], 'em dia: sai do a receber');
assert.deepStrictEqual(ok(API.gestaoResumo({ mes: 'Agosto' })).pagamentoPendente.length, 0, 'Pendências também');
email = 'recepcao@clinicanascente.com.br';
r = ok(API.pagarParcela({ id: dv.id, valor: 170, data: '20/10/2026', forma: 'Pix' }), 'paga dívida 1');
assert.deepStrictEqual(r.lancamentos, ['Agosto!D1', 'Setembro!D2']);
const A1 = ss._m.Agosto.d[1], S2 = ss._m.Setembro.d[1];
assert.strictEqual(A1[10], 'Sim'); assert.strictEqual(S2[10], 'Parcial'); assert.strictEqual(S2[21], 50);
assert.ok(/parcela 1\/2 do parcelamento/.test(A1[18]), A1[18]);
assert.strictEqual(ss._m.Outubro.d.length, 3, 'dívida não cria linha nova');
a = acordo(dv.id); assert.deepStrictEqual([a.pago, a.saldo, a.parcelas[0].situacao, a.parcelas[1].situacao], [170, 170, 'paga', 'aberta']);
console.log('dívida ok');

// atraso: em 01/12 a 2ª parcela (30/11) venceu → as linhas voltam ao a receber; serviço parcelado vencido aparece à parte
ok(API.criarParcelamento({ tipo: 'avaliacao', paciente: 'Rui Atraso', total: 300, parcelas: 2, primeiroVencimento: '20/10/2026', procedimento: 'Avaliação neuropsicológica', profissional: 'Giovana Grossi' }), 'cria 3');
AGORA = new Date(2026, 11, 1, 10, 0);
email = 'gestao@clinicanascente.com.br';
const ar = ok(API.aReceber());
assert.deepStrictEqual(ar.linhas.map(x => [x.id, x.saldo, x.parc]), [['D2', 70, dv.id], ['D3', 100, dv.id]], 'atrasado: volta');
assert.deepStrictEqual(ar.parcelasVencidas.map(x => [x.paciente, x.n, x.venc, x.valor]), [['Rui Atraso', 1, '20/10/2026', 150], ['Rui Atraso', 2, '20/11/2026', 150]]);
assert.strictEqual(acordo(dv.id).atrasado, true);
// cancelar: motivo obrigatório; some das vencidas; nada apagado
const rui = API.parcelamentos({ paciente: 'Rui Atraso' }).acordos[0];
assert.strictEqual(API.cancelarParcelamento({ id: rui.id }).ok, false);
ok(API.cancelarParcelamento({ id: rui.id, motivo: 'desistiu da avaliação' }), 'cancela');
assert.strictEqual(acordo(rui.id).situacao, 'cancelado'); assert.ok(/Cancelado: desistiu da avaliação/.test(acordo(rui.id).obs));
assert.deepStrictEqual(ok(API.aReceber()).parcelasVencidas, []);
assert.strictEqual(API.pagarParcela({ id: rui.id, valor: 10, forma: 'Pix' }).ok, false);
assert.strictEqual(ss._m.Parcelamentos.d.length, 4, '3 acordos, nenhum apagado');
console.log('atraso e cancelamento ok');
// conciliação: o Pix da parcela da dívida (170 = 120 em D1 + 50 em D2) casa com os dois recebimentos anotados nas linhas
ok(API.importarExtrato({ texto: '<STMTTRN>\n<TRNTYPE>IN\n<DTPOSTED>20261020120000\n<TRNAMT>170.00\n<FITID>X1\n<MEMO>Pix recebido - Mae Dani\n</STMTTRN>' }), 'ofx');
const cc = ok(API.conciliacao({ chave: 'Outubro/2026' }), 'conciliação');
const sx = cc.sugestoes.find(x => x.ext && x.ext.id === 'X1');
assert.ok(sx, JSON.stringify(cc.semLancamento)); assert.strictEqual(sx.tipo, 'varios'); assert.deepStrictEqual(sx.recs.map(x => [x.id, x.valor]).sort(), [['D1', 120], ['D2', 50]]);
ok(API.conciliar({ itens: [{ tipo: 'ext', id: 'X1', recs: sx.recs }] }), 'conciliar');
assert.ok(/^PagBank 20\/10\/2026/.test(ss._m.Setembro.d[1][col('Setembro', 'Conciliado')]));
console.log('conciliação da parcela ok');
console.log('servidor-parcelas: tudo ok');
