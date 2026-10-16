// node tests/servidor-perdas.test.js — "A receber" de todos os meses (com a idade) e perdas do ano (Fase 2), contra a planilha falsa:
// mesma regra de Pendências, só a gestão vê e marca, várias linhas como "Perdido / glosa" de uma vez (com motivo), e o relatório.
const assert = require('assert');
const { fmt, planilha } = require('./planilha-falsa');
const HP = ['Nome', 'Código', 'CPF', 'Data de nascimento', 'Ativo', 'Cobrança', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'Histórico de cobrança (antigo)', 'Pagador habitual (responsável financeiro)', 'Nome do pagador como aparece no extrato', 'Convênio'];
const pac = (nome, pagador) => { const l = HP.map(() => ''); l[0] = nome; l[4] = 'Sim'; l[14] = pagador || ''; l[16] = 'Particular'; return l; };
const HM = ['Data', 'Hora', 'Paciente', 'Profissional', 'Procedimento', 'Convênio (auto)', 'Modalidade (auto)', '⚠ Atenção na cobrança (auto)', 'O que aconteceu', 'Valor (R$)', 'Pago?', 'Data do pagamento', 'Forma de pagamento', 'Pagador habitual (auto)', 'Quem pagou (só se foi outra pessoa)', 'NF emitida?', 'Nº da NF', 'Guia assinada? (convênio)', 'Observação', 'ID', 'Registrado por (app)', 'Valor recebido (R$)'];
const L = (id, data, paciente, valor, pago, o) => { o = o || {}; return [data, '09:00', paciente, o.prof || 'Juliana Ribeiro', o.proc || 'Sessão de psicologia', o.conv || 'Particular', '', '', o.oque || 'Atendido', valor, pago, '', '', '', '', '', '', '', o.obs || '', id, 'rec@x', o.receb || '']; };
const AGORA = new Date(2026, 9, 16, 10, 0), RealDate = Date;
global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(AGORA.getTime()); } static now() { return AGORA.getTime(); } };
const ss = planilha({
  Pacientes: [HP, pac('Ana Antiga', 'Carla Antiga'), pac('Bruno Parcial'), pac('Fabio Agosto'), pac('Eva Paga'), pac('Gil Perdido')],
  'Parâmetros': [['Parâmetro', 'Valor', 'Descrição']],
  Listas: [['O que aconteceu', 'Pago?', 'Gestão'], ['Atendido', 'Sim', 'gestao@clinicanascente.com.br'], ['Faltou sem aviso', 'Não', ''], ['', 'Parcial', ''], ['', 'Perdido / glosa', '']],
  Profissionais: [['Profissional', 'Especialidade', 'Ativo'], ['Juliana Ribeiro', 'Psicologia', 'Sim'], ['Dr. Victor Cunha', 'Pediatria', 'Sim']],
  Procedimentos: [['Procedimento', 'Especialidade', 'Valor', 'Obs'], ['Sessão de psicologia', 'Psicologia', 120, '']],
  Agosto: [HM, L('G1', '05/08/2026', 'Fabio Agosto', 200, '')],
  Setembro: [HM, L('S1', '01/09/2026', 'Ana Antiga', 120, 'Não'), L('S2', '02/09/2026', 'Carlos Conv', 0, 'Convênio (fatura)', { conv: 'Cedplan' }),
    L('S3', '03/09/2026', 'Gil Perdido', 100, 'Perdido / glosa', { conv: 'Cedplan', obs: 'PERDIDO / glosa: glosa do convênio' }), L('S4', '04/09/2026', 'Gil Perdido', 80, 'Perdido / glosa', { prof: 'Dr. Victor Cunha' }),
    L('S5', '05/09/2026', 'Eva Paga', 120, 'Sim'), L('S6', '06/09/2026', 'Davi Mensal', 480, 'Não', { proc: 'Mensalidade psicologia' }), L('S7', '07/09/2026', 'Ana Antiga', 120, 'Não', { oque: 'Faltou sem aviso' })],
  Outubro: [HM, L('O1', '10/10/2026', 'Bruno Parcial', 120, 'Parcial', { receb: 50 }), L('O2', '12/10/2026', 'Eva Paga', 120, 'Sim')]
});
let email = 'recepcao@clinicanascente.com.br';
global.SpreadsheetApp = { getActiveSpreadsheet: () => ss, flush() { } };
global.LockService = { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) };
global.Utilities = { formatDate: fmt };
global.Session = { getActiveUser: () => ({ getEmail: () => email }) };
const API = (0, eval)(require('./carregar-servidor')());
const ok = (r, msg) => { if (!r || r.ok === false) { console.error(msg, JSON.stringify(r)); process.exit(1); } return r; };

