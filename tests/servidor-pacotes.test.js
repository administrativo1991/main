// node tests/servidor-pacotes.test.js — roda o servidor (app/server) contra uma planilha falsa em memória:
// cadastro com Cobrança + Pagamento, registrar atendimento em pacote (antecipado e posterior), renovação, painel e virada.
const fs = require('fs'), path = require('path'), assert = require('assert');
function pad(n) { return ('0' + n).slice(-2); }
function fmt(d, tz, f) {
  return f.replace('yyyy', d.getFullYear()).replace('MM', pad(d.getMonth() + 1)).replace('dd', pad(d.getDate()))
    .replace('HH', pad(d.getHours())).replace('mm', pad(d.getMinutes())).replace('ss', pad(d.getSeconds())).replace(/^d$/, String(d.getDate()));
}
class Range {
  constructor(s, r, c, nr, nc) { Object.assign(this, { s, r, c, nr: nr || 1, nc: nc || 1 }); }
  getValues() { const o = []; for (let i = 0; i < this.nr; i++) { const l = []; for (let j = 0; j < this.nc; j++) { const row = this.s.d[this.r - 1 + i] || []; const v = row[this.c - 1 + j]; l.push(v == null ? '' : v); } o.push(l); } return o; }
  getValue() { return this.getValues()[0][0]; }
  setValues(v) { v.forEach((l, i) => l.forEach((x, j) => this.s.put(this.r + i, this.c + j, x))); return this; }
  setValue(x) { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.s.put(this.r + i, this.c + j, x); return this; }
  setNumberFormat() { return this; } setNumberFormats() { return this; } setFontWeight() { return this; }
  getNumberFormats() { return this.getValues().map(l => l.map(() => '')); } clearContent() { return this.setValue(''); } clear() { return this.setValue(''); }
}
class Sheet {
  constructor(nome, linhas, maxRows) { this.nome = nome; this.d = linhas.map(l => l.slice()); this.maxRows = maxRows || 200; this.maxCols = Math.max(26, ...this.d.map(l => l.length)); }
  put(r, c, v) { while (this.d.length < r) this.d.push([]); const l = this.d[r - 1]; while (l.length < c) l.push(''); l[c - 1] = v; if (c > this.maxCols) this.maxCols = c; }
  getName() { return this.nome; } getRange(r, c, nr, nc) { return new Range(this, r, c, nr, nc); }
  getLastRow() { for (let i = this.d.length; i > 0; i--) if ((this.d[i - 1] || []).some(v => v !== '' && v != null)) return i; return 0; }
  getLastColumn() { let m = 0; this.d.forEach(l => l.forEach((v, j) => { if (v !== '' && v != null) m = Math.max(m, j + 1); })); return m; }
  getMaxColumns() { return this.maxCols; } getMaxRows() { return this.maxRows; }
  insertColumnsAfter(c, n) { this.maxCols += n; } insertRowsAfter(r, n) { this.maxRows += n; } setFrozenRows() { }
  appendRow(l) { this.d.push(l.slice()); }
}
function planilha(abas) {
  const m = {};
  Object.keys(abas).forEach(k => { m[k] = new Sheet(k, abas[k]); });
  return { getName: () => 'teste', getId: () => 'x', getSheetByName: n => m[n] || null, getSheets: () => Object.values(m),
    insertSheet: n => (m[n] = new Sheet(n, [])), setActiveSheet() { }, _m: m };
}
const HP = ["Nome","Código de controle (ControleOdonto)","CPF","Data de nascimento","Ativo","Cobrança","ID ControleOdonto (pessoaId)","Grupo de duplicata","Motivo da duplicata","Possível não-paciente","Anotação no campo \"controle\" (original)","Observação da extração","Decisão da revisão (Roberta, 29/09)","Histórico de cobrança (antigo)","Pagador habitual (responsável financeiro)","Nome do pagador como aparece no extrato","Convênio","Regra de cobrança","Observação de cobrança (a recepção lê — diz O QUE cobrar, nunca o porquê)","Registrado por (app)","WhatsApp do pagador","Nº da carteirinha","Quem indicou","Data da 1ª consulta","Profissional de referência","CPF do pagador","Responsável (nome)","Parentesco do responsável","Telefone do responsável","CPF do responsável","Valor combinado (R$)","Sessões por pacote","Valor do pacote (R$)","Pagamento"];
function pac(nome, cob, pag, extra) { const l = HP.map(() => ''); l[0] = nome; l[4] = 'Sim'; l[5] = cob; l[16] = 'Particular'; l[33] = pag; Object.keys(extra || {}).forEach(k => { l[HP.indexOf(k)] = extra[k]; }); return l; }
const HM = ["Data","Hora","Paciente","Profissional","Procedimento","Convênio (auto)","Modalidade (auto)","⚠ Atenção na cobrança (auto)","O que aconteceu","Valor (R$)","Pago?","Data do pagamento","Forma de pagamento","Pagador habitual (auto)","Quem pagou (só se foi outra pessoa)","NF emitida?","Nº da NF","Guia assinada? (convênio)","Observação","ID","Registrado por (app)","Plano (ID)"];
const hoje = new Date(), mes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][hoje.getMonth()];
const abas = {
  Pacientes: [HP, pac('Sofia Social', 'Pacote 4 sessões', 'Antecipado', { 'Sessões por pacote': 4, 'Valor do pacote (R$)': 400 }),
    pac('Ana Posterior', 'Pacote 4 sessões', 'Posterior', { 'Sessões por pacote': 4, 'Valor do pacote (R$)': 280 }),
    pac('Mara Mensal', 'Mensalidade especial', 'Antecipado', { 'Valor combinado (R$)': 150 }),
    pac('Carlos ExPlano', 'Por sessão (combinado)', 'Posterior', { 'Valor combinado (R$)': 70, 'Histórico de cobrança (antigo)': 'Pagamento posterior: R$ 70 por sessão (07/10: era Plano de 4 consultas)' }),
    pac('Naimara Paula Sa da Silva', 'Por sessão (combinado)', 'Posterior', { 'Valor combinado (R$)': 120, 'Histórico de cobrança (antigo)': 'era Plano de 4 consultas' }),
    pac('Erica Pro Bono', 'Pro bono', 'Não se aplica', { 'Observação de cobrança (a recepção lê — diz O QUE cobrar, nunca o porquê)': 'Não cobrar até 31/10. A partir de 01/11: social R$ 200/mês' }),
    pac('Beatriz Tabela', '', '')],
  Listas: [["O que aconteceu","Pago?","Forma de pagamento","Sim/Não","Guia assinada?","Convênio","Regra de cobrança","Cobrança","Especialidade (modalidade)","Pagamento"],
    ["Atendido","Sim","Pix","Sim","Sim","Particular","Tabela","Tabela","Qualquer especialidade","Na sessão"],
    ["Desmarcou com antecedência (≥ 24h)","Não","Dinheiro","Não","Não","Cedplan","","Por sessão (combinado)","Qualquer especialidade","Antecipado"],
    ["Faltou avisando em cima da hora (< 24h)","Convênio (fatura)","","","","Sabin Sinai","","Pacote de sessões","Qualquer especialidade","Posterior"],
    ["Faltou sem aviso","Pacote (sessão já paga)","","","","","","Pacote 4 sessões","Psicologia","Não se aplica"],
    ["Cancelado pela clínica","Não se aplica (pro bono / permuta)","","","","","","Pacote 12 sessões","",""],
    ["","Parcial","","","","","","Mensalidade social","",""],["","Incluída na mensalidade","","","","","","Mensalidade especial","",""],["","","","","","","","Convênio","",""],["","","","","","","","Pro bono","",""],["","","","","","","","Permuta","",""]],
  Profissionais: [["Nome","Especialidade"],["Juliana Ribeiro","Psicologia"]],
  Procedimentos: [["Procedimento","Especialidade","Valor","Obs"],["Sessão de psicologia","Psicologia",120,""]],
  'Alterações de cadastro': [["Quando","Paciente","Campo","De","Para","Quem informou","Por"]],
};
abas[mes] = [HM];
const ss = planilha(abas);
global.SpreadsheetApp = { getActiveSpreadsheet: () => ss, flush() { }, openById: () => ss, create: () => ss };
global.LockService = { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) };
global.Utilities = { formatDate: fmt };
let email = 'administrativo@clinicanascente.com.br';
global.Session = { getActiveUser: () => ({ getEmail: () => email }) };
const R = p => fs.readFileSync(path.join(__dirname, '..', 'app/server', p), 'utf8');
const API = (0, eval)(R('duplicatas.js') + '\n' + R('server.js'));
const ok = (r, msg) => { if (!r || r.ok === false) { console.error(msg, JSON.stringify(r)); process.exit(1); } return r; };
const hj = fmt(hoje, '', 'dd/MM/yyyy');

