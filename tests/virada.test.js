// node tests/virada.test.js — convênio gravado na linha (gestão, 10/10): virada da aba (fórmula → valor), guarda do modo
// planilha, gravação do cadastro ao salvar, cadastro novo não muda o passado, correção pela gestão, aba nova sem fórmula
const fs = require('fs'), path = require('path'), assert = require('assert');
const { fmt, planilha } = require('./planilha-falsa');
const HM = ['Data', 'Hora', 'Paciente', 'Profissional', 'Procedimento', 'Convênio (auto)', 'Modalidade (auto)', '⚠ Atenção na cobrança (auto)', 'O que aconteceu', 'Valor (R$)', 'Pago?', 'Data do pagamento', 'Forma de pagamento', 'Pagador habitual (auto)', 'Quem pagou (só se foi outra pessoa)', 'NF emitida?', 'Nº da NF', 'Guia assinada? (convênio)', 'Observação', 'ID', 'Registrado por (app)', 'Plano (ID)'];
const HP = ['Nome', 'Código', 'CPF', 'Data de nascimento', 'Ativo', 'Cobrança', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'Histórico de cobrança (antigo)', 'Pagador habitual (responsável financeiro)', 'Nome do pagador como aparece no extrato', 'Convênio', 'Regra de cobrança', 'Observação de cobrança (a recepção lê — diz O QUE cobrar, nunca o porquê)', 'Registrado por (app)'];
const pac = (nome, cob, conv, regra, obs, pagador) => [nome, '', '', '', 'Sim', cob, '', '', '', '', '', '', '', '', pagador || '', '', conv, regra || '', obs || '', ''];
const lin = (dia, nome, conv, mod, pago, id, extra) => HM.map(h => ({ Data: dia + '/09/2026', Paciente: nome, Profissional: 'Juliana Ribeiro', 'Convênio (auto)': conv, 'Modalidade (auto)': mod, 'O que aconteceu': 'Atendido', 'Valor (R$)': 40, 'Pago?': pago, ID: id, 'Registrado por (app)': 'importado' })[h] ?? (extra || {})[h] ?? '');
const LISTAS = [['O que aconteceu', 'Pago?', 'Forma de pagamento', 'Sim/Não', 'Guia assinada?', 'Convênio', 'Regra de cobrança', 'Cobrança'], ['Atendido', 'Sim', 'Pix', 'Sim', 'Sim', 'Particular', 'Tabela', 'Tabela'], ['', 'Convênio (fatura)', '', '', '', 'Sabin Sinai', '', 'Convênio'], ['', 'Não', '', '', '', 'Cedplan', '', 'Por sessão (combinado)']];
const ss = planilha({
  Pacientes: [HP, pac('Ana Teste', 'Convênio', 'Sabin Sinai', '', 'guia antes da sessão', 'Mãe da Ana'), pac('Bia Teste', 'Convênio', 'Cedplan', 'Valor fixo', 'R$ 70'), pac('Caio Teste', '', '', '', 'trocou de convênio')],
  Setembro: [HM, lin('03', 'Ana Teste', 'Sabin Sinai', 'Convênio', 'Convênio (fatura)', 'S1'), lin('04', 'Bia Teste', 'Cedplan', 'Convênio', 'Convênio (fatura)', 'S2'), lin('05', 'Caio Teste', '', '', 'Convênio (fatura)', 'S3')],
  Outubro: [HM, lin('01', 'Ana Teste', 'Sabin Sinai', 'Convênio', 'Convênio (fatura)', 'O1')],
  Listas: LISTAS,
  'Regras de repasse': [['Ativa', 'Profissional', 'Convênio', 'Procedimento (contém)', '% repasse', 'Valor da sessão (convênio) (R$)', 'Observação', 'Alterado por (app)'], ['Sim', 'Juliana Ribeiro', 'Qualquer', '', 80, '', '', '']]
});
ss._m.Outubro.d.forEach(r => { r[0] = r[0].replace('/09/', '/10/'); });
['Setembro', 'Outubro'].forEach(a => [6, 7, 8, 14].forEach(c => ss._m[a].setFormula(2, c, '=ARRAYFORMULA(VLOOKUP(C2:C;Pacientes!A:S;17;0))')));
let email = 'administrativo@clinicanascente.com.br';
const AGORA = new Date(2026, 9, 10, 15, 0), RealDate = Date;
global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(AGORA.getTime()); } static now() { return AGORA.getTime(); } };
global.SpreadsheetApp = { getActiveSpreadsheet: () => ss, flush() { } };
global.LockService = { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) };
global.Utilities = { formatDate: fmt };
global.Session = { getActiveUser: () => ({ getEmail: () => email }) };
const R = p => fs.readFileSync(path.join(__dirname, '..', 'app/server', p), 'utf8');
const API = (0, eval)(R('duplicatas.js') + '\n' + R('server.js'));
const S = ss._m.Setembro, O = ss._m.Outubro, linhaId = (s, id) => s.d.find(r => r[19] === id);
const novoReg = () => ({ paciente: 'Ana Teste', profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia – convênio', data: '10/10/2026', oque: 'Atendido', pago: 'Convênio (fatura)' });

// 1. guarda: em modo planilha nada é gravado
const g = API.registrarAtendimento(novoReg());
assert.strictEqual(g.ok, false); assert.ok(/Outubro ainda está em modo planilha/.test(g.erros[0]), g.erros[0]);
assert.strictEqual(API.corrigirLancamento({ aba: 'Setembro', id: 'S1', campos: { guia: 'Sim' } }).ok, false, 'correção também espera a virada');
assert.strictEqual(API.gestaoResumo({ mes: 'Setembro' }).virada.modo, 'planilha');
// 2. virada: #REF! para sem gravar; recepção não vira; depois a fórmula some e os valores ficam iguais
const repAntes = JSON.stringify(API.repasseMes({ mes: 'Setembro' }).porProfissional);
S.d[2][5] = '#REF!'; let v = API.virarAbaMes({ mes: 'Setembro' }); assert.strictEqual(v.ok, false); assert.ok(/F3 \(#REF!\)/.test(v.erros[0]), v.erros[0]); assert.ok(S.f['2,6']); S.d[2][5] = 'Cedplan';
email = 'atendimento@clinicanascente.com.br'; assert.strictEqual(API.virarAbaMes({ mes: 'Setembro' }).ok, false); email = 'administrativo@clinicanascente.com.br';
const fotoSet = JSON.stringify(S.d);
v = API.virarAbaMes({ mes: 'Setembro' }); assert.ok(v.ok && v.diferencas === 0 && v.linhas === 3, JSON.stringify(v));
assert.ok(/^Setembro · virada para o app em 10\/10\/2026 15:00 por administrativo@/.test(v.texto), v.texto);
assert.strictEqual(JSON.stringify(S.d), fotoSet, 'virada não muda nenhum valor'); assert.deepStrictEqual(Object.keys(S.f), []);
assert.strictEqual(JSON.stringify(API.repasseMes({ mes: 'Setembro' }).porProfissional), repAntes, 'repasse idêntico');
const ja = API.virarAbaMes({ mes: 'Setembro' }); assert.ok(ja.jaVirada && /Já virada em 10\/10\/2026 15:00/.test(ja.mensagem), ja.mensagem);
assert.strictEqual(API.gestaoResumo({ mes: 'Setembro' }).virada.viradaEm, '10/10/2026 15:00');
assert.ok(API.virarAbaMes({ mes: 'Outubro' }).ok);
// 3. card "Linhas de convênio sem convênio" (só gestão) e correção pela gestão (convênio + modalidade), pelo ID
let sc = API.gestaoResumo({ mes: 'Setembro' }).semConvenio; assert.deepStrictEqual(sc.map(l => l.id), ['S3']);
email = 'atendimento@clinicanascente.com.br';
assert.deepStrictEqual(API.gestaoResumo({ mes: 'Setembro' }).semConvenio, []);
assert.strictEqual(API.corrigirLancamento({ aba: 'Setembro', id: 'S3', campos: { convenio: 'Sabin Sinai' } }).ok, false, 'recepção não troca convênio');
email = 'administrativo@clinicanascente.com.br';
assert.strictEqual(API.corrigirLancamento({ aba: 'Setembro', id: 'S3', campos: { convenio: 'Unimed' } }).ok, false, 'fora da lista');
const antes3 = linhaId(S, 'S3').slice();
const c3 = API.corrigirLancamento({ aba: 'Setembro', id: 'S3', campos: { convenio: 'Sabin Sinai', modalidade: 'Convênio' } }); assert.ok(c3.ok, JSON.stringify(c3));
const l3 = linhaId(S, 'S3'); assert.strictEqual(l3[5], 'Sabin Sinai'); assert.strictEqual(l3[6], 'Convênio');
l3.forEach((x, i) => { if (i !== 5 && i !== 6 && i !== 20) assert.strictEqual(x, antes3[i], 'coluna ' + (i + 1) + ' não muda'); });
assert.strictEqual(l3[20], 'importado | corrigido por administrativo@clinicanascente.com.br · 10/10/2026 15:00 (Convênio, Modalidade)');
const alt = ss._m['Alterações de lançamento'].d; assert.deepStrictEqual(alt.slice(-2).map(r => [r[2], r[4], r[5], r[6]]), [['S3', 'Convênio', '', 'Sabin Sinai'], ['S3', 'Modalidade', '', 'Convênio']]);
assert.deepStrictEqual(API.gestaoResumo({ mes: 'Setembro' }).semConvenio, []);
// 4. atendimento novo grava F/G/H/N do cadastro de agora
const r1 = API.registrarAtendimento(novoReg()); assert.ok(r1.ok, JSON.stringify(r1));
assert.deepStrictEqual([5, 6, 7, 13].map(c => O.d[r1.linha - 1][c]), ['Sabin Sinai', 'Convênio', 'guia antes da sessão', 'Mãe da Ana']);
const r2 = API.registrarAtendimento(Object.assign(novoReg(), { paciente: 'Bia Teste' }));
assert.strictEqual(O.d[r2.linha - 1][7], 'Valor fixo — R$ 70', 'Atenção = Regra — Observação, como a fórmula');
// 5. cadastro novo não muda o passado; só as linhas do mês aberto de hoje em diante, se a gestão confirmar
const fotos = JSON.stringify([S.d, O.d]);
assert.ok(API.atualizarCadastro({ nome: 'Ana Teste', quemInformou: 'teste', campos: { convenio: 'Cedplan' } }).ok);
assert.strictEqual(JSON.stringify([S.d, O.d]), fotos, 'nenhuma célula de Setembro/Outubro mudou');
const ab = API.linhasAbertasPaciente({ nome: 'Ana Teste' }); assert.deepStrictEqual(ab.linhas.map(l => l.id), [r1.id], 'só a de hoje (a de 01/10 fica)');
const up = API.atualizarLinhasDoCadastro({ nome: 'Ana Teste', ids: [r1.id, 'O1'] }); assert.deepStrictEqual(up.atualizadas, [r1.id]);
assert.strictEqual(O.d[r1.linha - 1][5], 'Cedplan'); assert.strictEqual(linhaId(O, 'O1')[5], 'Sabin Sinai'); assert.strictEqual(linhaId(S, 'S1')[5], 'Sabin Sinai');
const r3 = API.registrarAtendimento(novoReg()); assert.strictEqual(O.d[r3.linha - 1][5], 'Cedplan');
// 6. paciente trocado na correção: a linha leva o cadastro do paciente certo
const c6 = API.corrigirLancamento({ aba: 'Outubro', id: r3.id, campos: { paciente: 'Caio Teste', quemInformou: 'lançado no paciente errado' } }); assert.ok(c6.ok, JSON.stringify(c6));
assert.deepStrictEqual([5, 6, 7, 13].map(c => O.d[r3.linha - 1][c]), ['', '', 'trocou de convênio', '']);
// 7. aba nova nasce sem fórmula e sem dados (só cabeçalho)
const nov = API.criarAbaMes({ nome: 'Novembro' }); assert.ok(nov.ok); assert.deepStrictEqual(nov.formulas, []);
assert.strictEqual(ss._m.Novembro.getLastRow(), 1); assert.strictEqual(ss._m.Novembro.d[0][5], 'Convênio (auto)');
console.log('virada ok · guarda · #REF! · Emily-like · cadastro novo não muda o passado · aba nova sem fórmula');
