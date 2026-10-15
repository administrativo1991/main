// node tests/servidor-fase1.test.js — servidor da Fase 1 contra a planilha falsa: Cobrança por profissional, bloco "O que fazer agora",
// Registrar (Recebeu? → Pago?), falta com Detalhe, Cobrança do mês, pagamento do mês (antecipado, mensalidade, posterior), Faltas → Decidir, cadastro.
const assert = require('assert');
const { fmt, planilha } = require('./planilha-falsa');
const HP = ['Nome', 'Código', 'CPF', 'Data de nascimento', 'Ativo', 'Cobrança', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'Histórico de cobrança (antigo)', 'Pagador habitual (responsável financeiro)', 'Nome do pagador como aparece no extrato', 'Convênio', 'Regra de cobrança', 'Observação de cobrança (a recepção lê — diz O QUE cobrar, nunca o porquê)', 'Registrado por (app)', 'WhatsApp do pagador'];
const pac = (nome, conv, pagador, obs) => { const l = HP.map(() => ''); l[0] = nome; l[4] = 'Sim'; l[14] = pagador || ''; l[16] = conv || 'Particular'; l[18] = obs || ''; return l; };
const HM = ['Data', 'Hora', 'Paciente', 'Profissional', 'Procedimento', 'Convênio (auto)', 'Modalidade (auto)', '⚠ Atenção na cobrança (auto)', 'O que aconteceu', 'Valor (R$)', 'Pago?', 'Data do pagamento', 'Forma de pagamento', 'Pagador habitual (auto)', 'Quem pagou (só se foi outra pessoa)', 'NF emitida?', 'Nº da NF', 'Guia assinada? (convênio)', 'Observação', 'ID', 'Registrado por (app)'];
const HC = ['ID', 'Paciente', 'Profissional', 'Ativo', 'Cobrança', 'Convênio', 'Valor por sessão (R$)', 'Valor mensal (R$)', 'Pagamento', 'Vigente desde', 'Vigente até', 'Valor decidido por', 'Valor decidido em', 'Observação de cobrança', 'Registrado por (app)'];
const cpp = (id, p, prof, cob, conv, vs, vm, pg, desde, ate, obs) => [id, p, prof, 'Sim', cob, conv || '', vs == null ? '' : vs, vm == null ? '' : vm, pg, desde || '', ate || '', 'migração 15/10', '15/10/2026', obs || '', 'carga'];
const AGORA = new Date(2026, 9, 15, 10, 0), RealDate = Date; // 15/10/2026 (quinta)
global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(AGORA.getTime()); } static now() { return AGORA.getTime(); } };
const linhaMes = (dia, mes, nome, prof, proc, oque, valor, pago, id, extra) => HM.map(h => ({ Data: new Date(2026, mes, dia, 12), Hora: '09:00', Paciente: nome, Profissional: prof, Procedimento: proc, 'O que aconteceu': oque, 'Valor (R$)': valor, 'Pago?': pago, ID: id, 'Registrado por (app)': 'x' })[h] ?? (extra || {})[h] ?? '');
const ss = planilha({
  Pacientes: [HP, pac('Lays Teste', 'Particular', 'Michelle'), pac('Julia Teste', 'Particular', 'Bruno'), pac('Inglidy Teste'), pac('Davi Teste', 'Particular', '', 'Aplicação de teste com a Giovana: pro bono'), pac('Ana Conv', 'Cedplan'), pac('Erica Teste'), pac('Beatriz Nova'), pac('Carlos Ant', 'Particular', 'Carlos')],
  'Cobrança por profissional': [HC,
    cpp('C1', 'Lays Teste', 'Giovana Grossi', 'Por sessão', '', 25, '', 'Na hora'),
    cpp('C2', 'Julia Teste', 'Juliana Ribeiro', 'Por sessão', '', 70, '', 'Posterior', '', '31/10/2026'), cpp('C3', 'Julia Teste', 'Juliana Ribeiro', 'Por sessão', '', 70, '', 'Antecipado', '01/11/2026'),
    cpp('C4', 'Inglidy Teste', 'Juliana Ribeiro', 'Mensalidade fixa', '', '', 120, 'Antecipado'),
    cpp('C5', 'Davi Teste', 'Giovana Grossi', 'Pro bono', '', '', '', 'Não se aplica'), cpp('C6', 'Davi Teste', 'Juliana Ribeiro', 'Por sessão', '', 80, '', 'Posterior'),
    cpp('C7', 'Ana Conv', 'Juliana Ribeiro', 'Convênio', 'Cedplan', '', '', 'Não se aplica'),
    cpp('C8', 'Erica Teste', 'Giovana Grossi', 'Pro bono', '', '', '', 'Não se aplica', '', '31/10/2026'), cpp('C9', 'Erica Teste', 'Giovana Grossi', 'Mensalidade fixa', '', '', 200, 'Antecipado', '01/11/2026'),
    cpp('C10', 'Carlos Ant', 'Juliana Ribeiro', 'Por sessão', '', 70, '', 'Antecipado')],
  'Valores por sessão': [['Especialidade', 'Valor', 'Nome', 'Ativo'], ['Psicologia', 120, 'cheio', 'Sim'], ['Psicologia', 70, 'combinado', 'Sim'], ['Pediatria', 200, 'cheio', 'Sim']],
  'Parâmetros': [['Parâmetro', 'Valor', 'Descrição'], ['vencimento_dia', 10, ''], ['tolerancia_dia', 15, ''], ['taxa_falta_pct', 50, '']],
  Listas: [['O que aconteceu', 'Pago?', 'Forma de pagamento', 'Sim/Não', 'Guia assinada?', 'Convênio', 'Regra de cobrança', 'Cobrança', 'Especialidade (modalidade)', 'Pagamento', 'Cobrança (por profissional)', 'Pagamento (por profissional)', 'Feriados'],
    ['Atendido', 'Sim', 'Pix', 'Sim', 'Sim', 'Particular', '', '', '', '', 'Por sessão', 'Na hora', '12/10/2026'], ['Desmarcou com antecedência (≥ 24h)', 'Não', 'Dinheiro', '', '', 'Cedplan', '', '', '', '', 'Mensalidade fixa', 'Antecipado', ''], ['Faltou avisando em cima da hora (< 24h)', 'Convênio (fatura)', '', '', '', '', '', '', '', '', 'Convênio', 'Posterior', ''], ['Faltou sem aviso', 'Pacote (sessão já paga)', '', '', '', '', '', '', '', '', 'Pro bono', 'Não se aplica', ''], ['Cancelado pela clínica', 'Não se aplica (pro bono / permuta)', '', '', '', '', '', '', '', '', 'Permuta', '', ''], ['', 'Perdido / glosa'], ['', 'Parcial'], ['', 'Incluída na mensalidade']],
  Profissionais: [['Profissional', 'Especialidade', 'Ativo'], ['Juliana Ribeiro', 'Psicologia', 'Sim'], ['Giovana Grossi', 'Psicologia (estágio)', 'Sim'], ['Dr. Victor Cunha', 'Pediatria', 'Sim']],
  Procedimentos: [['Procedimento', 'Especialidade', 'Valor', 'Obs'], ['Sessão de psicologia', 'Psicologia', 120, ''], ['Aplicação de teste – avaliação neuropsicológica', 'Psicologia', 0, ''], ['Taxa de falta – psicologia', 'Psicologia', 120, ''], ['Consulta pediátrica', 'Pediatria', 200, ''], ['Retorno pediátrico (com pedido de exames, até 30 dias)', 'Pediatria', 0, '']],
  Mensalistas: [['Paciente', 'Modalidade', 'Valor mensal hoje (R$)', 'Pagador habitual', 'OUTUBRO (paga em novembro) — pago?', 'Data', 'Observação / valor combinado'], ['Inglidy Teste', 'Mensalidade especial', 120, '', 'Sim', '08/10/2026 — R$ 120 Pix', '']],
  'Agenda recorrente': [['ID', 'Paciente', 'Profissional', 'Dia da semana', 'Hora', 'Frequência', 'Começa em', 'Termina em', 'Ativo', 'Observação', 'Registrado por (app)'],
    ['F1', 'Carlos Ant', 'Juliana Ribeiro', 'Segunda', '09:00', 'Semanal', '01/09/2026', '', 'Sim', '', ''], ['F2', 'Julia Teste', 'Juliana Ribeiro', 'Quinta', '10:00', 'Semanal', '01/09/2026', '', 'Sim', '', '']],
  'Lista do dia': [['ID', 'Data', 'Hora', 'Paciente', 'Profissional', 'Origem', 'Observação', 'Registrado por (app)']],
  'Alterações de cadastro': [['Data/hora', 'Paciente', 'Campo', 'De', 'Para', 'Quem informou', 'Registrado por (app)']],
  'Alterações de lançamento': [['Data/hora', 'Aba', 'ID', 'Paciente', 'Campo', 'De', 'Para', 'Quem informou', 'Registrado por (app)']],
  Setembro: [HM, linhaMes(28, 8, 'Carlos Ant', 'Juliana Ribeiro', 'Sessão de psicologia', 'Cancelado pela clínica', '', '', 'S1')],
  Outubro: [HM, linhaMes(1, 9, 'Julia Teste', 'Juliana Ribeiro', 'Sessão de psicologia', 'Atendido', 70, 'Não', 'O1'), linhaMes(8, 9, 'Julia Teste', 'Juliana Ribeiro', 'Sessão de psicologia', 'Atendido', 70, 'Não', 'O2'), linhaMes(5, 9, 'Carlos Ant', 'Juliana Ribeiro', 'Sessão de psicologia', 'Cancelado pela clínica', '', '', 'O3')],
  Novembro: [HM]
});
let email = 'administrativo@clinicanascente.com.br';
global.SpreadsheetApp = { getActiveSpreadsheet: () => ss, flush() { } };
global.LockService = { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) };
global.Utilities = { formatDate: fmt };
global.Session = { getActiveUser: () => ({ getEmail: () => email }) };
const API = (0, eval)(require('./carregar-servidor')());
const ok = (r, msg) => { if (!r || r.ok === false) { console.error(msg, JSON.stringify(r)); process.exit(1); } return r; };
const O = ss._m.Outubro, N = ss._m.Novembro, col = (s, nome) => s.d[0].indexOf(nome), cel = (s, linha, nome) => s.d[linha - 1][col(s, nome)];
// os casos abaixo repetem paciente × hora de propósito: confirmouRepetido pula a trava de lançamento repetido (testada no fim)
const reg = (d) => API.registrarAtendimento(Object.assign({ data: '15/10/2026', hora: '09:00', procedimento: 'Sessão de psicologia', oque: 'Atendido', confirmouRepetido: true }, d));

