// node tests/servidor-conciliacao-ia.test.js — conciliação assistida (IA parte 2) contra a planilha falsa: regras fixas (resgate,
// própria clínica, antes do 1º mês do app), o que vai pro modelo (sem dígitos de documento, só o que sobrou das regras), a conferência
// das sugestões (código inexistente, lançamento repetido, soma, tipo), a coluna "Sugestão IA", a sugestão guardada conferida de novo
// ao carregar, pausa e chave, e aceitar = o mesmo API.conciliar de sempre.
const assert = require('assert');
const { fmt, planilha } = require('./planilha-falsa');
const fakes = require('./fakes-google');
const AGORA = new Date(2026, 9, 16, 10, 0), RealDate = Date;
global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(AGORA.getTime()); } static now() { return AGORA.getTime(); } };
const HP = ['Nome', 'Código', 'CPF', 'Data de nascimento', 'Ativo', 'Cobrança', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'Histórico de cobrança (antigo)', 'Pagador habitual (responsável financeiro)', 'Nome do pagador como aparece no extrato', 'Convênio', 'Regra de cobrança', 'Observação de cobrança (a recepção lê — diz O QUE cobrar, nunca o porquê)', 'Registrado por (app)', 'WhatsApp do pagador'];
const pac = (nome, pagador, cpf) => { const l = HP.map(() => ''); l[0] = nome; l[2] = cpf || ''; l[4] = 'Sim'; l[14] = pagador || ''; l[16] = 'Particular'; return l; };
const HM = ['Data', 'Hora', 'Paciente', 'Profissional', 'Procedimento', 'Convênio (auto)', 'Modalidade (auto)', '⚠ Atenção na cobrança (auto)', 'O que aconteceu', 'Valor (R$)', 'Pago?', 'Data do pagamento', 'Forma de pagamento', 'Pagador habitual (auto)', 'Quem pagou (só se foi outra pessoa)', 'NF emitida?', 'Nº da NF', 'Guia assinada? (convênio)', 'Observação', 'ID', 'Registrado por (app)'];
const lanc = (id, data, paciente, valor, forma, pago) => [data, '09:00', paciente, 'Juliana Ribeiro', 'Sessão de psicologia', 'Particular', '', '', 'Atendido', valor, pago || 'Sim', pago === 'Não' ? '' : data, pago === 'Não' ? '' : forma, '', '', '', '', '', '', id, 'rec@x · ' + data];
const ss = planilha({
  Pacientes: [HP, pac('Ana Souza', 'Carla Souza'), pac('Gustavo Travnik', 'Debora Leidiane Travnik', '111.222.333-44'), pac('Lia Mensal', 'Marta Mensal'), pac('Rui Aberto', 'Paulo Aberto'), pac('Bruno Card')],
  'Parâmetros': [['Parâmetro', 'Valor', 'Descrição']],
  Listas: [['O que aconteceu', 'Convênio', 'Gestão'], ['Atendido', 'Particular', 'gestao@clinicanascente.com.br'], ['', 'Cedplan', '']],
  Profissionais: [['Profissional', 'Especialidade', 'Ativo'], ['Juliana Ribeiro', 'Psicologia', 'Sim']],
  Procedimentos: [['Procedimento', 'Especialidade', 'Valor', 'Obs'], ['Sessão de psicologia', 'Psicologia', 120, '']],
  Mensalistas: [['Paciente', 'Modalidade', 'Valor', 'Pagador', 'OUTUBRO/2026 — sessões agendadas', 'OUTUBRO/2026 — valor cobrado', 'OUTUBRO/2026 — pago?', 'OUTUBRO/2026 — data', 'OUTUBRO/2026 — forma', 'OUTUBRO/2026 — NF'],
    ['Lia Mensal', 'Mensal', 425, 'Marta Mensal', 4, 425, 'Sim', '03/10/2026', 'Pix', '']],
  'Cobrança por profissional': [['ID', 'Paciente', 'Profissional', 'Ativo', 'Cobrança', 'Convênio', 'Valor por sessão (R$)', 'Valor mensal (R$)', 'Pagamento', 'Vigente desde', 'Vigente até', 'Valor decidido por', 'Valor decidido em', 'Observação de cobrança', 'Registrado por (app)'],
    ['C-1', 'Rui Aberto', 'Juliana Ribeiro', 'Sim', 'Mensalidade fixa', '', '', 150, 'Antecipado', '', '', 'gestão', '01/10/2026', '', '']],
  Setembro: [HM, lanc('S1', '15/09/2026', 'Ana Souza', 120, 'Dinheiro')],
  Outubro: [HM, lanc('L1', '02/10/2026', 'Gustavo Travnik', 90, 'Pix'), lanc('L2', '09/10/2026', 'Gustavo Travnik', 90, 'Pix'), lanc('L4', '05/10/2026', 'Ana Souza', 120, 'Pix'),
    lanc('R1', '06/10/2026', 'Rui Aberto', 120, 'Pix', 'Não'), lanc('L5', '05/10/2026', 'Bruno Card', 200, 'Cartão de crédito')]
});
let email = 'gestao@clinicanascente.com.br';
global.SpreadsheetApp = { getActiveSpreadsheet: () => ss, flush() { } };
global.LockService = { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) };
global.Session = { getActiveUser: () => ({ getEmail: () => email }) };
let resposta = null;
const F = fakes.instalar({ responder: body => resposta ? resposta(body) : null });
const API = (0, eval)(require('./carregar-servidor')());
const ok = (r, msg) => { if (!r || r.ok === false) { console.error(msg, JSON.stringify(r)); process.exit(1); } return r; };
const setIA = (k, v) => { const s = ss.getSheetByName('IA'); s.getRange(2, 1, s.getLastRow() - 1, 1).getValues().forEach((r, i) => { if (r[0] === k) s.getRange(i + 2, 2).setValue(v); }); };

