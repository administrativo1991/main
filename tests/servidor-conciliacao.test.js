// node tests/servidor-conciliacao.test.js — Conciliação (Fase 2) contra a planilha falsa: importa o OFX do PagBank e o CSV de vendas
// no cartão (sem duplicar na segunda vez), casa Pix × lançamento (um, ou vários do mesmo pagador), venda × lançamento em cartão e
// venda × depósito, sugere convênio / aluguel de sala, e grava a confirmação nas abas do banco e na coluna "Conciliado" do mês.
const assert = require('assert');
const { fmt, planilha } = require('./planilha-falsa');
const HP = ['Nome', 'Código', 'CPF', 'Data de nascimento', 'Ativo', 'Cobrança', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'Histórico de cobrança (antigo)', 'Pagador habitual (responsável financeiro)', 'Nome do pagador como aparece no extrato', 'Convênio', 'Regra de cobrança', 'Observação de cobrança (a recepção lê — diz O QUE cobrar, nunca o porquê)', 'Registrado por (app)', 'WhatsApp do pagador'];
const pac = (nome, pagador, extrato) => { const l = HP.map(() => ''); l[0] = nome; l[4] = 'Sim'; l[14] = pagador || ''; l[15] = extrato || ''; l[16] = 'Particular'; return l; };
const HM = ['Data', 'Hora', 'Paciente', 'Profissional', 'Procedimento', 'Convênio (auto)', 'Modalidade (auto)', '⚠ Atenção na cobrança (auto)', 'O que aconteceu', 'Valor (R$)', 'Pago?', 'Data do pagamento', 'Forma de pagamento', 'Pagador habitual (auto)', 'Quem pagou (só se foi outra pessoa)', 'NF emitida?', 'Nº da NF', 'Guia assinada? (convênio)', 'Observação', 'ID', 'Registrado por (app)'];
const lanc = (id, data, paciente, valor, forma, dataPag) => [data, '09:00', paciente, 'Juliana Ribeiro', 'Sessão de psicologia', 'Particular', '', '', 'Atendido', valor, 'Sim', dataPag || data, forma, '', '', '', '', '', '', id, 'rec@x · ' + data];
const AGORA = new Date(2026, 9, 16, 10, 0), RealDate = Date;
global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(AGORA.getTime()); } static now() { return AGORA.getTime(); } };
const ss = planilha({
  Pacientes: [HP, pac('Ana Souza', 'Carla Souza'), pac('Theo Lima', 'Rita Lima', 'Rita Lima Ferreira'), pac('Davi Maia'), pac('Bruno Card'), pac('Zé Sem Banco')],
  'Parâmetros': [['Parâmetro', 'Valor', 'Descrição']],
  Listas: [['O que aconteceu', 'Convênio', 'Gestão'], ['Atendido', 'Particular', 'gestao@clinicanascente.com.br'], ['', 'Cedplan', ''], ['', 'Sabin Sinai', '']],
  Profissionais: [['Profissional', 'Especialidade', 'Ativo'], ['Juliana Ribeiro', 'Psicologia', 'Sim'], ['Marileia Rodrigues', 'Psicologia', 'Sim']],
  Procedimentos: [['Procedimento', 'Especialidade', 'Valor', 'Obs'], ['Sessão de psicologia', 'Psicologia', 120, '']],
  Outubro: [HM, lanc('L1', '05/10/2026', 'Ana Souza', 120, 'Pix'), lanc('L2', '06/10/2026', 'Theo Lima', 150, 'Pix'), lanc('L3', '06/10/2026', 'Davi Maia', 80, 'Pix'),
    lanc('L4', '07/10/2026', 'Davi Maia', 80, 'Pix'), lanc('L5', '02/10/2026', 'Bruno Card', 200, 'Cartão de crédito'), lanc('L6', '08/10/2026', 'Zé Sem Banco', 70, 'Pix'),
    lanc('L7', '09/10/2026', 'Ana Souza', 120, 'Dinheiro')]
});
let email = 'recepcao@clinicanascente.com.br';
global.SpreadsheetApp = { getActiveSpreadsheet: () => ss, flush() { } };
global.LockService = { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) };
global.Utilities = { formatDate: fmt };
global.Session = { getActiveUser: () => ({ getEmail: () => email }) };
const API = (0, eval)(require('./carregar-servidor')());
const ok = (r, msg) => { if (!r || r.ok === false) { console.error(msg, JSON.stringify(r)); process.exit(1); } return r; };