// bootstrap enxuto
const b = ok(API.bootstrap(), 'bootstrap'); assert.deepStrictEqual(b.listas.cobrancas, ['Por sessão', 'Mensalidade fixa', 'Convênio', 'Pro bono', 'Permuta']); assert.strictEqual(b.params.vencimento_dia, 10); assert.ok(b._ms >= 0);
const at = ok(API.bootstrapAtendimento(), 'bootstrapAtendimento'); assert.strictEqual(at.cobrancas.length, 10); assert.ok(at.competencias['Inglidy Teste|Juliana Ribeiro']['Outubro/2026'].pago === 'Sim', 'coluna antiga de Mensalistas conta como paga');
assert.strictEqual(at.competencias['Carlos Ant|Juliana Ribeiro']['Outubro/2026'].sessoes, 3, 'segundas de outubro/2026 (5, 19, 26) menos o feriado 12/10');
assert.strictEqual(at.competencias['Carlos Ant|Juliana Ribeiro']['Novembro/2026'].sessoes, 5, 'novembro/2026 tem 5 segundas');
assert.strictEqual(at.competencias['Carlos Ant|Juliana Ribeiro']['Novembro/2026'].abatimentos.length, 1, 'cancelado pela clínica em outubro abate em novembro');
assert.strictEqual(at.competencias['Carlos Ant|Juliana Ribeiro']['Outubro/2026'].abatimentos.length, 1, 'cancelado em setembro abate em outubro');
console.log('bootstrap ok');

