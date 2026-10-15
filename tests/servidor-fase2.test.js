// node tests/servidor-fase2.test.js — Fase 2 contra a planilha falsa: confirmações por WhatsApp (período, agrupamento por pagador,
// mensagem, "mensagem enviada" na aba própria, WhatsApp digitado indo pro cadastro de cada irmão).
const assert = require('assert');
const { fmt, planilha } = require('./planilha-falsa');
const HP = ['Nome', 'Código', 'CPF', 'Data de nascimento', 'Ativo', 'Cobrança', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'Histórico de cobrança (antigo)', 'Pagador habitual (responsável financeiro)', 'Nome do pagador como aparece no extrato', 'Convênio', 'Regra de cobrança', 'Observação de cobrança (a recepção lê — diz O QUE cobrar, nunca o porquê)', 'Registrado por (app)', 'WhatsApp do pagador'];
const pac = (nome, pagador, whats) => { const l = HP.map(() => ''); l[0] = nome; l[4] = 'Sim'; l[14] = pagador || ''; l[16] = 'Particular'; l[20] = whats || ''; return l; };
const HM = ['Data', 'Hora', 'Paciente', 'Profissional', 'Procedimento', 'Convênio (auto)', 'Modalidade (auto)', '⚠ Atenção na cobrança (auto)', 'O que aconteceu', 'Valor (R$)', 'Pago?', 'Data do pagamento', 'Forma de pagamento', 'Pagador habitual (auto)', 'Quem pagou (só se foi outra pessoa)', 'NF emitida?', 'Nº da NF', 'Guia assinada? (convênio)', 'Observação', 'ID', 'Registrado por (app)'];
const AGORA = new Date(2026, 9, 15, 10, 0), RealDate = Date; // 15/10/2026 (quinta)
global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(AGORA.getTime()); } static now() { return AGORA.getTime(); } };
const fixo = (id, p, prof, dia, hora) => [id, p, prof, dia, hora, 'Semanal', '01/09/2026', '', 'Sim', '', ''];
const ss = planilha({
  Pacientes: [HP, pac('Ana Irmã', 'Carla Souza', '(32) 9 8888-7777'), pac('Bia Irmã', 'Carla Souza'), pac('Carlos Sem', ''), pac('Julia Tem', 'Bruno Lima', '32988887766'), pac('Davi Ja', 'Marta')],
  'Parâmetros': [['Parâmetro', 'Valor', 'Descrição'], ['vencimento_dia', 10, '']],
  Listas: [['O que aconteceu', 'Pago?'], ['Atendido', 'Sim']],
  Profissionais: [['Profissional', 'Especialidade', 'Ativo'], ['Juliana Ribeiro', 'Psicologia', 'Sim']],
  Procedimentos: [['Procedimento', 'Especialidade', 'Valor', 'Obs'], ['Sessão de psicologia', 'Psicologia', 120, '']],
  'Agenda recorrente': [['ID', 'Paciente', 'Profissional', 'Dia da semana', 'Hora', 'Frequência', 'Começa em', 'Termina em', 'Ativo', 'Observação', 'Registrado por (app)'],
    fixo('F1', 'Ana Irmã', 'Juliana Ribeiro', 'Sexta', '09:00'), fixo('F2', 'Bia Irmã', 'Juliana Ribeiro', 'Sexta', '10:00'), fixo('F3', 'Carlos Sem', 'Juliana Ribeiro', 'Sexta', '11:00'),
    fixo('F4', 'Julia Tem', 'Juliana Ribeiro', 'Segunda', '14:00'), fixo('F5', 'Davi Ja', 'Juliana Ribeiro', 'Sexta', '15:00')],
  'Lista do dia': [['ID', 'Data', 'Hora', 'Paciente', 'Profissional', 'Origem', 'Observação', 'Registrado por (app)'],
    ['D1', '19/10/2026', '14:00', 'Julia Tem', 'Juliana Ribeiro', 'Confirmado', '', 'rec@x · 15/10/2026 09:00'],
    ['D2', '16/10/2026', '15:00', 'Davi Ja', 'Juliana Ribeiro', 'Não vem · viagem', '', 'rec@x · 15/10/2026 09:00']],
  'Alterações de cadastro': [['Data/hora', 'Paciente', 'Campo', 'De', 'Para', 'Quem informou', 'Registrado por (app)']],
  Outubro: [HM]
});
global.SpreadsheetApp = { getActiveSpreadsheet: () => ss, flush() { } };
global.LockService = { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) };
global.Utilities = { formatDate: fmt };
global.Session = { getActiveUser: () => ({ getEmail: () => 'recepcao@clinicanascente.com.br' }) };
const API = (0, eval)(require('./carregar-servidor')());
const ok = (r, msg) => { if (!r || r.ok === false) { console.error(msg, JSON.stringify(r)); process.exit(1); } return r; };