const tx = (id, data, valor, memo, tipo) => `<STMTTRN>\n<TRNTYPE>${tipo || 'IN'}\n<DTPOSTED>${data}120000[-3:BRT]\n<TRNAMT>${valor}\n<FITID>${id}\n<MEMO>${memo}\n</STMTTRN>`;
const OFX = 'OFXHEADER:100\n<OFX><BANKTRANLIST>\n' + [
  tx('B1', '20261005', '120.00', 'Pix recebido - Carla Souza'),
  tx('B2', '20261007', '150.00', 'Pix recebido - Rita Lima Ferreira'),
  tx('B3', '20261007', '160.00', 'QR Code Pix recebido - Davi Maia'),
  tx('B4', '20261002', '6137.79', 'Pix recebido - Cedplan Saude'),
  tx('B5', '20261001', '200.00', 'Pix recebido - Marileia Rodrigues De Oliveira'),
  tx('B6', '20261003', '208.57', 'Vendas - Maquininha'),
  tx('B7', '20261010', '0.50', 'Rendimento da conta'),
  tx('B8', '20261010', '-50.00', 'Pix enviado - Fornecedor', 'OUT'),
  tx('B9', '20261012', '90.00', 'Pix recebido - Pessoa Desconhecida'),
  tx('B0', '20260925', '100.00', 'Pix recebido - Mes Passado')].join('\n') + '\n</BANKTRANLIST></OFX>';
const CSV = '﻿Código da Transação;Data da Transação;Data prevista de liberação;Bandeira;Forma de Pagamento;Parcela;Valor Bruto;Valor Taxa;Valor Líquido;Status;Nome Comprador\n' +
  'V1;02/10/2026 09:04;03/10/2026 09:04;Visa;Crédito;à Vista;215,00;6,43;208,57;Aprovada;\n' +
  'V2;13/10/2026 13:42;13/10/2026 13:42;Mastercard;Crédito;Parcelado 4x;1.200,00;23,40;1.176,60;Aprovada;\n' +
  'V3;14/10/2026 10:00;14/10/2026 10:00;Visa;Débito;;50,00;0,50;49,50;Cancelada;';

// só a gestão
assert.strictEqual(API.importarExtrato({ texto: OFX }).ok, false, 'recepção não importa');
assert.strictEqual(API.conciliacao({ chave: 'Outubro/2026' }).ok, false, 'recepção não vê');
email = 'gestao@clinicanascente.com.br';

// importação: só entradas, sem repetir
let r = ok(API.importarExtrato({ texto: OFX }), 'importa extrato');
assert.deepStrictEqual([r.lidos, r.novos, r.jaTinha], [9, 9, 0]);
r = ok(API.importarExtrato({ texto: OFX }), 'importa de novo');
assert.deepStrictEqual([r.novos, r.jaTinha], [0, 9]);
assert.strictEqual(API.importarExtrato({ texto: 'qualquer coisa' }).ok, false);
const E = ss._m['Extrato bancário'].d;
assert.deepStrictEqual(E[0].slice(0, 7), ['ID do banco', 'Data', 'Valor (R$)', 'Tipo', 'Quem pagou', 'Descrição', 'Situação']);
const linhaE = id => E.find(l => l[0] === id);
assert.strictEqual(linhaE('B3')[3], 'Pix (QR Code)'); assert.strictEqual(linhaE('B3')[4], 'Davi Maia');
assert.strictEqual(linhaE('B6')[3], 'Cartão (vendas)'); assert.strictEqual(linhaE('B7')[6], 'não é paciente', 'rendimento já sai resolvido');
r = ok(API.importarVendasCartao({ texto: CSV }), 'importa vendas');
assert.deepStrictEqual([r.lidos, r.novos], [2, 2], 'cancelada fica de fora');
assert.strictEqual(ok(API.importarVendasCartao({ texto: CSV })).novos, 0);
console.log('importação ok');

// conciliação de outubro
let c = ok(API.conciliacao({ chave: 'Outubro/2026' }), 'conciliacao');
const sugDe = id => c.sugestoes.find(s => (s.ext && s.ext.id === id) || (s.venda && s.venda.id === id));
assert.strictEqual(sugDe('B1').forca, 'forte', 'pagador habitual confere'); assert.strictEqual(sugDe('B1').recs[0].id, 'L1');
assert.strictEqual(sugDe('B2').forca, 'forte', 'nome do pagador no extrato confere'); assert.strictEqual(sugDe('B2').recs[0].id, 'L2');
assert.strictEqual(sugDe('B3').tipo, 'varios'); assert.deepStrictEqual(sugDe('B3').recs.map(x => x.id).sort(), ['L3', 'L4']);
const v1 = sugDe('V1'); assert.strictEqual(v1.tipo, 'cartao'); assert.strictEqual(v1.recs[0].id, 'L5'); assert.ok(/15,00 a mais/.test(v1.aviso), v1.aviso);
assert.strictEqual(v1.venda.depositoSug.id, 'B6', 'líquido da venda = depósito "Vendas"');
const sl = id => c.semLancamento.find(e => e.id === id);
assert.strictEqual(sl('B4').sugestao, 'convênio (fatura)'); assert.strictEqual(sl('B5').sugestao, 'aluguel de sala');
assert.ok(sl('B9') && !sl('B9').sugestao); assert.ok(!sl('B6'), 'depósito de venda achada não aparece solto'); assert.ok(!sl('B0'), 'setembro fica fora');
assert.deepStrictEqual(c.vendasSemLancamento.map(v => v.id), ['V2']);
assert.deepStrictEqual(c.semBanco.map(x => x.id), ['L6'], 'dinheiro não entra');
assert.strictEqual(c.resumo.entradas, 8); assert.strictEqual(c.resumo.resolvidas, 1); assert.strictEqual(c.resumo.taxasCartao, 29.83);
console.log('sugestões ok');