// Lays: na hora, recebeu Sim
let r = ok(reg({ paciente: 'Lays Teste', profissional: 'Giovana Grossi', recebeu: 'Sim', forma: 'Pix', nf: 'Sim', nfNumero: '101' }), 'lays');
assert.strictEqual(r.pago, 'Sim'); assert.strictEqual(r.valor, 25); assert.strictEqual(cel(O, r.linha, 'Pago?'), 'Sim'); assert.strictEqual(cel(O, r.linha, 'Valor (R$)'), 25); assert.strictEqual(cel(O, r.linha, 'Nº da NF'), '101');
r = ok(reg({ paciente: 'Lays Teste', profissional: 'Giovana Grossi', recebeu: 'Parcial', valorRecebido: '10', forma: 'Dinheiro' }), 'lays parcial'); assert.strictEqual(r.pago, 'Parcial'); assert.ok(/Recebeu R\$ 10,00 de R\$ 25,00; saldo R\$ 15,00/.test(cel(O, r.linha, 'Observação')));
// Julia: fim do mês → Não com valor; se quiser pagar agora, Sim
r = ok(reg({ paciente: 'Julia Teste', profissional: 'Juliana Ribeiro' }), 'julia'); assert.strictEqual(r.pago, 'Não'); assert.strictEqual(cel(O, r.linha, 'Valor (R$)'), 70); assert.strictEqual(r.bloco.situacao, 'fim-do-mes');
r = ok(reg({ paciente: 'Julia Teste', profissional: 'Juliana Ribeiro', recebeu: 'Sim', forma: 'Pix' }), 'julia sim'); assert.strictEqual(r.pago, 'Sim');
// Inglidy: mensalidade paga → Incluída, J vazio
r = ok(reg({ paciente: 'Inglidy Teste', profissional: 'Juliana Ribeiro', recebeu: 'Sim', valor: '999' }), 'inglidy'); assert.strictEqual(r.pago, 'Incluída na mensalidade'); assert.strictEqual(cel(O, r.linha, 'Valor (R$)'), ''); assert.strictEqual(r.bloco.situacao, 'mensalidade-paga');
// Carlos: antecipado em aberto no dia 15 → Incluída; bloco em aberto com 3 × 70 − 1 abatida = R$ 140
r = ok(reg({ paciente: 'Carlos Ant', profissional: 'Juliana Ribeiro' }), 'carlos'); assert.strictEqual(r.pago, 'Incluída na mensalidade'); assert.strictEqual(r.bloco.situacao, 'antecipado-aberto'); assert.ok(/cobrar R\$ 140/.test(r.bloco.frase), r.bloco.frase);
// Davi: trocar o profissional muda tudo
r = ok(reg({ paciente: 'Davi Teste', profissional: 'Giovana Grossi' }), 'davi g'); assert.strictEqual(r.pago, 'Não se aplica (pro bono / permuta)');
r = ok(reg({ paciente: 'Davi Teste', profissional: 'Juliana Ribeiro' }), 'davi j'); assert.strictEqual(r.pago, 'Não');
// Convênio, teste, sem linha (Victor), Erica (pro bono até 31/10; social em novembro)
r = ok(reg({ paciente: 'Ana Conv', profissional: 'Juliana Ribeiro', guia: 'Sim' }), 'conv'); assert.strictEqual(r.pago, 'Convênio (fatura)'); assert.strictEqual(cel(O, r.linha, 'Guia assinada? (convênio)'), 'Sim'); assert.strictEqual(cel(O, r.linha, 'Convênio (auto)'), 'Cedplan');
r = ok(reg({ paciente: 'Davi Teste', profissional: 'Juliana Ribeiro', procedimento: 'Aplicação de teste – avaliação neuropsicológica' }), 'teste'); assert.strictEqual(r.pago, 'Não se aplica (pro bono / permuta)');
r = ok(reg({ paciente: 'Beatriz Nova', profissional: 'Dr. Victor Cunha', procedimento: 'Consulta pediátrica', recebeu: 'Sim', forma: 'Pix' }), 'sem linha'); assert.strictEqual(r.pago, 'Sim'); assert.strictEqual(r.valor, 200); assert.strictEqual(r.bloco.situacao, 'sem-linha');
r = ok(reg({ paciente: 'Erica Teste', profissional: 'Giovana Grossi' }), 'erica out'); assert.strictEqual(r.pago, 'Não se aplica (pro bono / permuta)');
r = ok(reg({ paciente: 'Erica Teste', profissional: 'Giovana Grossi', data: '04/11/2026' }), 'erica nov'); assert.strictEqual(r.pago, 'Incluída na mensalidade'); assert.strictEqual(r.aba, 'Novembro');
// falta: Detalhe obrigatório em sem aviso; grava vazio em K e J, Detalhe na coluna, prefixo na Observação
let f = reg({ paciente: 'Julia Teste', profissional: 'Juliana Ribeiro', oque: 'Faltou sem aviso' }); assert.strictEqual(f.ok, false); assert.ok(/Detalhe/.test(f.erros[0]));
f = ok(reg({ paciente: 'Julia Teste', profissional: 'Juliana Ribeiro', oque: 'Faltou sem aviso', detalhe: 'não apareceu, não atendeu o telefone' }), 'falta');
assert.strictEqual(cel(O, f.linha, 'Pago?'), ''); assert.strictEqual(cel(O, f.linha, 'Valor (R$)'), ''); assert.strictEqual(cel(O, f.linha, 'Detalhe da falta'), 'não apareceu, não atendeu o telefone'); assert.ok(/^Falta\/desmarcação — não apareceu/.test(cel(O, f.linha, 'Observação'))); assert.strictEqual(f.pendenteDecisao, true);
ok(reg({ paciente: 'Julia Teste', profissional: 'Juliana Ribeiro', oque: 'Desmarcou com antecedência (≥ 24h)' }), 'desmarcou sem detalhe ok');
console.log('registrar ok');