// só a gestão
assert.strictEqual(API.aReceber().ok, false); assert.strictEqual(API.perdasAno().ok, false);
assert.strictEqual(API.darComoPerdido({ motivo: 'x', itens: [{ aba: 'Setembro', id: 'S1' }] }).ok, false);
email = 'gestao@clinicanascente.com.br';

// em aberto: mesma regra de Pendências (sem convênio, mensalidade, falta, pago, perdido), com idade e faixa
let r = ok(API.aReceber(), 'aReceber');
assert.deepStrictEqual(r.linhas.map(x => x.id), ['G1', 'S1', 'O1'], 'mais antigo primeiro');
const by = id => r.linhas.find(x => x.id === id);
assert.strictEqual(by('G1').dias, 72); assert.strictEqual(by('G1').faixa, 'mais60'); assert.strictEqual(by('G1').pago, '(vazio)');
assert.strictEqual(by('S1').dias, 45); assert.strictEqual(by('S1').faixa, 'ate60'); assert.strictEqual(by('S1').pagador, 'Carla Antiga');
assert.strictEqual(by('O1').saldo, 70, 'parcial: só o que falta'); assert.strictEqual(by('O1').faixa, 'ate30');
assert.deepStrictEqual([r.total, r.faixas.ate30, r.faixas.ate60, r.faixas.mais60], [390, 70, 120, 200]);
const pend = ok(API.gestaoResumo({ mes: 'Setembro' })).pagamentoPendente.map(x => x.id);
assert.deepStrictEqual(pend, ['S1'], 'Pendências usa a mesma regra');
console.log('em aberto ok');

// dar como perdido: motivo obrigatório; várias de uma vez; linha que não existe vira erro, as outras vão
assert.strictEqual(API.darComoPerdido({ motivo: '', itens: [{ aba: 'Setembro', id: 'S1' }] }).ok, false);
r = ok(API.darComoPerdido({ motivo: 'paciente não pagou', itens: [{ aba: 'Setembro', id: 'S1' }, { aba: 'Agosto', id: 'G1' }, { aba: 'Setembro', id: 'NAO', paciente: 'Fulano' }] }), 'perdido');
assert.strictEqual(r.feitos, 2); assert.strictEqual(r.erros.length, 1); assert.ok(/^Fulano/.test(r.erros[0]), r.erros[0]);
const S = ss._m.Setembro.d, s1 = S.find(l => l[19] === 'S1');
assert.strictEqual(s1[10], 'Perdido / glosa'); assert.ok(/PERDIDO \/ glosa: paciente não pagou/.test(s1[18]), s1[18]); assert.ok(/corrigido por gestao@/.test(s1[20]), s1[20]);
assert.deepStrictEqual(ok(API.aReceber()).linhas.map(x => x.id), ['O1']);
console.log('dar como perdido ok');

// perdas do ano
const p = ok(API.perdasAno(), 'perdasAno');
assert.deepStrictEqual(p.total, { atendido: 1340, perdido: 500, n: 4 });
assert.deepStrictEqual(p.meses.map(m => [m.mes, m.perdido, m.n]), [['Agosto', 200, 1], ['Setembro', 300, 3], ['Outubro', 0, 0]]);
assert.deepStrictEqual(p.porMotivo.map(m => [m.nome, m.valor]), [['paciente não pagou', 320], ['glosa do convênio', 100], ['sem motivo escrito', 80]]);
assert.deepStrictEqual(p.porConvenio.map(m => [m.nome, m.valor]), [['Particular', 400], ['Cedplan', 100]]);
assert.deepStrictEqual(p.porProfissional.map(m => [m.nome, m.valor]), [['Juliana Ribeiro', 420], ['Dr. Victor Cunha', 80]]);
console.log('perdas do ano ok');
console.log('servidor-perdas: tudo ok');
