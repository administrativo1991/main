// node tests/servidor-alertas.test.js — Alertas (Fase 2) contra a planilha falsa: um paciente para cada alerta escolhido pela
// gestão (dívida antiga, faltas repetidas, parou de vir, mês atrasado sem cobrança, cobrado e não pagou, avaliação parada,
// parcela vencida, sem celular), um paciente sem alerta, a lista do dia e a Ficha trazendo os avisos, e o cache renovando.
const assert = require('assert');
const { fmt, planilha } = require('./planilha-falsa');
const HP = ['Nome', 'Código', 'CPF', 'Data de nascimento', 'Ativo', 'Cobrança', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'Histórico de cobrança (antigo)', 'Pagador habitual (responsável financeiro)', 'Nome do pagador como aparece no extrato', 'Convênio', 'Regra de cobrança', 'Observação de cobrança (a recepção lê — diz O QUE cobrar, nunca o porquê)', 'Registrado por (app)', 'WhatsApp do pagador'];
const pac = (nome, whats) => { const l = HP.map(() => ''); l[0] = nome; l[4] = 'Sim'; l[16] = 'Particular'; l[20] = whats === undefined ? '(32) 9 8888-0000' : whats; return l; };
const HM = ['Data', 'Hora', 'Paciente', 'Profissional', 'Procedimento', 'Convênio (auto)', 'Modalidade (auto)', '⚠ Atenção na cobrança (auto)', 'O que aconteceu', 'Valor (R$)', 'Pago?', 'Data do pagamento', 'Forma de pagamento', 'Pagador habitual (auto)', 'Quem pagou (só se foi outra pessoa)', 'NF emitida?', 'Nº da NF', 'Guia assinada? (convênio)', 'Observação', 'ID', 'Registrado por (app)'];
const L = (id, data, paciente, oque, valor, pago, prof, proc) => [data, '09:00', paciente, prof || 'Juliana Ribeiro', proc || 'Sessão de psicologia', 'Particular', '', '', oque, valor, pago, '', '', '', '', '', '', '', '', id, 'rec@x'];
const HC = ['ID', 'Paciente', 'Profissional', 'Ativo', 'Cobrança', 'Convênio', 'Valor por sessão (R$)', 'Valor mensal (R$)', 'Pagamento', 'Vigente desde', 'Vigente até', 'Valor decidido por', 'Valor decidido em', 'Observação de cobrança', 'Registrado por (app)'];
const cpp = (id, p, cob, vs, vm, pg, desde) => [id, p, 'Juliana Ribeiro', 'Sim', cob, '', vs == null ? '' : vs, vm == null ? '' : vm, pg, desde || '', '', 'gestão', '15/10/2026', '', 'carga'];
const fixo = (id, p, dia, hora, comeca) => [id, p, 'Juliana Ribeiro', dia, hora, 'Semanal', comeca, '', 'Sim', '', ''];
const AGORA = new Date(2026, 9, 16, 10, 0), RealDate = Date; // sexta, 16/10/2026
global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(AGORA.getTime()); } static now() { return AGORA.getTime(); } };
const APL = 'Aplicação de teste – avaliação neuropsicológica';
const ss = planilha({
  Pacientes: [HP, pac('Dora Divida'), pac('Fabi Faltas'), pac('Paulo Parou'), pac('Mara Mensal'), pac('Cris Cobrada'), pac('Vera Aval'), pac('Pedro Parcela'), pac('Zeca Semzap', ''), pac('Tito Fixo', '(32) 3215-1234'), pac('Tudo Certo')],
  'Cobrança por profissional': [HC, cpp('C1', 'Mara Mensal', 'Mensalidade fixa', null, 200, 'Antecipado', '01/10/2026'), cpp('C2', 'Cris Cobrada', 'Mensalidade fixa', null, 150, 'Antecipado', '01/10/2026'), cpp('C3', 'Tudo Certo', 'Por sessão', 70, null, 'Na hora')],
  'Valores por sessão': [['Especialidade', 'Valor', 'Nome', 'Ativo'], ['Psicologia', 120, 'cheio', 'Sim']],
  'Parâmetros': [['Parâmetro', 'Valor', 'Descrição'], ['vencimento_dia', 10, ''], ['tolerancia_dia', 15, ''], ['taxa_falta_pct', 50, '']],
  Listas: [['O que aconteceu', 'Pago?', 'Gestão'], ['Atendido', 'Sim', 'gestao@clinicanascente.com.br'], ['Faltou sem aviso', 'Não', ''], ['Faltou avisando em cima da hora (< 24h)', 'Parcial', ''], ['Faltou com aviso', 'Não se aplica (pro bono / permuta)', '']],
  Profissionais: [['Profissional', 'Especialidade', 'Ativo'], ['Juliana Ribeiro', 'Psicologia', 'Sim'], ['Giovana Grossi', 'Psicologia', 'Sim']],
  Procedimentos: [['Procedimento', 'Especialidade', 'Valor', 'Obs'], ['Sessão de psicologia', 'Psicologia', 120, ''], [APL, 'Psicologia', 0, ''], ['Avaliação neuropsicológica', 'Psicologia', 1800, '']],
  Mensalistas: [['Paciente', 'Modalidade', 'Valor mensal hoje (R$)', 'Pagador habitual']],
  'Agenda recorrente': [['ID', 'Paciente', 'Profissional', 'Dia da semana', 'Hora', 'Frequência', 'Começa em', 'Termina em', 'Ativo', 'Observação', 'Registrado por (app)'],
    fixo('F1', 'Paulo Parou', 'Quarta', '14:00', '01/09/2026'), fixo('F2', 'Dora Divida', 'Sexta', '09:00', '01/10/2026'), fixo('F3', 'Tudo Certo', 'Terça', '10:00', '01/09/2026'), fixo('F4', 'Zeca Semzap', 'Sexta', '11:00', '09/10/2026')],
  'Lista do dia': [['ID', 'Data', 'Hora', 'Paciente', 'Profissional', 'Origem', 'Observação', 'Registrado por (app)']],
  'Mensagens WhatsApp': [['ID', 'Data/hora', 'Tipo', 'Pagador', 'WhatsApp', 'Paciente', 'Profissional', 'Data da sessão', 'Hora', 'Registrado por (app)', 'Competência', 'Valor (R$)'],
    ['M1', '05/10/2026 10:00', 'Cobrança mensalidade', 'Cris', '(32) 9 8888-0000', 'Cris Cobrada', 'Juliana Ribeiro', '', '', 'rec@x', 'Outubro/2026', 150]],
  'Alterações de cadastro': [['Data/hora', 'Paciente', 'Campo', 'De', 'Para', 'Quem informou', 'Registrado por (app)']],
  'Alterações de lançamento': [['Data/hora', 'Aba', 'ID', 'Paciente', 'Campo', 'De', 'Para', 'Quem informou', 'Registrado por (app)']],
  Setembro: [HM, L('S1', '01/09/2026', 'Dora Divida', 'Atendido', 120, 'Não'), L('S2', '05/09/2026', 'Dora Divida', 'Atendido', 120, 'Não'), L('S3', '25/09/2026', 'Fabi Faltas', 'Faltou sem aviso', '', ''),
    L('S4', '10/09/2026', 'Paulo Parou', 'Atendido', 120, 'Sim'), L('S5', '10/09/2026', 'Vera Aval', 'Atendido', '', 'Não se aplica (pro bono / permuta)', 'Giovana Grossi', APL), L('S6', '20/09/2026', 'Vera Aval', 'Atendido', '', 'Não se aplica (pro bono / permuta)', 'Giovana Grossi', APL)],
  Outubro: [HM, L('O1', '10/10/2026', 'Dora Divida', 'Atendido', 120, 'Não'), L('O2', '09/10/2026', 'Fabi Faltas', 'Faltou avisando em cima da hora (< 24h)', '', ''), L('O3', '02/10/2026', 'Fabi Faltas', 'Faltou com aviso', '', ''),
    L('O4', '01/10/2026', 'Vera Aval', 'Atendido', '', 'Não se aplica (pro bono / permuta)', 'Giovana Grossi', APL), L('O5', '13/10/2026', 'Tudo Certo', 'Atendido', 70, 'Sim')],
  Novembro: [HM]
});
global.SpreadsheetApp = { getActiveSpreadsheet: () => ss, flush() { } };
global.LockService = { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) };
global.Utilities = { formatDate: fmt };
global.Session = { getActiveUser: () => ({ getEmail: () => 'recepcao@clinicanascente.com.br' }) };
const API = (0, eval)(require('./carregar-servidor')());
const ok = (r, msg) => { if (!r || r.ok === false) { console.error(msg, JSON.stringify(r)); process.exit(1); } return r; };
ok(API.criarParcelamento({ tipo: 'avaliacao', paciente: 'Pedro Parcela', total: 1200, parcelas: 2, primeiroVencimento: '01/10/2026', procedimento: 'Avaliação neuropsicológica', profissional: 'Giovana Grossi' }), 'parcelamento');