// lista do dia: cobrancaHoje por item
const dia = API.listaDoDia({ data: '22/10/2026' }); const itJ = dia.itens.filter(i => i.paciente === 'Julia Teste')[0]; assert.ok(itJ.cobrancaHoje); assert.strictEqual(itJ.cobrancaHoje.curto, 'Fim do mês R$ 70');
// pendências: faltas → decidir e cadastro incompleto
const g = ok(API.gestaoResumo({ mes: 'Outubro' }), 'gestao'); assert.strictEqual(g.faltas.length, 2); assert.ok(g.faltas.some(x => x.detalhe === 'não apareceu, não atendeu o telefone')); assert.deepStrictEqual(g.cadastroIncompleto.map(x => x.paciente), ['Beatriz Nova']);
// decidir: taxa de falta = 50% de 70 = 35, linha nova Não; abate no mês seguinte vira abatimento em novembro
let dec = API.decidirFalta({ aba: 'Outubro', id: f.id, decisao: 'cobrar taxa de falta' }); ok(dec, 'decidir'); assert.strictEqual(dec.taxa.valor, 35); assert.strictEqual(cel(O, dec.taxa.linha, 'Procedimento'), 'Taxa de falta – psicologia'); assert.strictEqual(cel(O, f.linha, 'Decisão da gestão'), 'cobrar taxa de falta');
email = 'recepcao@x'; assert.strictEqual(API.decidirFalta({ aba: 'Outubro', id: f.id, decisao: 'relevar' }).ok, false); email = 'administrativo@clinicanascente.com.br';
const f2 = ok(reg({ paciente: 'Carlos Ant', profissional: 'Juliana Ribeiro', oque: 'Faltou avisando em cima da hora (< 24h)', detalhe: 'avisou às 7h' }), 'falta carlos');
ok(API.decidirFalta({ aba: 'Outubro', id: f2.id, decisao: 'abate no mês seguinte' }), 'abate');
const cm = ok(API.cobrancaMes({ chave: 'Novembro/2026' }), 'cobranca mes'); const cCarlos = cm.itens.filter(i => i.paciente === 'Carlos Ant')[0];
assert.strictEqual(cCarlos.abatimentos.length, 2, 'cancelado pela clínica + falta abatida'); assert.strictEqual(cCarlos.sessoesCobradas, 3); assert.strictEqual(cCarlos.valorMes, 210); assert.strictEqual(cCarlos.situacao, 'futura');
const cmO = ok(API.cobrancaMes({ chave: 'Outubro/2026' }), 'cm out'); const cJ = cmO.itens.filter(i => i.paciente === 'Julia Teste')[0]; assert.strictEqual(cJ.pagamento, 'Posterior'); assert.ok(cJ.aReceber >= 140 + 35, 'a receber de outubro = sessões Não + taxa'); assert.strictEqual(cmO.itens.filter(i => i.paciente === 'Inglidy Teste')[0].situacao, 'em dia');
assert.ok(cmO.itens.every(i => i.paciente !== 'Lays Teste'), 'na hora não entra na Cobrança do mês');
console.log('cobrança do mês ok · a receber Julia', cJ.aReceber);