// padrão = amanhã (sexta 16/10): Ana e Bia numa mensagem só (mesmo pagador, número da Ana); Carlos sem número; Davi já avisou que não vem
let r = ok(API.confirmacoes({}), 'amanhã');
assert.strictEqual(r.de, '16/10/2026'); assert.strictEqual(r.ate, '16/10/2026'); assert.strictEqual(r.total, 3); assert.ok(r.modeloProvisorio);
const irmas = r.grupos.find(g => g.pagador === 'Carla Souza');
assert.deepStrictEqual(irmas.pacientes, ['Ana Irmã', 'Bia Irmã']); assert.strictEqual(irmas.fone, '5532988887777'); assert.strictEqual(irmas.foneFmt, '(32) 9 8888-7777');
assert.ok(/^Olá, Carla! Aqui é da Clínica Nascente/.test(irmas.mensagem), irmas.mensagem);
assert.ok(irmas.mensagem.includes('• Ana com Juliana Ribeiro — sexta, 16/10, às 09:00\n• Bia com Juliana Ribeiro — sexta, 16/10, às 10:00'), irmas.mensagem);
const carlos = r.grupos.find(g => g.pacientes[0] === 'Carlos Sem');
assert.strictEqual(carlos.fone, ''); assert.ok(/^Olá! Aqui é/.test(carlos.mensagem), 'sem pagador: "Olá!" sem vírgula');
assert.ok(!r.grupos.some(g => g.pacientes.includes('Davi Ja')), 'quem já avisou que não vem fica de fora');
console.log('confirmações de amanhã ok');

// semana que vem (até segunda 19/10): Julia já confirmada vai pro fim da lista; período longo demais é recusado
r = ok(API.confirmacoes({ de: '16/10/2026', ate: '19/10/2026' }), 'semana');
assert.strictEqual(r.total, 4); const julia = r.grupos[r.grupos.length - 1];
assert.strictEqual(julia.pacientes[0], 'Julia Tem'); assert.strictEqual(julia.aConfirmar, 0); assert.strictEqual(julia.itens[0].confirmado.por, 'rec@x');
assert.strictEqual(API.confirmacoes({ de: '01/10/2026', ate: '31/10/2026' }).ok, false);
console.log('período e confirmados ok');

// mensagem do Parâmetros (gestão troca o texto; "\n" escrito na célula quebra linha)
ss._m['Parâmetros'].d.push(['msg_confirmacao', 'Oi {pagador}!\\n{sessoes}\\nAté lá.', 'texto da confirmação']);
API.limparCache && (global.Session = { getActiveUser: () => ({ getEmail: () => 'administrativo@clinicanascente.com.br' }) }, API.limparCache());
r = ok(API.confirmacoes({}), 'modelo');
assert.strictEqual(r.modeloProvisorio, false);
assert.strictEqual(r.grupos.find(g => g.pagador === 'Carla Souza').mensagem, 'Oi Carla!\n• Ana com Juliana Ribeiro — sexta, 16/10, às 09:00\n• Bia com Juliana Ribeiro — sexta, 16/10, às 10:00\nAté lá.');
global.Session = { getActiveUser: () => ({ getEmail: () => 'recepcao@clinicanascente.com.br' }) };
console.log('modelo da planilha ok');

// abriu o WhatsApp: uma linha por sessão na aba nova; a Lista do dia não muda
const antes = ss._m['Lista do dia'].d.length;
ok(API.marcarMensagemEnviada({ pagador: 'Carla Souza', fone: '5532988887777', itens: irmas.itens }), 'enviada');
const M = ss._m['Mensagens WhatsApp']; assert.ok(M, 'aba criada'); assert.strictEqual(M.d.length, 3);
assert.strictEqual(M.d[1][M.d[0].indexOf('Tipo')], 'Confirmação'); assert.strictEqual(M.d[1][M.d[0].indexOf('WhatsApp')], '(32) 9 8888-7777');
assert.strictEqual(ss._m['Lista do dia'].d.length, antes, 'Lista do dia não ganha linha');
r = ok(API.confirmacoes({}), 'depois de enviar');
assert.ok(r.grupos.find(g => g.pagador === 'Carla Souza').itens.every(x => x.enviado && x.enviado.por === 'recepcao@clinicanascente.com.br'));
assert.strictEqual(API.listaDoDia({ data: '16/10/2026' }).itens.filter(it => !it.extra).length, 4, 'Agenda do dia não duplica sessões');
console.log('mensagem enviada ok');

// confirmou: some do "a confirmar"
ok(API.confirmar({ data: '16/10/2026', hora: '09:00', paciente: 'Ana Irmã', profissional: 'Juliana Ribeiro' }), 'confirmar');
r = ok(API.confirmacoes({}), 'depois de confirmar');
assert.strictEqual(r.grupos.find(g => g.pagador === 'Carla Souza').aConfirmar, 1);
assert.ok(!r.grupos.find(g => g.pagador === 'Carla Souza').mensagem.includes('Ana com'), 'a mensagem leva só quem falta confirmar');
console.log('confirmou ok');

// WhatsApp digitado na tela: vai pro cadastro (com log); inválido é recusado
assert.strictEqual(API.salvarWhats({ pacientes: ['Carlos Sem'], whats: '9999' }).ok, false);
r = ok(API.salvarWhats({ pacientes: ['Carlos Sem'], whats: '32 99123 4567' }), 'salvar whats');
assert.strictEqual(r.foneFmt, '(32) 9 9123-4567');
const P = ss._m.Pacientes, lc = P.d.findIndex(l => l[0] === 'Carlos Sem');
assert.strictEqual(P.d[lc][P.d[0].indexOf('WhatsApp do pagador')], '(32) 9 9123-4567');
const L = ss._m['Alterações de cadastro'].d; assert.strictEqual(L[L.length - 1][1], 'Carlos Sem'); assert.strictEqual(L[L.length - 1][2], 'WhatsApp do pagador');
assert.strictEqual(ok(API.confirmacoes({}), 'depois do whats').grupos.find(g => g.pacientes[0] === 'Carlos Sem').fone, '5532991234567');
console.log('salvar WhatsApp ok');
console.log('servidor-fase2: tudo ok');