const tx = (id, data, valor, memo) => `<STMTTRN>\n<TRNTYPE>IN\n<DTPOSTED>${data}120000[-3:BRT]\n<TRNAMT>${valor}\n<FITID>${id}\n<MEMO>${memo}\n</STMTTRN>`;
ok(API.importarExtrato({ texto: '<OFX>\n' + [
  tx('B1', '20261005', '120.00', 'Pix recebido - Carla Souza'),
  tx('B2', '20261010', '180.00', 'Pix recebido - 62.985.207 Debora Leidiane Travnik'),
  tx('B3', '20261003', '425.00', 'Pix recebido - Marta Mensal'),
  tx('B4', '20261008', '120.00', 'Pix recebido - Paulo Aberto'),
  tx('B5', '20261006', '500.00', 'Renda Fixa - Resgate de CDB'),
  tx('B6', '20261007', '1000.00', 'Pix recebido - Clinica Nascente Ltda'),
  tx('B7', '20261011', '77.00', 'Pix recebido - Fulano Qualquer'),
  tx('B9', '20261025', '90.00', 'Pix recebido - Outro Travnik'),
  tx('B8', '20260810', '100.00', 'Pix recebido - Velho Paciente')].join('\n') + '\n</OFX>' }), 'importa');

// 1. regras fixas, sem IA: resgate e própria clínica = não é paciente; antes do 1º mês do app (setembro) = mês anterior ao app
let c = ok(API.conciliacao({ chave: 'Outubro/2026' }), 'conciliação');
const sl = id => c.semLancamento.find(e => e.id === id);
assert.strictEqual(c.inicioApp, '01/09/2026');
assert.strictEqual(sl('B5').sugestao, 'não é paciente'); assert.ok(sl('B5').fixa); assert.strictEqual(sl('B6').sugestao, 'não é paciente');
assert.ok(c.sugestoes.some(s => s.ext.id === 'B1'), 'B1 casa pela regra de sempre');
assert.ok(!sl('B2').sugestao && !sl('B2').ia); assert.strictEqual(c.ia.aSugerir, 5, 'B2, B3, B4, B7, B9'); assert.strictEqual(c.ia.comIA, 0);
assert.ok(/Chave/.test(c.ia.bloqueio), 'sem chave: botão avisa');
const ago = ok(API.conciliacao({ chave: 'Agosto/2026' }), 'agosto');
assert.strictEqual(ago.semLancamento.find(e => e.id === 'B8').sugestao, 'mês anterior ao app'); assert.strictEqual(ago.ia.aSugerir, 0);
console.log('regras fixas ok');