// pagamento do mês: antecipado (recibo na aba do mês + colunas em Mensalistas), 2 competências; mensalidade; posterior marca as sessões
let pg = ok(API.registrarPagamentoMes({ paciente: 'Carlos Ant', profissional: 'Juliana Ribeiro', competencias: ['Novembro/2026', 'Dezembro/2026'], valor: '420', data: '15/10/2026', forma: 'Pix', nf: 'Sim', nfNumero: '77' }), 'pagar ant');
assert.strictEqual(pg.feitos.length, 2); assert.strictEqual(cel(O, pg.feitos[0].linha, 'Procedimento'), 'Antecipado de novembro (3 sessões)'); assert.strictEqual(cel(O, pg.feitos[0].linha, 'Valor (R$)'), 210); assert.strictEqual(cel(O, pg.feitos[0].linha, 'Pago?'), 'Sim');
const M = ss._m.Mensalistas; assert.ok(M.d[0].indexOf('NOVEMBRO/2026 — pago?') >= 0); const lc = M.d.findIndex(r => r[0] === 'Carlos Ant' && r[M.d[0].indexOf('Profissional')] === 'Juliana Ribeiro'); assert.ok(lc > 0); assert.strictEqual(M.d[lc][M.d[0].indexOf('NOVEMBRO/2026 — pago?')], 'Sim'); assert.strictEqual(M.d[lc][M.d[0].indexOf('NOVEMBRO/2026 — sessões agendadas')], 5);
const cm2 = ok(API.cobrancaMes({ chave: 'Novembro/2026' }), 'cm2'); assert.strictEqual(cm2.itens.filter(i => i.paciente === 'Carlos Ant')[0].situacao, 'em dia');
r = ok(reg({ paciente: 'Carlos Ant', profissional: 'Juliana Ribeiro', data: '09/11/2026' }), 'carlos nov'); assert.strictEqual(r.bloco.situacao, 'antecipado-pago');
pg = ok(API.registrarPagamentoMes({ paciente: 'Erica Teste', profissional: 'Giovana Grossi', competencias: ['Novembro/2026'], valor: '200', data: '15/10/2026', forma: 'Dinheiro' }), 'pagar mensal'); assert.strictEqual(cel(O, pg.feitos[0].linha, 'Procedimento'), 'Mensalidade de novembro');
pg = ok(API.registrarPagamentoMes({ paciente: 'Julia Teste', profissional: 'Juliana Ribeiro', competencias: ['Outubro/2026'], valor: '245', data: '15/10/2026', forma: 'Pix' }), 'pagar posterior'); assert.ok(pg.feitos[0].sessoesMarcadas >= 3); assert.strictEqual(cel(O, 2, 'Pago?'), 'Sim'); assert.strictEqual(fmt(cel(O, 2, 'Data do pagamento'), '', 'dd/MM/yyyy'), '15/10/2026');
assert.strictEqual(ok(API.cobrancaMes({ chave: 'Outubro/2026' }), 'cm3').itens.filter(i => i.paciente === 'Julia Teste')[0].situacao, 'em dia');
// gestão edita sessões; criar colunas
ok(API.editarSessoesCompetencia({ paciente: 'Carlos Ant', profissional: 'Juliana Ribeiro', chave: 'Dezembro/2026', sessoes: 2, motivo: 'viagem' }), 'editar'); assert.strictEqual(ok(API.cobrancaMes({ chave: 'Dezembro/2026' }), 'cm dez').itens.filter(i => i.paciente === 'Carlos Ant')[0].sessoes, 2);
ok(API.criarColunasMes({ chave: 'Janeiro/2027' }), 'colunas'); assert.ok(M.d[0].indexOf('JANEIRO/2027 — NF') >= 0); assert.strictEqual(API.criarColunasMes({ chave: 'Janeiro/2027' }).ok, false);
console.log('pagamento do mês ok');