const b = API.bootstrap(); assert.deepStrictEqual(b.listas.pagamentos, ['Na sessão', 'Antecipado', 'Posterior', 'Não se aplica']);
assert.ok(b.listas.modalidades.indexOf('Mensalidade social') >= 0);
const at = API.bootstrapAtendimento(); assert.ok(at.pacotesSessoes);
const sofia = at.pacientes.filter(p => p.nome === 'Sofia Social')[0];
assert.strictEqual(sofia.pctN, 4); assert.strictEqual(sofia.pagamento, 'Antecipado');
console.log('bootstrap ok · perfil', b.usuario.perfil);

// ninguém começa com sessões: Sofia atendida sem renovação fica com −1
let r = ok(API.registrarAtendimento({ paciente: 'Sofia Social', profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia', data: hj, hora: '09:00', oque: 'Atendido', pago: 'Pacote (sessão já paga)', valor: '' }), 'reg sofia');
assert.strictEqual(r.consumo.delta, -1); assert.strictEqual(r.disponiveis, -1);
r = ok(API.renovarPacote({ paciente: 'Sofia Social', sessoes: 4, valor: '400', data: hj, forma: 'Pix', nf: 'Não' }), 'renovar');
assert.strictEqual(r.disponiveis, 3); console.log('renovação ok · válidas até', r.validade);
// 1ª falta avisada não gasta, 2ª gasta; mesma semana nunca gasta
r = ok(API.registrarAtendimento({ paciente: 'Sofia Social', profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia', data: hj, oque: 'Faltou avisando em cima da hora (< 24h)', pago: '' }), 'falta1');
assert.strictEqual(r.consumo.delta, 0); assert.strictEqual(r.disponiveis, 3);
r = ok(API.registrarAtendimento({ paciente: 'Sofia Social', profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia', data: hj, oque: 'Faltou avisando em cima da hora (< 24h)', pago: '', mesmaSemana: true }), 'falta mesma semana');
assert.strictEqual(r.consumo.delta, 0);
r = ok(API.registrarAtendimento({ paciente: 'Sofia Social', profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia', data: hj, oque: 'Faltou avisando em cima da hora (< 24h)', pago: '' }), 'falta2');
assert.strictEqual(r.consumo.delta, -1); assert.strictEqual(r.disponiveis, 2);
r = ok(API.registrarAtendimento({ paciente: 'Sofia Social', profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia', data: hj, oque: 'Cancelado pela clínica', pago: '' }), 'cancel');
assert.strictEqual(r.consumo.delta, 0);
r = ok(API.registrarAtendimento({ paciente: 'Sofia Social', profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia', data: hj, oque: 'Atendido', pago: 'Sim', valor: '120', forma: 'Pix', cobrarAvulsa: true }), 'avulsa');
assert.strictEqual(r.consumo, null);
console.log('consumo ok');
// pacote no Posterior: lança não pago, sem mexer em sessões
r = ok(API.registrarAtendimento({ paciente: 'Ana Posterior', profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia', data: hj, oque: 'Atendido', pago: 'Não', valor: '70,00' }), 'ana');
assert.strictEqual(r.disponiveis, null);
const painel = API.pacotesPainel(); const pa = painel.itens.filter(i => i.paciente === 'Ana Posterior')[0], ps = painel.itens.filter(i => i.paciente === 'Sofia Social')[0];
assert.strictEqual(pa.aPagarMes, 70); assert.strictEqual(pa.situacao, 'a pagar no mês'); assert.strictEqual(ps.disponiveis, 2);
// mensalidade: mês em aberto até registrar o pagamento do mês
let pm = API.pacotesPainel().itens.filter(i => i.paciente === 'Mara Mensal')[0]; assert.strictEqual(pm.mensal, true); assert.strictEqual(pm.valor, 150); assert.strictEqual(pm.mesPago, false);
const rm = ok(API.renovarPacote({ paciente: 'Mara Mensal', valor: '150', data: hj, forma: 'Pix' }), 'mensalidade'); assert.ok(/\//.test(rm.referente)); assert.strictEqual(rm.mesPago, true);
pm = API.pacotesPainel().itens.filter(i => i.paciente === 'Mara Mensal')[0]; assert.strictEqual(pm.situacao, 'mês pago');
console.log('painel ok', painel.itens.map(i => i.paciente + ':' + i.situacao).join(' · '));
// virada de novembro
const v = ok(API.viradaPropostas(), 'virada');
const nomes = v.itens.map(i => i.nome).sort();
assert.deepStrictEqual(nomes, ['Ana Posterior', 'Carlos ExPlano', 'Erica Pro Bono']);
const carlos = v.itens.filter(i => i.nome === 'Carlos ExPlano')[0]; assert.strictEqual(carlos.campos.pctV, 280); assert.strictEqual(carlos.campos.modalidade, 'Pacote 4 sessões');
const ap = ok(API.aplicarAlteracoesLote({ itens: v.itens, quemInformou: 'teste' }), 'aplicar');
assert.strictEqual(ap.feitos.length, 3, JSON.stringify(ap));
const depois = API.bootstrapAtendimento().pacientes; const c2 = depois.filter(p => p.nome === 'Carlos ExPlano')[0], e2 = depois.filter(p => p.nome === 'Erica Pro Bono')[0];
assert.strictEqual(c2.modalidade, 'Pacote 4 sessões'); assert.strictEqual(c2.pctN, 4); assert.strictEqual(c2.pctV, 280); assert.strictEqual(c2.pagamento, 'Antecipado');
assert.strictEqual(e2.modalidade, 'Mensalidade social'); assert.strictEqual(e2.valorNum, 200); assert.strictEqual(e2.pagamento, 'Antecipado');
console.log('virada ok');
// cadastro: validações e novo paciente
let c;
c = ok(API.atualizarCadastro({ nome: 'Beatriz Tabela', quemInformou: 'teste', campos: { modalidade: 'Por sessão (combinado)', valorNum: 90, pagamento: 'Na sessão' } }), 'cad');
const lc = ok(API.lerCadastro({ nome: 'Beatriz Tabela' }), 'ler'); assert.strictEqual(String(lc.campos.valorNum), '90');
const np = ok(API.criarPaciente({ nome: 'Joana Teste da Silva', cpf: '390.533.447-05', nasc: '01/01/1990', modalidade: 'Tabela', pagamento: '', convenio: 'Particular', telPaciente: '(32) 9 8888-7777' }), 'criar');
const jo = API.bootstrapAtendimento().pacientes.filter(p => p.nome === 'Joana Teste da Silva')[0]; assert.strictEqual(jo.pagamento, 'Na sessão'); assert.strictEqual(jo.telPac, '(32) 9 8888-7777');
ok(API.atualizarCadastro({ nome: 'Beatriz Tabela', quemInformou: 'teste', campos: { telPac: '(32) 3333-4444' } }), 'tel'); assert.strictEqual(ok(API.lerCadastro({ nome: 'Beatriz Tabela' }), 'ler2').campos.telPac, '(32) 3333-4444');
// CPF e nascimento opcionais; completar depois; recepção não troca o que já existe
const semDoc = ok(API.criarPaciente({ nome: 'Pedro Sem Documento', cpf: '', nasc: '', modalidade: 'Tabela', convenio: 'Particular' }), 'sem doc');
assert.strictEqual(API.criarPaciente({ nome: 'Paula Cpf Errado', cpf: '123', nasc: '', modalidade: 'Tabela' }).ok, false);
ok(API.atualizarCadastro({ nome: 'Pedro Sem Documento', quemInformou: 'mãe', campos: { cpf: '529.982.247-25', nasc: '02/03/2015' } }), 'completar');
const pd = API.bootstrapAtendimento().pacientes.filter(p => p.nome === 'Pedro Sem Documento')[0]; assert.strictEqual(pd.cpf, '529.982.247-25'); assert.strictEqual(pd.nasc, '02/03/2015');
assert.strictEqual(API.atualizarCadastro({ nome: 'Joana Teste da Silva', quemInformou: 'x', campos: { cpf: '529.982.247-25' } }).ok, false); // CPF de outro paciente
// cobrança a definir: Por sessão sem valor e cobrança em branco são aceitos
ok(API.criarPaciente({ nome: 'Valor Adefinir Teste', cpf: '', nasc: '', modalidade: 'Por sessão (combinado)', valorNum: '', convenio: 'Particular' }), 'a definir');
ok(API.criarPaciente({ nome: 'Cobranca Embranco Teste', cpf: '', nasc: '', modalidade: '', convenio: 'Particular' }), 'em branco');
// hora gravada como horário (30/12/1899 08:00) na Lista do dia sai como "08:00", não como data
ss._m['Lista do dia'] = new Sheet('Lista do dia', [['ID', 'Data', 'Hora', 'Paciente', 'Profissional', 'Origem', 'Observação', 'Registrado por (app)'], ['D-1', new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12), new Date(1899, 11, 30, 8, 0), 'Beatriz Tabela', 'Juliana Ribeiro', 'Avulso', '', '']]);
const ld = API.listaDoDia({ data: hj }); const it = (ld.itens || []).filter(i => i.paciente === 'Beatriz Tabela')[0];
assert.ok(it, JSON.stringify(ld).slice(0, 300)); assert.strictEqual(it.hora, '08:00');
ok(API.acrescentarAoDia({ data: hj, hora: '09:30', paciente: 'Sofia Social', profissional: 'Juliana Ribeiro' }), 'acrescentar');
assert.strictEqual(ss._m['Lista do dia'].d[2][2], '09:30');
// recepção não roda a virada
email = 'atendimento@clinicanascente.com.br'; assert.strictEqual(API.viradaPropostas().ok, false);
assert.strictEqual(API.atualizarCadastro({ nome: 'Pedro Sem Documento', quemInformou: 'x', campos: { nasc: '03/03/2015' } }).ok, false);
console.log('cadastro ok · todos os testes do servidor passaram');