// 2. só gestão; sem chave e pausada: nada vai pro modelo, nada gravado
email = 'recepcao@clinicanascente.com.br'; assert.strictEqual(API.conciliacaoIA({ chave: 'Outubro/2026' }).ok, false); email = 'gestao@clinicanascente.com.br';
let r = API.conciliacaoIA({ chave: 'Outubro/2026' }); assert.strictEqual(r.ok, false); assert.strictEqual(r.motivo, 'sem_chave'); assert.strictEqual(F.chamadas.length, 0);
F.props.ANTHROPIC_API_KEY = 'sk-teste';
setIA('ia_conciliacao', 'Não'); r = API.conciliacaoIA({ chave: 'Outubro/2026' }); assert.strictEqual(r.motivo, 'pausada_item'); assert.ok(/Conciliação/.test(r.erros[0])); assert.strictEqual(F.chamadas.length, 0); setIA('ia_conciliacao', 'Sim');
assert.ok(!ss._m['Extrato bancário'].d.slice(1).some(l => l[11]), 'coluna Sugestão IA vazia');

// 3. a chamada: o modelo recebe só o que sobrou, sem dígitos de documento; responde com códigos; o app confere
const codigo = (texto, re) => { const m = texto.match(re); return m ? m[1] : null; };
resposta = body => {
  const t = body.messages[0].content[0].text, E = q => codigo(t, new RegExp('(E\\d+) · [^\\n]*quem pagou: ' + q));
  const Lg = (t.match(/(L\d+) · paciente Gustavo Travnik/g) || []).map(x => x.split(' ')[0]);
  const M = codigo(t, /(M\d+) · paciente Lia Mensal/), A = codigo(t, /(A\d+) · paciente Rui Aberto/);
  return { content: [{ type: 'text', text: JSON.stringify({ sugestoes: [
    { entrada: E('Debora Leidiane Travnik'), acao: 'ligar', lancamentos: Lg, situacao: '', confianca: 'alta', motivo: 'Pix da mãe pelas duas sessões do Gustavo' },
    { entrada: E('Marta Mensal'), acao: 'situacao', lancamentos: [M], situacao: 'mensalidade anotada em Mensalistas', confianca: 'alta', motivo: 'mensalidade de outubro da Lia' },
    { entrada: E('Paulo Aberto'), acao: 'em_aberto', lancamentos: [A], situacao: '', confianca: 'media', motivo: 'parece a sessão do Rui de 06/10, ainda em aberto' },
    { entrada: E('Fulano Qualquer'), acao: 'ligar', lancamentos: ['L999'], situacao: '', confianca: 'alta', motivo: 'inventado' },
    { entrada: E('Outro Travnik'), acao: 'ligar', lancamentos: [Lg[0]], situacao: '', confianca: 'alta', motivo: 'reusa o L do Gustavo' },
    { entrada: E('Debora Leidiane Travnik'), acao: 'nenhuma', lancamentos: [], situacao: '', confianca: 'baixa', motivo: 'repetida: ignorar' }] }) }],
    usage: { input_tokens: 3000, output_tokens: 600 }, stop_reason: 'end_turn', model: 'claude-sonnet-5-5' };
};
r = ok(API.conciliacaoIA({ chave: 'Outubro/2026' }), 'sugerir');
assert.strictEqual(F.chamadas.length, 1, 'um lote'); const req = F.chamadas[0].body, texto = req.messages[0].content[0].text;
assert.strictEqual(req.model, 'claude-sonnet-5-5'); assert.ok(/conciliar o extrato/.test(req.system), 'instrução da aba IA'); assert.strictEqual(req.output_config.format.type, 'json_schema');
assert.ok(!/62\.985|985\.207|111\.222/.test(texto), 'sem dígitos de documento nem CPF'); assert.ok(/quem pagou: Debora Leidiane Travnik/.test(texto));
assert.ok(!/Carla Souza/.test(texto.split('RECEBIMENTOS')[0]), 'B1 já casou pela regra'); assert.ok(!/Resgate|Clinica Nascente|Velho Paciente/.test(texto), 'regras fixas e agosto não vão');
assert.ok(!/Ana Souza · sessão/.test(texto) && !/L\d+ · paciente Ana Souza/.test(texto), 'L4 ocupado pela regra não é candidato');
assert.ok(/M\d+ · paciente Lia Mensal \(pagador: Marta Mensal\) · Outubro\/2026 · R\$ 425,00/.test(texto)); assert.ok(/A\d+ · paciente Rui Aberto/.test(texto));
assert.ok(/L\d+ · paciente Bruno Card[^\n]*Cartão/.test(texto), 'cartão também é candidato (só pra venda)');
assert.ok(/PAGADORES CONHECIDOS[\s\S]*E\d+ · Debora Leidiane Travnik → cadastro: Gustavo Travnik \(pagador habitual\)/.test(texto), 'cadastro diz quem paga por quem');
assert.ok(/E\d+ · Marta Mensal → cadastro: Lia Mensal \(pagador habitual\)/.test(texto));
assert.strictEqual(r.sugeridas, 3); assert.strictEqual(r.semSugestao, 2, 'L999 e o L repetido viram "nenhuma"'); assert.strictEqual(r.custo, 0.012, '3000 × 2 + 600 × 10 por milhão');
const log = ss._m['IA log'].d; assert.strictEqual(log[log.length - 1][1], 'conciliacao'); assert.strictEqual(log[log.length - 1][3], 5, 'linhas = entradas do lote');
const E2 = ss._m['Extrato bancário'].d, hS = E2[0].indexOf('Sugestão IA'), sugDe = id => JSON.parse(E2.find(l => l[0] === id)[hS] || 'null');
assert.strictEqual(hS, 11); assert.strictEqual(sugDe('B2').acao, 'ligar'); assert.strictEqual(sugDe('B7').acao, 'nenhuma'); assert.ok(/descartada/.test(sugDe('B7').motivo)); assert.strictEqual(sugDe('B5'), null);
assert.strictEqual(E2.find(l => l[0] === 'B2')[6], 'pendente', 'só sugestão: situação não muda');
console.log('chamada ok');