// cadastro: nova linha, valor fora da lista exige observação, log
let sc = API.salvarCobrancaProf({ paciente: 'Beatriz Nova', profissional: 'Dr. Victor Cunha', cobranca: 'Por sessão', valorSessao: '150', decididoPor: 'Victor' }); assert.strictEqual(sc.ok, false); assert.ok(/fora da lista/.test(sc.erros[0]));
sc = ok(API.salvarCobrancaProf({ paciente: 'Beatriz Nova', profissional: 'Dr. Victor Cunha', cobranca: 'Por sessão', valorSessao: '200', decididoPor: 'Victor' }), 'cpp nova'); assert.ok(/^C-/.test(sc.id));
r = ok(reg({ paciente: 'Beatriz Nova', profissional: 'Dr. Victor Cunha', procedimento: 'Consulta pediátrica', recebeu: 'Sim', forma: 'Pix' }), 'beatriz com linha'); assert.strictEqual(r.bloco.situacao, 'na-hora');
sc = ok(API.salvarCobrancaProf({ id: sc.id, paciente: 'Beatriz Nova', profissional: 'Dr. Victor Cunha', cobranca: 'Por sessão', valorSessao: '200', pagamento: 'Posterior', decididoPor: 'Victor' }), 'cpp edit'); assert.deepStrictEqual(sc.alterados, ['Pagamento']);
assert.ok(ss._m['Alterações de cadastro'].d.some(l => /Cobrança por profissional · Dr. Victor Cunha · Pagamento/.test(l[2])));
email = 'recepcao@x'; assert.strictEqual(API.salvarCobrancaProf({ paciente: 'Beatriz Nova', profissional: 'Juliana Ribeiro', cobranca: 'Pro bono', decididoPor: 'x' }).ok, false);
email = 'administrativo@clinicanascente.com.br';