// recepção não confirma; gestão confirma
email = 'recepcao@clinicanascente.com.br'; assert.strictEqual(API.conciliar({ itens: [{ tipo: 'ext', id: 'B1', recs: sugDe('B1').recs }] }).ok, false); email = 'gestao@clinicanascente.com.br';
r = ok(API.conciliar({ itens: [
  { tipo: 'ext', id: 'B1', recs: sugDe('B1').recs }, { tipo: 'ext', id: 'B3', recs: sugDe('B3').recs },
  { tipo: 'venda', id: 'V1', recs: v1.recs, deposito: 'B6', obs: 'acréscimo da maquininha' },
  { tipo: 'ext', id: 'B4', situacao: 'convênio (fatura)', obs: 'Cedplan setembro' }, { tipo: 'ext', id: 'B5', situacao: 'aluguel de sala' },
  { tipo: 'venda', id: 'V2', situacao: 'sem lançamento no app', obs: 'avaliação Alcici, além da permuta' },
  { tipo: 'ext', id: 'B9', situacao: 'inventada' }, { tipo: 'ext', id: 'B9', situacao: 'conciliado' }, { tipo: 'ext', id: 'NAO' },
  { tipo: 'ext', id: 'B2', recs: [{ aba: 'Outubro', linha: 3, id: 'OUTRO' }] }] }), 'conciliar');
assert.strictEqual(r.feitos, 6); assert.strictEqual(r.erros.length, 4, JSON.stringify(r.erros));
assert.ok(r.erros.some(e => /mudou de lugar/.test(e)));
const O = ss._m.Outubro.d, hc = O[0].indexOf('Conciliado');
assert.strictEqual(hc, HM.length, 'coluna nova no fim');
assert.ok(/^PagBank 05\/10\/2026 · R\$ 120,00 · B1 · gestao@/.test(O[1][hc]), O[1][hc]);
assert.ok(O[3][hc] && O[4][hc], 'os dois do Davi'); assert.ok(/^Cartão 02\/10\/2026 · R\$ 215,00 · V1/.test(O[5][hc]), O[5][hc]);
assert.ok(!O[2][hc], 'Theo não foi (ID não bateu)');
assert.strictEqual(linhaE('B1')[6], 'conciliado'); assert.strictEqual(linhaE('B1')[7], 'Outubro!2 (L1)');
assert.strictEqual(linhaE('B4')[6], 'convênio (fatura)'); assert.strictEqual(linhaE('B4')[8], 'Cedplan setembro');
assert.strictEqual(linhaE('B6')[6], 'conciliado', 'depósito da venda'); assert.strictEqual(linhaE('B9')[6], 'pendente');
const V = ss._m['Vendas no cartão'].d, vl = id => V.find(l => l[0] === id);
assert.strictEqual(vl('V1')[10], 'conciliado'); assert.strictEqual(vl('V1')[12], 'B6'); assert.strictEqual(vl('V1')[13], 'acréscimo da maquininha');
assert.strictEqual(vl('V2')[10], 'sem lançamento no app');

// depois: só sobra o que falta
c = ok(API.conciliacao({ chave: 'Outubro/2026' }), 'conciliacao depois');
assert.deepStrictEqual(c.sugestoes.map(s => s.ext ? s.ext.id : s.venda.id), ['B2'], 'Theo continua sugerido');
assert.deepStrictEqual(c.semLancamento.map(e => e.id), ['B9']); assert.deepStrictEqual(c.vendasSemLancamento, []);
assert.deepStrictEqual(c.semBanco.map(x => x.id), ['L6']);
assert.strictEqual(c.resumo.resolvidas, 6); assert.strictEqual(c.resumo.pendentes, 2);
console.log('confirmar ok');
console.log('servidor-conciliacao: tudo ok');