// 4. ao carregar: sugestão conferida na tela; sem nova chamada quando já tem
c = ok(API.conciliacao({ chave: 'Outubro/2026' }), 'depois');
assert.deepStrictEqual(sl('B2').ia.recs.map(x => x.id).sort(), ['L1', 'L2']); assert.strictEqual(sl('B2').ia.conf, 'alta'); assert.strictEqual(sl('B2').ia.aviso, '');
assert.strictEqual(sl('B3').ia.sit, 'mensalidade anotada em Mensalistas'); assert.deepStrictEqual(sl('B4').ia.abertos.map(a => a.id), ['R1']); assert.strictEqual(sl('B4').ia.abertos[0].valor, 120);
assert.strictEqual(sl('B7').ia.acao, 'nenhuma'); assert.strictEqual(c.ia.comIA, 5); assert.strictEqual(c.ia.aSugerir, 0);
r = ok(API.conciliacaoIA({ chave: 'Outubro/2026' }), 'de novo'); assert.strictEqual(r.sugeridas, 0); assert.ok(/Nada a sugerir/.test(r.mensagem)); assert.strictEqual(F.chamadas.length, 1);

// 5. aceitar = API.conciliar com os lançamentos sugeridos; a sugestão que deixou de valer some
ok(API.conciliar({ itens: [{ tipo: 'ext', id: 'B2', recs: sl('B2').ia.recs.map(x => ({ aba: x.aba, linha: x.linha, id: x.id })) }, { tipo: 'ext', id: 'B3', situacao: sl('B3').ia.sit, obs: 'IA: ' + sl('B3').ia.motivo }] }), 'aceitar');
const O = ss._m.Outubro.d, hc = O[0].indexOf('Conciliado'); assert.ok(O[1][hc] && O[2][hc], 'L1 e L2 conciliados');
O[4][10] = 'Sim'; O[4][11] = '08/10/2026'; O[4][12] = 'Pix'; // a recepção registrou o pagamento do Rui: a sugestão "em aberto" perde o sentido
c = ok(API.conciliacao({ chave: 'Outubro/2026' }), 'depois de aceitar');
assert.ok(!sl('B2') && !sl('B3'), 'resolvidas'); assert.ok(!sl('B4'), 'Rui pago: o Pix do pai casa pela regra e a sugestão "em aberto" some');
assert.deepStrictEqual(c.sugestoes.find(x => x.ext && x.ext.id === 'B4').recs.map(x => x.id), ['R1']);
assert.strictEqual(c.resolvidos.find(e => e.id === 'B3').obs, 'IA: mensalidade de outubro da Lia');