// lançamento repetido (13/10 na real: o mesmo "Desmarcou" gravado duas vezes, um minuto depois): recusa e diz onde está
const rep1 = ok(API.registrarAtendimento({ paciente: 'Lays Teste', profissional: 'Giovana Grossi', data: '20/10/2026', hora: '14:00', procedimento: 'Sessão de psicologia', oque: 'Desmarcou com antecedência (≥ 24h)' }), 'rep1');
const rep2 = API.registrarAtendimento({ paciente: 'Lays Teste', profissional: 'Giovana Grossi', data: '20/10/2026', hora: '14:00', procedimento: 'Sessão de psicologia', oque: 'Desmarcou com antecedência (≥ 24h)' });
assert.strictEqual(rep2.ok, false); assert.strictEqual(rep2.repetido, true); assert.ok(new RegExp('linha ' + rep1.linha).test(rep2.erros[0]), rep2.erros[0]);
ok(API.registrarAtendimento({ paciente: 'Lays Teste', profissional: 'Giovana Grossi', data: '20/10/2026', hora: '15:00', procedimento: 'Sessão de psicologia', oque: 'Desmarcou com antecedência (≥ 24h)' }), 'outra hora grava');
ok(API.registrarAtendimento({ paciente: 'Lays Teste', profissional: 'Giovana Grossi', data: '20/10/2026', hora: '14:00', procedimento: 'Sessão de psicologia', oque: 'Desmarcou com antecedência (≥ 24h)', confirmouRepetido: true }), 'confirmado grava');
// sem cobrança cadastrada (bloco pede Recebeu?): sem resposta não grava "Sim" sozinho; Sim sem forma também não
let sr = reg({ paciente: 'Beatriz Nova', profissional: 'Juliana Ribeiro', data: '21/10/2026' }); assert.strictEqual(sr.ok, false, JSON.stringify(sr)); assert.ok(/recebeu\?/.test(sr.erros[0]), sr.erros[0]);
sr = reg({ paciente: 'Beatriz Nova', profissional: 'Juliana Ribeiro', data: '21/10/2026', recebeu: 'Sim' }); assert.strictEqual(sr.ok, false); assert.ok(/forma/.test(sr.erros[0]), sr.erros[0]);
assert.strictEqual(ok(reg({ paciente: 'Beatriz Nova', profissional: 'Juliana Ribeiro', data: '21/10/2026', recebeu: 'Não' }), 'sem linha não').pago, 'Não');
console.log('lançamento repetido ok');

// lista do dia: pagamento do mês e taxa de falta no mesmo dia da sessão não escondem a sessão (eram a mesma chave paciente × profissional)
ok(reg({ paciente: 'Carlos Ant', profissional: 'Juliana Ribeiro', data: '19/10/2026', recebeu: '' }), 'carlos 19');
ok(API.registrarPagamentoMes({ paciente: 'Carlos Ant', profissional: 'Juliana Ribeiro', competencias: ['Janeiro/2027'], valor: '210', data: '19/10/2026', forma: 'Pix' }), 'pagar no dia');
const d19 = API.listaDoDia({ data: '19/10/2026' }), its19 = d19.itens.filter(i => i.paciente === 'Carlos Ant');
assert.strictEqual(its19.length, 2, JSON.stringify(its19.map(i => [i.origem, i.registro && i.registro.procedimento])));
assert.ok(its19.some(i => !i.extra && /^Sessão/.test(i.registro.procedimento)), 'a sessão continua na lista');
assert.ok(its19.some(i => i.extra && /^Antecipado de janeiro/.test(i.registro.procedimento) && i.cobrancaHoje.situacao === 'linha-extra'), 'o pagamento vem como linha à parte');
assert.ok(API.agendaSemana({ data: '19/10/2026' }).dias.every(dd => dd.itens.every(i => !i.extra)), 'a grade não mostra linhas extras');
console.log('linhas extras na lista do dia ok');