const TODOS = ['Dora Divida', 'Fabi Faltas', 'Paulo Parou', 'Mara Mensal', 'Cris Cobrada', 'Vera Aval', 'Pedro Parcela', 'Zeca Semzap', 'Tito Fixo', 'Tudo Certo'];
let al = ok(API.alertas({ pacientes: TODOS })).alertas;
const tipos = n => (al[n] || []).map(a => a.tipo);
const txt = n => (al[n] || []).map(a => a.texto).join(' | ');
assert.deepStrictEqual(tipos('Dora Divida'), ['divida']); assert.ok(/Deve R\$ 240,00 de 2 sessões sem pagamento, a mais antiga de 01\/09 \(45 dias\)/.test(txt('Dora Divida')), txt('Dora Divida'));
assert.strictEqual(al['Dora Divida'][0].cor, 'laranja');
assert.deepStrictEqual(tipos('Fabi Faltas'), ['faltas']); assert.ok(/2 faltas .*\(25\/09, 09\/10\)/.test(txt('Fabi Faltas')), txt('Fabi Faltas'));
assert.deepStrictEqual(tipos('Paulo Parou'), ['parou']); assert.ok(/quarta 14:00 com Juliana Ribeiro.*10\/09 \(36 dias\)/.test(txt('Paulo Parou')), txt('Paulo Parou'));
assert.deepStrictEqual(tipos('Mara Mensal'), ['atrasado']); assert.ok(/^Outubro com Juliana Ribeiro atrasado e ainda não cobrado/.test(txt('Mara Mensal')), txt('Mara Mensal'));
assert.deepStrictEqual(tipos('Cris Cobrada'), ['cobrado']); assert.ok(/Cobrado no WhatsApp em 05\/10 \(há 11 dias\) e outubro/.test(txt('Cris Cobrada')), txt('Cris Cobrada'));
assert.deepStrictEqual(tipos('Vera Aval'), ['avaliacao']); assert.ok(/3 aplicações, a última em 01\/10 \(15 dias\)/.test(txt('Vera Aval')), txt('Vera Aval'));
assert.deepStrictEqual(tipos('Pedro Parcela'), ['parcela']); assert.ok(/Parcela 1\/2 de Avaliação neuropsicológica venceu em 01\/10: falta R\$ 600,00/.test(txt('Pedro Parcela')), txt('Pedro Parcela'));
assert.deepStrictEqual(tipos('Zeca Semzap'), ['whats']); assert.deepStrictEqual(tipos('Tito Fixo'), ['whats'], 'telefone fixo não é WhatsApp');
assert.ok(!al['Tudo Certo'], 'sem alerta: ' + txt('Tudo Certo'));
console.log('um alerta de cada ok');