// 6. refazer: pede de novo as soltas (B7, B9); ligar Pix a lançamento em cartão é descartado
resposta = body => { const t = body.messages[0].content[0].text, e = codigo(t, /(E\d+) · [^\n]*Fulano Qualquer/), l = codigo(t, /(L\d+) · paciente Bruno Card/);
  return { content: [{ type: 'text', text: JSON.stringify({ sugestoes: [{ entrada: e, acao: 'ligar', lancamentos: [l], situacao: '', confianca: 'alta', motivo: 'Pix pela venda do Bruno' }] }) }], usage: { input_tokens: 100, output_tokens: 50 }, stop_reason: 'end_turn', model: 'claude-sonnet-5-5' }; };
r = ok(API.conciliacaoIA({ chave: 'Outubro/2026', refazer: true }), 'refazer'); assert.strictEqual(F.chamadas.length, 2); assert.strictEqual(r.sugeridas, 0); assert.strictEqual(r.semSugestao, 2);
c = ok(API.conciliacao({ chave: 'Outubro/2026' }), 'depois de refazer'); assert.ok(/descartada/.test(sl('B7').ia.motivo), 'Pix × cartão não vale'); assert.ok(/não respondeu/.test(sl('B9').ia.motivo));

// 7. erro da API no meio: nada gravado, mensagem pra tela
resposta = () => ({ code: 529, json: { type: 'error', error: { message: 'Overloaded' } } });
r = API.conciliacaoIA({ chave: 'Outubro/2026', refazer: true }); assert.strictEqual(r.ok, false); assert.ok(/529/.test(r.erros[0]));
c = ok(API.conciliacao({ chave: 'Outubro/2026' }), 'depois do erro'); assert.ok(/não respondeu/.test(sl('B9').ia.motivo), 'sugestão anterior mantida');

// 8. decisões anteriores da gestão pro mesmo pagador: situação fixa vira sugestão sem IA; ligação vira contexto pra IA
ok(API.conciliar({ itens: [{ tipo: 'ext', id: 'B9', situacao: 'aluguel de sala' }] }), 'B9 aluguel');
ok(API.importarExtrato({ texto: '<OFX>\n' + [tx('B12', '20261028', '50.00', 'Pix recebido - Outro Travnik'), tx('B13', '20261029', '90.00', 'Pix recebido - 777 Debora Leidiane Travnik')].join('\n') + '\n</OFX>' }), 'importa 2');
c = ok(API.conciliacao({ chave: 'Outubro/2026' }), 'com histórico');
assert.strictEqual(sl('B12').sugestao, 'aluguel de sala'); assert.strictEqual(sl('B12').historico, 1); assert.ok(!sl('B12').fixa, 'não entra no lote de fixas');
resposta = body => ({ content: [{ type: 'text', text: JSON.stringify({ sugestoes: [] }) }], usage: { input_tokens: 10, output_tokens: 5 }, stop_reason: 'end_turn', model: 'claude-sonnet-5-5' });
F.chamadas.length = 0; ok(API.conciliacaoIA({ chave: 'Outubro/2026' }), 'sugerir B13');
const t8 = F.chamadas[0].body.messages[0].content[0].text;
assert.ok(/E\d+ · Debora Leidiane Travnik → cadastro: Gustavo Travnik \(pagador habitual\) → decisões anteriores da gestão: 1× conciliado — ligado a Gustavo Travnik/.test(t8), t8.split('PAGADORES')[1].slice(0, 300));
assert.ok(!/quem pagou: Outro Travnik/.test(t8), 'B12 já tem sugestão pelo histórico');