// Agenda recorrente: Tipo (coluna nova no fim, só quando alguém escolhe) → aplicação de teste sem cobrança e fora do antecipado
const AR = ss._m['Agenda recorrente'];
assert.strictEqual(API.salvarAgendaFixa({ paciente: 'Davi Teste', profissional: 'Giovana Grossi', diaSemana: 'Terça', hora: '13:00', tipo: 'Teste' }).ok, false);
ok(API.salvarAgendaFixa({ paciente: 'Davi Teste', profissional: 'Juliana Ribeiro', diaSemana: 'Terça', hora: '16:00' }), 'sem tipo'); assert.ok(AR.d[0].indexOf('Tipo') < 0, 'sem escolher, não cria a coluna');
const ft = ok(API.salvarAgendaFixa({ paciente: 'Davi Teste', profissional: 'Giovana Grossi', diaSemana: 'Terça', hora: '13:00', tipo: 'Aplicação de teste' }), 'com tipo');
assert.strictEqual(AR.d[ft.linha - 1][AR.d[0].indexOf('Tipo')], 'Aplicação de teste');
const it27 = API.listaDoDia({ data: '27/10/2026' }).itens.filter(i => i.paciente === 'Davi Teste' && i.profissional === 'Giovana Grossi')[0];
assert.strictEqual(it27.tipo, 'Aplicação de teste'); assert.strictEqual(it27.cobrancaHoje.situacao, 'sem-cobranca-tipo');
// aplicações de teste (gestão, 15/10): agendamento avulso com tipo "Aplicação de teste", contagem por paciente × profissional
const APL = 'Aplicação de teste – avaliação neuropsicológica';
ok(reg({ paciente: 'Davi Teste', profissional: 'Giovana Grossi', data: '13/10/2026', procedimento: APL }), 'apl 1');
ok(reg({ paciente: 'Davi Teste', profissional: 'Giovana Grossi', data: '14/10/2026', procedimento: APL }), 'apl 2');
ok(reg({ paciente: 'Davi Teste', profissional: 'Giovana Grossi', data: '16/10/2026', procedimento: APL, oque: 'Desmarcou com antecedência (≥ 24h)' }), 'desmarcou não conta');
// linha antiga (setembro importado) sem procedimento: conta pela observação
ss._m.Setembro.d.push(linhaMes(24, 8, 'Davi Teste', 'Giovana Grossi', '', 'Atendido', '', 'Não se aplica (pro bono / permuta)', 'S9', { 'Observação': 'Pro bono (Giovana) — teste da avaliação neuropsicológica, sem cobrança' }));
ss._m.Setembro.d.push(linhaMes(25, 8, 'Davi Teste', 'Giovana Grossi', '', 'Atendido', '', 'Não', 'S10', { 'Observação': 'sessão comum' }));
invalidar_(['comp']);
ok(API.acrescentarAoDia({ data: '23/10/2026', hora: '13:00', paciente: 'Davi Teste', profissional: 'Giovana Grossi', origem: 'Aplicação de teste' }), 'agendar aplicação');
const it23 = API.listaDoDia({ data: '23/10/2026' }).itens.filter(i => i.paciente === 'Davi Teste' && i.profissional === 'Giovana Grossi')[0];
assert.strictEqual(it23.tipo, 'Aplicação de teste'); assert.strictEqual(it23.cobrancaHoje.situacao, 'sem-cobranca-tipo'); assert.strictEqual(it23.aplicacao, 4); assert.strictEqual(it23.cobrancaHoje.curto, 'Aplicação nº 4 · sem cobrança');
const it14 = API.listaDoDia({ data: '14/10/2026' }).itens.filter(i => i.paciente === 'Davi Teste' && i.profissional === 'Giovana Grossi' && i.registro && /^Atendido/.test(i.registro.oque))[0];
assert.ok(it14 && it14.aplicacao === 3, 'registrada no dia: nº 3');
assert.deepStrictEqual(ok(API.bootstrapAtendimento(), 'bootAt').aplicacoes['Davi Teste|Giovana Grossi'], [20260924, 20261013, 20261014]);
const av = ok(API.gestaoResumo({ mes: 'Outubro' }), 'gestao av').avaliacoes.filter(x => x.paciente === 'Davi Teste' && x.profissional === 'Giovana Grossi')[0];
assert.ok(av && av.n === 3 && av.primeira === '24/09/2026' && av.ultima === '14/10/2026' && av.diasSemVir === 1, JSON.stringify(av));
console.log('aplicações de teste ok');

// linha com Ativo = Não não vale (antes: a segunda normalização transformava false em "false" e a linha voltava a valer)
const CP = ss._m['Cobrança por profissional']; CP.d.push(['C99', 'Julia Teste', 'Dr. Victor Cunha', 'Não', 'Convênio', 'Cedplan', '', '', 'Não se aplica', '', '', 'x', '15/10/2026', '', 'x']);
invalidar_(['cpp']); assert.strictEqual(linhaVigente_('Julia Teste', 'Dr. Victor Cunha', new Date(2026, 9, 20, 12)).linha, null, 'linha inativa não vale');
assert.strictEqual(Cobranca.linhaVigente(cobrancasProf_(), 'Julia Teste', 'Dr. Victor Cunha', '20/10/2026').linha, null, 'nem relida pelo módulo (tela)');
assert.ok(Cobranca.linhasDoPaciente(cobrancasProf_(), 'Julia Teste', '20/10/2026').every(l => l.profissional !== 'Dr. Victor Cunha'));
console.log('servidor-fase1.test.js ok');