// Agenda: a lista do dia traz os alertas dos pacientes do dia (sexta: Dora e Zeca têm horário fixo)
const dia = ok(API.listaDoDia({ data: '16/10/2026' }), 'lista do dia');
assert.deepStrictEqual(Object.keys(dia.alertas).sort(), ['Dora Divida', 'Zeca Semzap']);
// Ficha: os alertas do paciente
assert.deepStrictEqual(ok(API.fichaPaciente({ nome: 'Pedro Parcela' })).alertas.map(a => a.tipo), ['parcela']);
assert.deepStrictEqual(ok(API.fichaPaciente({ nome: 'Tudo Certo' })).alertas, []);
console.log('agenda e ficha ok');

// o cache renova: cobrar a Mara no WhatsApp tira o "não cobrado"; receber da Dora tira a dívida
ok(API.marcarMensagemEnviada({ tipo: 'Cobrança mensalidade', competencia: 'Outubro/2026', pagador: 'Mara', fone: '32988880000', itens: [{ paciente: 'Mara Mensal', profissional: 'Juliana Ribeiro', valor: 200 }] }), 'cobrou');
ok(API.corrigirLancamento({ aba: 'Setembro', id: 'S1', campos: { recebidoAgora: 120, forma: 'Pix', dataPagamento: '16/10/2026' } }), 'recebeu S1');
ok(API.corrigirLancamento({ aba: 'Setembro', id: 'S2', campos: { recebidoAgora: 120, forma: 'Pix', dataPagamento: '16/10/2026' } }), 'recebeu S2');
al = ok(API.alertas({ pacientes: TODOS })).alertas;
assert.ok(!al['Mara Mensal'], 'cobrada hoje: ' + txt('Mara Mensal'));
assert.ok(!al['Dora Divida'], 'pagou: ' + txt('Dora Divida'));
assert.deepStrictEqual(tipos('Cris Cobrada'), ['cobrado']);
console.log('cache renovado ok');
console.log('servidor-alertas: tudo ok');