// 9. Pix que paga sessão em aberto, resolvido na própria conciliação (gestão, 17/10): registra o recebimento e concilia
O.push(lanc('R2', '20/10/2026', 'Rui Aberto', 200, 'Pix', 'Não'), lanc('R3', '27/10/2026', 'Rui Aberto', 120, 'Pix', 'Não'));
ok(API.importarExtrato({ texto: '<OFX>\n' + [tx('B20', '20261030', '100.00', 'Pix recebido - Paulo Aberto'), tx('B21', '20261030', '500.00', 'Pix recebido - Paulo Aberto'), tx('B22', '20261031', '220.00', 'Pix recebido - Paulo Aberto')].join('\n') + '\n</OFX>' }), 'importa 3');
c = ok(API.conciliacao({ chave: 'Outubro/2026' }), 'com abertos');
assert.deepStrictEqual(c.abertos.map(a => a.id).sort(), ['R2', 'R3'], 'lista de sessões em aberto pra escolher à mão'); assert.strictEqual(c.abertos.find(a => a.id === 'R2').pagador, 'Paulo Aberto');
const ab = id => { const a = c.abertos.find(x => x.id === id); return { aba: a.aba, linha: a.linha, id: a.id }; };
email = 'recepcao@clinicanascente.com.br'; assert.strictEqual(API.conciliarAberto({ id: 'B20', abertos: [ab('R2')] }).ok, false, 'só gestão'); email = 'gestao@clinicanascente.com.br';
r = API.conciliarAberto({ id: 'B21', abertos: [ab('R2'), ab('R3')] }); assert.strictEqual(r.ok, false); assert.ok(/maior que o em aberto/.test(r.erros[0]), 'Pix maior que o em aberto: recusa');
const hO = n => O[0].indexOf(n), linR = id => O.find(l => l[hO('ID')] === id);
assert.strictEqual(linR('R2')[hO('Pago?')], 'Não', 'recusa não grava nada');
r = ok(API.conciliarAberto({ id: 'B20', abertos: [ab('R2')] }), 'parcial');
assert.deepStrictEqual(r.pagos.map(p => [p.id, p.valor, p.quitou]), [['R2', 100, false]]);
assert.strictEqual(linR('R2')[hO('Pago?')], 'Parcial'); assert.strictEqual(linR('R2')[hO('Valor recebido (R$)')], 100); { const dp = linR('R2')[hO('Data do pagamento')]; assert.strictEqual(dp instanceof RealDate ? fmt(dp, '', 'dd/MM/yyyy') : dp, '30/10/2026'); } assert.strictEqual(linR('R2')[hO('Forma de pagamento')], 'Pix');
assert.ok(/Recebido R\$ 100,00 em 30\/10\/2026 \(Pix\)/.test(linR('R2')[hO('Observação')]), linR('R2')[hO('Observação')]); assert.ok(/PagBank 30\/10\/2026 · R\$ 100,00/.test(linR('R2')[hO('Conciliado')]));
c = ok(API.conciliacao({ chave: 'Outubro/2026' }), 'depois do parcial');
assert.strictEqual(c.resolvidos.find(e => e.id === 'B20').situacao, 'conciliado'); assert.strictEqual(c.abertos.find(a => a.id === 'R2').valor, 100, 'fica R$ 100 em aberto');
assert.ok(!c.semBanco.some(x => x.id === 'R2'), 'o recebimento novo já sai conciliado');
assert.strictEqual(API.conciliarAberto({ id: 'B20', abertos: [ab('R2')] }).ok, false, 'entrada já resolvida');
r = ok(API.conciliarAberto({ id: 'B22', abertos: [ab('R3'), ab('R2')] }), 'duas sessões');
assert.deepStrictEqual(r.pagos.map(p => [p.id, p.valor, p.quitou]), [['R2', 100, true], ['R3', 120, true]], 'da mais antiga pra mais nova');
assert.strictEqual(linR('R2')[hO('Pago?')], 'Sim'); assert.strictEqual(linR('R3')[hO('Pago?')], 'Sim');
c = ok(API.conciliacao({ chave: 'Outubro/2026' }), 'depois de quitar');
assert.ok(/R2.*\+.*R3|R3.*\+.*R2/.test(c.resolvidos.find(e => e.id === 'B22').ligado)); assert.ok(!c.abertos.length || !c.abertos.some(a => /^R[23]$/.test(a.id)));
assert.ok(!c.semBanco.some(x => /^R[23]$/.test(x.id)), 'os dois recebimentos do R2 conciliados (um por Pix)');
console.log('pagar sessão em aberto ok');

// 10. Pix maior que o em aberto: a sobra vira adiantamento de mensalidade se fecha com os meses seguintes (gestão, 17/10, caso do Igor)
O.push(lanc('R4', '28/10/2026', 'Rui Aberto', 120, 'Pix', 'Não'), lanc('R5', '29/10/2026', 'Ana Souza', 120, 'Pix', 'Não'));
ok(API.importarExtrato({ texto: '<OFX>\n' + [tx('B30', '20261030', '420.00', 'Pix recebido - Paulo Aberto'), tx('B31', '20261030', '300.00', 'Pix recebido - Paulo Aberto'), tx('B32', '20261030', '200.00', 'Pix recebido - Carla Souza')].join('\n') + '\n</OFX>' }), 'importa 4');
c = ok(API.conciliacao({ chave: 'Outubro/2026' }), 'com R4');
r = API.conciliarAberto({ id: 'B32', abertos: [ab('R5')] }); assert.strictEqual(r.ok, false); assert.ok(/não tem cobrança mensal/.test(r.erros[0]), r.erros[0]);
r = API.conciliarAberto({ id: 'B31', abertos: [ab('R4')] }); assert.strictEqual(r.ok, false); assert.ok(/não fecha com a mensalidade/.test(r.erros[0]), r.erros[0]);
r = ok(API.conciliarAberto({ id: 'B30', abertos: [ab('R4')], simular: true }), 'simular'); assert.strictEqual(r.plano, 'Rui 28/10 quitada + R$ 150,00 adiantamento de novembro + R$ 150,00 adiantamento de dezembro (Juliana)', r.plano);
assert.strictEqual(linR('R4')[hO('Pago?')], 'Não', 'simular não grava');
r = ok(API.conciliarAberto({ id: 'B30', abertos: [ab('R4')] }), 'adiantamento');
assert.deepStrictEqual(r.adiantamento.map(x => x.chave), ['Novembro/2026', 'Dezembro/2026']); assert.strictEqual(linR('R4')[hO('Pago?')], 'Sim');
const adi = O.filter(l => /^Mensalidade de (novembro|dezembro)/.test(l[hO('Procedimento')]));
assert.strictEqual(adi.length, 2, 'linhas de mensalidade na aba do mês do Pix'); assert.ok(adi.every(l => l[hO('Valor (R$)')] === 150 && l[hO('Pago?')] === 'Sim' && l[hO('Forma de pagamento')] === 'Pix'));
const MS = ss._m.Mensalistas.d, iRui = MS.findIndex(l => l[0] === 'Rui Aberto'); assert.ok(iRui > 0, 'Rui entrou em Mensalistas');
assert.strictEqual(MS[iRui][MS[0].indexOf('NOVEMBRO/2026 — pago?')], 'Sim'); assert.strictEqual(MS[iRui][MS[0].indexOf('DEZEMBRO/2026 — pago?')], 'Sim');
c = ok(API.conciliacao({ chave: 'Outubro/2026' }), 'depois do adiantamento');
const b30 = c.resolvidos.find(e => e.id === 'B30'); assert.strictEqual(b30.situacao, 'conciliado'); assert.ok(/adiantamento: Novembro\/2026, Dezembro\/2026/.test(b30.obs), b30.obs);
assert.ok(!c.semBanco.some(x => x.id === 'R4' || adi.some(l => l[hO('ID')] === x.id)), 'sessão e mensalidades conciliadas com o Pix');
r = API.conciliarAberto({ id: 'B31', abertos: [ab('R5')] }); assert.strictEqual(r.ok, false);
console.log('adiantamento ok');
console.log('servidor-conciliacao-ia: tudo ok');
