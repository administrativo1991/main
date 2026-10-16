// node tests/servidor-guias.test.js — guias de convênio lidas da pasta do Drive (falsa) com o modelo (falso): pasta do mês por
// número (tolera "O7"), subpasta por paciente, zip ignorado, duplicata sem chamada, casamento (1 linha · várias sessões ·
// nome diferente do cadastro · ilegível · não é guia · sem atendimento), card guiasLidas, confirmarGuia (Sim + Nº da guia +
// Link + logs + carteirinha no cadastro), ignorarGuia, "PDF na pasta?" e "Guias a conferir" no gestaoResumo, pausa no meio.
const assert = require('assert');
const { fmt, planilha } = require('./planilha-falsa');
const fakes = require('./fakes-google');
const AGORA = new Date(2026, 9, 16, 10, 0), RealDate = Date; // 16/10/2026
global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(AGORA.getTime()); } static now() { return AGORA.getTime(); } };
const HP = ['Nome', 'Código', 'CPF', 'Data de nascimento', 'Ativo', 'Cobrança', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'Histórico de cobrança (antigo)', 'Pagador habitual (responsável financeiro)', 'Nome do pagador como aparece no extrato', 'Convênio', 'Regra de cobrança', 'Observação de cobrança (a recepção lê — diz O QUE cobrar, nunca o porquê)', 'Registrado por (app)', 'WhatsApp do pagador', 'Nº da carteirinha'];
const pac = (nome, conv, cart) => { const l = HP.map(() => ''); l[0] = nome; l[4] = 'Sim'; l[16] = conv || 'Particular'; l[21] = cart || ''; return l; };
const HM = ['Data', 'Hora', 'Paciente', 'Profissional', 'Procedimento', 'Convênio (auto)', 'Modalidade (auto)', '⚠ Atenção na cobrança (auto)', 'O que aconteceu', 'Valor (R$)', 'Pago?', 'Data do pagamento', 'Forma de pagamento', 'Pagador habitual (auto)', 'Quem pagou (só se foi outra pessoa)', 'NF emitida?', 'Nº da NF', 'Guia assinada? (convênio)', 'Observação', 'ID', 'Registrado por (app)'];
const lm = (dia, nome, conv, guia, id, prof, mes) => HM.map(h => ({ Data: new Date(2026, mes == null ? 8 : mes, dia, 12), Hora: '09:00', Paciente: nome, Profissional: prof || 'Juliana Ribeiro', Procedimento: 'Sessão de psicologia – convênio', 'Convênio (auto)': conv, 'Modalidade (auto)': 'Convênio', 'O que aconteceu': 'Atendido', 'Valor (R$)': 0, 'Pago?': 'Convênio (fatura)', 'Guia assinada? (convênio)': guia || '', ID: id, 'Registrado por (app)': 'x' })[h] ?? '');
const ss = planilha({
  Pacientes: [HP, pac('Ana Conv', 'Cedplan', '12345'), pac('Bia Sessoes', 'Cedplan'), pac('Carla de Souza Lima', 'Cedplan'), pac('Dani Ilegivel', 'Cedplan'), pac('Eva Sem Linha', 'Cedplan'), pac('Fabio Sabin', 'Sabin Sinai'), pac('Gui Particular'), pac('Hugo Emissao', 'Cedplan')],
  Listas: [['O que aconteceu', 'Pago?', 'Forma de pagamento', 'Sim/Não', 'Guia assinada?', 'Convênio', 'Regra de cobrança', 'Cobrança', 'Especialidade (modalidade)', 'Pagamento', 'Cobrança (por profissional)', 'Pagamento (por profissional)', 'Feriados', 'Gestão'],
    ['Atendido', 'Sim', 'Pix', 'Sim', 'Sim', 'Particular', '', '', '', '', '', '', '', 'gestao@clinicanascente.com.br'], ['', 'Convênio (fatura)', '', 'Não', 'Não', 'Cedplan'], ['', '', '', '', 'Não se aplica', 'Sabin Sinai']],
  'Parâmetros': [['Parâmetro', 'Valor', 'Descrição']], Profissionais: [['Profissional', 'Especialidade', 'Ativo'], ['Juliana Ribeiro', 'Psicologia', 'Sim']],
  Setembro: [HM, lm(28, 'Ana Conv', 'Cedplan', '', 'S-ana-28'), lm(21, 'Ana Conv', 'Cedplan', 'Sim', 'S-ana-21'), lm(10, 'Bia Sessoes', 'Cedplan', 'Não', 'S-bia-10'), lm(17, 'Bia Sessoes', 'Cedplan', '', 'S-bia-17'), lm(24, 'Bia Sessoes', 'Cedplan', '', 'S-bia-24'),
    lm(9, 'Carla de Souza Lima', 'Cedplan', '', 'S-carla-9'), lm(4, 'Hugo Emissao', 'Cedplan', '', 'S-hugo-4'), lm(9, 'Hugo Emissao', 'Cedplan', '', 'S-hugo-9'), lm(2, 'Dani Ilegivel', 'Cedplan', '', 'S-dani-2'), lm(15, 'Fabio Sabin', 'Sabin Sinai', '', 'S-fabio-15'), lm(3, 'Gui Particular', 'Particular', '', 'S-gui-3')],
  Outubro: [HM, lm(1, 'Ana Conv', 'Cedplan', '', 'O-ana-1', '', 9)],
  'Alterações de lançamento': [['Data/hora', 'Aba', 'ID', 'Paciente', 'Campo', 'De', 'Para', 'Quem informou', 'Registrado por (app)']],
  'Alterações de cadastro': [['Data/hora', 'Paciente', 'Campo', 'De', 'Para', 'Quem informou', 'Registrado por (app)']]
});
global.SpreadsheetApp = { getActiveSpreadsheet: () => ss, flush() { } };
global.LockService = { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) };
let email = 'gestao@clinicanascente.com.br';
global.Session = { getActiveUser: () => ({ getEmail: () => email }) };
// respostas do modelo por arquivo (o texto da requisição começa com "Arquivo: <nome>")
const guia = (o) => Object.assign({ pagina: 1, continuacao_da_anterior: false, convenio: 'CEDPLAN', numero_guia: '', carteirinha: '', beneficiario: '', datas: [], procedimento: 'Sessão de psicoterapia', quantidade: 1, assinatura_visivel: true, legibilidade: 'boa' }, o);
const RESP = {
  '28-09 Ana Conv.pdf': { e_guia: true, observacao: 'guia Cedplan 1 sessão', guias: [guia({ numero_guia: '1504122', carteirinha: '12345', beneficiario: 'Ana Conv', datas: ['28/09/2026'] })] },
  '07-07 Fabio.pdf': { e_guia: true, observacao: 'guia de julho', guias: [guia({ convenio: 'Sabin', numero_guia: '1', beneficiario: 'Fabio Sabin', datas: ['07/07/2026'] })] },
  'Bia guia 4 sessoes.pdf': { e_guia: true, observacao: 'guia com 3 datas', guias: [guia({ numero_guia: '7788', carteirinha: '99887', beneficiario: 'Bia Sessoes', datas: ['2026-09-10', '17/09/2026', '24/09/2026'], quantidade: 3 })] },
  '09-09 Carla Souza.pdf': { e_guia: true, observacao: 'guia', guias: [guia({ numero_guia: '555', beneficiario: 'Karla Sousa', datas: ['09/09/2026'] })] },
  '02-09 Dani.pdf': { e_guia: true, observacao: 'foto escura', guias: [guia({ numero_guia: '', beneficiario: 'Dani Ilegivel', datas: ['02/09/2026'], legibilidade: 'ilegivel', assinatura_visivel: false })] },
  'comprovante pix.pdf': { e_guia: false, observacao: 'comprovante de Pix, não é guia', guias: [] },
  '05-09 Eva Sem Linha.pdf': { e_guia: true, observacao: 'guia', guias: [guia({ numero_guia: '42', beneficiario: 'Eva Sem Linha', datas: ['05/09/2026'] })] },
  '04-09 Hugo Emissao.pdf': { e_guia: true, observacao: 'guia', guias: [guia({ numero_guia: '9001', beneficiario: 'Hugo Emissao', datas: ['09/09/2026'] })] },
  '15-09 Fabio.jpg': { e_guia: true, observacao: 'foto de guia Sabin', guias: [guia({ convenio: 'Sabin Sinai', numero_guia: '900', beneficiario: 'Fabio Sabin', datas: ['15/09/2026'] })] }
};
const F = fakes.instalar({ responder: body => { const t = body.messages[0].content.filter(b => b.type === 'text')[0].text, nome = t.match(/^Arquivo: (.*)$/m)[1]; const j = RESP[nome]; if (!j) throw new Error('sem resposta programada pra ' + nome); return { content: [{ type: 'text', text: JSON.stringify(j) }], usage: { input_tokens: 2500, output_tokens: 150 }, stop_reason: 'end_turn', model: body.model }; } });
F.props.ANTHROPIC_API_KEY = 'sk-teste';
// Drive falso: GUIAS DE CONVÊNIOS / CEDPLAN / 09 SET 26 / <paciente> / arquivos; SABIN SINAI com "O7 JUL 26" (letra O) e "09 SET 26"
const A = fakes.arquivo, P = fakes.pasta;
const anaPdf = A('28-09 Ana Conv.pdf', 'application/pdf', '%PDF ana 28');
const raiz = P('GUIAS DE CONVÊNIOS', { pastas: [
  P('CEDPLAN', { pastas: [
    P('09 SET 26', { pastas: [
      P('Ana Conv ', { arquivos: [anaPdf, A('Ana Conv -2026.zip', 'application/zip', 'zip'), A('28-09 Ana Conv (1).pdf', 'application/pdf', '%PDF ana 28')] }),
      P('Bia Sessoes', { arquivos: [A('Bia guia 4 sessoes.pdf', 'application/pdf', '%PDF bia')] }),
      P('Carla de Souza Lima', { arquivos: [A('09-09 Carla Souza.pdf', 'application/pdf', '%PDF carla')] }),
      P('Dani Ilegivel', { arquivos: [A('02-09 Dani.pdf', 'application/pdf', '%PDF dani')] }),
      P('Eva Sem Linha', { arquivos: [A('05-09 Eva Sem Linha.pdf', 'application/pdf', '%PDF eva')] }),
      P('Hugo Emissao', { arquivos: [A('04-09 Hugo Emissao.pdf', 'application/pdf', '%PDF hugo')] })
    ], arquivos: [A('comprovante pix.pdf', 'application/pdf', '%PDF pix')] }),
    P('10 OUT 26', { pastas: [] }), P('01 JAN 26', { arquivos: [A('01-01 Ana Conv.pdf', 'application/pdf', '%PDF jan')] })
  ] }),
  P('SABIN SINAI', { pastas: [P('O7 JUL 26', { arquivos: [A('07-07 Fabio.pdf', 'application/pdf', '%PDF jul')] }), P('09 SET 26', { arquivos: [A('15-09 Fabio.jpg', 'image/jpeg', 'JPEGDATA')] }), P('10 OUT 26')] })
] });
fakes.instalarDrive(raiz);
const API = (0, eval)(require('./carregar-servidor')());
const ok = (r, msg) => { if (!r || r.ok === false) { console.error(msg, JSON.stringify(r)); process.exit(1); } return r; };
const setIA = (k, v) => { const s = ss.getSheetByName('IA'); const vals = s.getRange(2, 1, s.getLastRow() - 1, 1).getValues(); vals.forEach((r, i) => { if (r[0] === k) s.getRange(i + 2, 2).setValue(v); }); };
const linhasDe = nome => { const s = ss.getSheetByName(nome); const h = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0]; return s.getRange(2, 1, s.getLastRow() - 1, h.length).getValues().map(r => { const o = {}; h.forEach((k, i) => { o[k] = r[i]; }); return o; }).filter(o => Object.values(o).some(v => v !== '')); };
API.iaEstado(); setIA('pasta_guias_id', raiz.getId());

// 1. pasta de julho com letra O é achada por número; a de outubro está vazia; "mês corrente" (outubro) não lê setembro no dia 16
let r = ok(API.lerGuias({}), 'ler outubro'); assert.strictEqual(r.novos, 0, 'outubro vazio'); assert.strictEqual(F.chamadas.length, 0);
r = ok(API.lerGuias({ mes: 'Julho' }), 'ler julho'); assert.strictEqual(r.novos, 1, 'O7 JUL 26 achada pelo número 7'); assert.strictEqual(r.lidas, 1); assert.strictEqual(r.conferir, 1, 'sem sessão em julho'); assert.strictEqual(r.restantes, 0);
F.chamadas.length = 0;

// 2. setembro: 7 PDFs/JPG lidos, 1 zip ignorado, 1 duplicata sem chamada; um arquivo com erro de setembro? não: 7 ok
email = 'recepcao@clinicanascente.com.br'; r = API.lerGuias({ mes: 'Setembro' }); assert.strictEqual(r.ok, false, 'só a gestão dispara'); email = 'gestao@clinicanascente.com.br';
r = ok(API.lerGuias({ mes: 'Setembro' }), 'ler setembro');
assert.strictEqual(r.novos, 10, '8 lidos + zip + duplicata'); assert.strictEqual(r.lidas, 7); assert.strictEqual(r.conferir, 5, 'Carla, Dani, Eva, Hugo, comprovante'); assert.strictEqual(r.confirmar, 3, 'Ana, Bia, Fabio'); assert.strictEqual(r.ignoradas, 1); assert.strictEqual(r.duplicadas, 1); assert.strictEqual(r.comErro, 0); assert.strictEqual(r.restantes, 0);
assert.strictEqual(F.chamadas.length, 8, 'zip e duplicata não vão pro modelo'); assert.ok(r.custoPorGuia > 0 && r.custoPorGuia < 0.001, 'custo por guia ' + r.custoPorGuia);
const req = F.chamadas.filter(c => /Arquivo: 28-09 Ana Conv\.pdf/.test(c.body.messages[0].content[1].text))[0];
assert.ok(req, 'requisição da Ana'); assert.ok(/Pacientes de convênio cadastrados/.test(req.body.messages[0].content[1].text)); assert.ok(/Ana Conv · 12345 · Cedplan/.test(req.body.messages[0].content[1].text)); assert.ok(!/Gui Particular/.test(req.body.messages[0].content[1].text), 'só pacientes de convênio'); assert.ok(!/CPF|telefone|\(32\)/i.test(req.body.messages[0].content[1].text));
assert.strictEqual(req.body.messages[0].content[0].type, 'document'); assert.strictEqual(req.body.output_config.format.schema.properties.guias.items.required.length, 11);
const fab = F.chamadas.filter(c => /15-09 Fabio\.jpg/.test(c.body.messages[0].content[1].text))[0]; assert.strictEqual(fab.body.messages[0].content[0].type, 'image');
let G = linhasDe('Guias lidas'); const porNome = {}; G.forEach(g => { porNome[g['Nome']] = g; });
assert.strictEqual(porNome['28-09 Ana Conv.pdf']['Status'], 'lida'); assert.strictEqual(porNome['28-09 Ana Conv.pdf']['Confiança'], 'alta'); assert.strictEqual(porNome['28-09 Ana Conv.pdf']['Convênio'], 'Cedplan'); assert.strictEqual(porNome['28-09 Ana Conv.pdf']['Pasta'], 'CEDPLAN/09 SET 26/Ana Conv ');
let sug = JSON.parse(porNome['28-09 Ana Conv.pdf']['Sugestão']); assert.strictEqual(sug.paciente, 'Ana Conv'); assert.strictEqual(sug.como, 'carteirinha'); assert.deepStrictEqual(sug.linhas.map(l => l.id), ['S-ana-28']);
sug = JSON.parse(porNome['Bia guia 4 sessoes.pdf']['Sugestão']); assert.deepStrictEqual(sug.linhas.map(l => l.id).sort(), ['S-bia-10', 'S-bia-17', 'S-bia-24'], 'guia de várias sessões sugere todas (data ISO também)'); assert.strictEqual(porNome['Bia guia 4 sessoes.pdf']['Status'], 'lida');
assert.strictEqual(porNome['09-09 Carla Souza.pdf']['Status'], 'baixa_confianca'); assert.ok(/pasta\/arquivo/.test(porNome['09-09 Carla Souza.pdf']['Motivos'])); sug = JSON.parse(porNome['09-09 Carla Souza.pdf']['Sugestão']); assert.strictEqual(sug.paciente, 'Carla de Souza Lima'); assert.deepStrictEqual(sug.linhas.map(l => l.id), ['S-carla-9']);
assert.strictEqual(porNome['02-09 Dani.pdf']['Status'], 'baixa_confianca'); assert.ok(/ilegivel/.test(porNome['02-09 Dani.pdf']['Motivos']) && /sem assinatura/.test(porNome['02-09 Dani.pdf']['Motivos']));
assert.strictEqual(porNome['comprovante pix.pdf']['Status'], 'nao_e_guia');
assert.strictEqual(porNome['05-09 Eva Sem Linha.pdf']['Status'], 'sem_atendimento'); assert.ok(/nenhuma sessão de convênio de Eva/.test(porNome['05-09 Eva Sem Linha.pdf']['Motivos']));
assert.strictEqual(porNome['Ana Conv -2026.zip']['Status'], 'nao_lida_tipo'); assert.strictEqual(porNome['28-09 Ana Conv (1).pdf']['Status'], 'duplicada'); assert.ok(/mesmo conteúdo que 28-09 Ana Conv\.pdf/.test(porNome['28-09 Ana Conv (1).pdf']['Observação']));
assert.strictEqual(porNome['15-09 Fabio.jpg']['Status'], 'lida');
// data lida na guia (09/09, emissão) ≠ data do nome do arquivo (04/09): as duas linhas entram, marcadas, e a guia vai pra conferência
assert.strictEqual(porNome['04-09 Hugo Emissao.pdf']['Status'], 'baixa_confianca'); sug = JSON.parse(porNome['04-09 Hugo Emissao.pdf']['Sugestão']); assert.deepStrictEqual(sug.linhas.map(l => l.id + ':' + l.origem).sort(), ['S-hugo-4:arquivo', 'S-hugo-9:guia']); assert.ok(/difere da do nome do arquivo \(04\/09\/2026\)/.test(porNome['04-09 Hugo Emissao.pdf']['Motivos'])); sug = JSON.parse(porNome['15-09 Fabio.jpg']['Sugestão']); assert.deepStrictEqual(sug.linhas.map(l => l.id), ['S-fabio-15']);
// ler de novo: nada novo (tudo já está na aba), nenhuma chamada
F.chamadas.length = 0; r = ok(API.lerGuias({ mes: 'Setembro' }), 'de novo'); assert.strictEqual(r.novos, 0); assert.strictEqual(F.chamadas.length, 0);

// 3. card: guiasLidas lista as pendentes com leitura, sugestão e candidatas; "ontem" conta pela data de leitura
r = ok(API.guiasLidas({}), 'guiasLidas'); assert.strictEqual(r.itens.length, 9, 'lidas + a conferir, inclusive a de julho (zip e duplicata não)'); assert.strictEqual(r.ontem, 0);
const ana = r.itens.filter(i => i.nome === '28-09 Ana Conv.pdf')[0]; assert.strictEqual(ana.lido.numero, '1504122'); assert.strictEqual(ana.lido.carteirinha, '12345'); assert.deepStrictEqual(ana.lido.datas, ['28/09/2026']); assert.strictEqual(ana.sugestao.linhas[0].id, 'S-ana-28'); assert.ok(/thumbnail\?id=/.test(ana.miniatura)); assert.ok(ana.candidatas.some(c => c.id === 'S-ana-21') && ana.candidatas.some(c => c.id === 'O-ana-1'), 'candidatas: outras sessões de convênio da Ana');
assert.ok(r.itens.some(i => i.status === 'nao_e_guia'));

// 4. confirmar a Ana (recepção): Guia assinada? = Sim, Nº da guia, Link da guia (colunas novas), carimbo no LOG, Alterações de lançamento; a linha 21 (já Sim) não muda
email = 'recepcao@clinicanascente.com.br';
r = ok(API.confirmarGuia({ idArquivo: ana.id, linhas: [{ aba: 'Setembro', id: 'S-ana-28' }] }), 'confirmar Ana');
assert.deepStrictEqual(r.gravadas, ['Setembro:S-ana-28']); assert.strictEqual(r.numero, '1504122');
let S = linhasDe('Setembro'); let l28 = S.filter(x => x.ID === 'S-ana-28')[0];
assert.strictEqual(l28['Guia assinada? (convênio)'], 'Sim'); assert.strictEqual(l28['Nº da guia'], '1504122'); assert.strictEqual(l28['Link da guia'], anaPdf.getUrl()); assert.ok(/guia lida \(IA\) confirmada por recepcao@/.test(l28['Registrado por (app)']));
let AL = linhasDe('Alterações de lançamento'); assert.strictEqual(AL.length, 3, 'Guia assinada?, Nº da guia, Link'); assert.strictEqual(AL[0]['Campo'], 'Guia assinada?'); assert.strictEqual(AL[0]['Para'], 'Sim'); assert.ok(/confirmada por recepção/.test(AL[0]['Quem informou']));
G = linhasDe('Guias lidas'); assert.strictEqual(G.filter(g => g['Nome'] === '28-09 Ana Conv.pdf')[0]['Status'], 'confirmada');
r = API.confirmarGuia({ idArquivo: ana.id, linhas: [{ aba: 'Setembro', id: 'S-ana-28' }] }); assert.strictEqual(r.ok, false, 'já confirmada');
// Bia: 3 linhas + carteirinha lida vai pro cadastro (estava vazio), com log em Alterações de cadastro
const bia = API.guiasLidas({}).itens.filter(i => i.nome === 'Bia guia 4 sessoes.pdf')[0];
r = ok(API.confirmarGuia({ idArquivo: bia.id, linhas: bia.sugestao.linhas, gravarCarteirinha: true }), 'confirmar Bia');
assert.strictEqual(r.gravadas.length, 3); assert.strictEqual(r.carteirinha, '99887');
S = linhasDe('Setembro'); assert.deepStrictEqual(S.filter(x => /^S-bia/.test(x.ID)).map(x => x['Guia assinada? (convênio)']), ['Sim', 'Sim', 'Sim']); assert.deepStrictEqual(S.filter(x => /^S-bia/.test(x.ID)).map(x => x['Nº da guia']), ['7788', '7788', '7788']);
const PC = linhasDe('Pacientes'); assert.strictEqual(PC.filter(p => p.Nome === 'Bia Sessoes')[0]['Nº da carteirinha'], '99887');
const AC = linhasDe('Alterações de cadastro'); assert.strictEqual(AC.length, 1); assert.strictEqual(AC[0]['Campo'], 'Nº da carteirinha'); assert.strictEqual(AC[0]['Para'], '99887');
// Carla: "escolher outra linha" = confirmar com a linha escolhida; linha sem ID recusada
const carla = API.guiasLidas({}).itens.filter(i => i.nome === '09-09 Carla Souza.pdf')[0];
r = ok(API.confirmarGuia({ idArquivo: carla.id, linhas: [{ aba: 'Setembro', id: 'S-carla-9' }] }), 'confirmar Carla'); assert.strictEqual(r.gravadas.length, 1);
r = API.confirmarGuia({ idArquivo: carla.id, linhas: [{ aba: 'Setembro', id: 'nao-existe' }], denovo: true }); assert.strictEqual(r.ok, false);
// ignorar o comprovante
const comp = API.guiasLidas({}).itens.filter(i => i.status === 'nao_e_guia')[0];
r = ok(API.ignorarGuia({ idArquivo: comp.id, motivo: 'comprovante' }), 'ignorar'); G = linhasDe('Guias lidas'); assert.strictEqual(G.filter(g => g['Nome'] === 'comprovante pix.pdf')[0]['Status'], 'ignorada');
r = ok(API.guiasLidas({}), 'depois'); assert.strictEqual(r.itens.length, 5, 'Dani, Eva, Fabio, Hugo e a de julho ainda pendentes');

// 5. gestaoResumo (gestão): "PDF na pasta?" na lista Convênio sem guia + Guias a conferir
email = 'gestao@clinicanascente.com.br';
r = ok(API.gestaoResumo({ mes: 'Setembro' }), 'resumo');
const sg = {}; r.semGuia.forEach(l => { sg[l.id] = l; });
assert.ok(!sg['S-ana-28'] && !sg['S-bia-10'], 'confirmadas saíram de Convênio sem guia');
assert.strictEqual(sg['S-dani-2'].pdfNaPasta, 'sim', 'guia da Dani está na pasta (baixa confiança)'); assert.strictEqual(sg['S-fabio-15'].pdfNaPasta, 'sim'); assert.strictEqual(sg['S-gui-3'].pdfNaPasta, 'não', 'Pago? = Convênio sem PDF na pasta');
assert.ok(r.guiasAConferir.length === 4 && r.guiasAConferir.every(g => /baixa_confianca|sem_atendimento/.test(g.status)), 'Dani, Eva, Hugo e julho a conferir (qualquer mês)');
email = 'recepcao@clinicanascente.com.br'; r = ok(API.gestaoResumo({ mes: 'Setembro' }), 'resumo recepção'); assert.strictEqual(r.guiasAConferir.length, 0); assert.strictEqual(r.semGuia.filter(l => l.id === 'S-dani-2')[0].pdfNaPasta, 'sim'); email = 'gestao@clinicanascente.com.br';

// 6. pausa no meio: nada é gravado, o arquivo fica pro próximo dia; sem chave idem; gatilho roda o mês corrente
setIA('ia_guias', 'Não'); const sab = raiz.getFolders().next(); // CEDPLAN
raiz.getFolders(); // (só pra iterar)
const outubro = (() => { const it = sab.getFolders(); while (it.hasNext()) { const p = it.next(); if (p.getName() === '10 OUT 26') return p; } })();
outubro.getFiles = () => { let i = 0; const l = [A('03-10 Ana Conv.pdf', 'application/pdf', '%PDF out')]; return { hasNext: () => i < l.length, next: () => l[i++] }; };
F.chamadas.length = 0; r = API.lerGuias({}); assert.strictEqual(r.ok, false); assert.strictEqual(r.parou, 'pausada_item'); assert.strictEqual(F.chamadas.length, 0); assert.ok(!linhasDe('Guias lidas').some(g => g['Nome'] === '03-10 Ana Conv.pdf'), 'nada gravado na pausa');
setIA('ia_guias', 'Sim'); delete F.props.ANTHROPIC_API_KEY; r = API.lerGuias({}); assert.strictEqual(r.parou, 'sem_chave'); F.props.ANTHROPIC_API_KEY = 'sk-teste';
RESP['03-10 Ana Conv.pdf'] = { e_guia: true, observacao: 'guia', guias: [guia({ numero_guia: '77', carteirinha: '12345', beneficiario: 'Ana Conv', datas: ['01/10/2026'] })] };
email = ''; r = ok(API.gatilhoDiarioIA({}), 'gatilho'); assert.strictEqual(r.rotinas[0].lidas, 1, 'gatilho lê o mês corrente sem usuário logado'); email = 'gestao@clinicanascente.com.br';
G = linhasDe('Guias lidas'); const out = G.filter(g => g['Nome'] === '03-10 Ana Conv.pdf')[0]; assert.strictEqual(out['Status'], 'lida'); assert.deepStrictEqual(JSON.parse(out['Sugestão']).linhas.map(l => l.id), ['O-ana-1']);
const est = API.iaEstado(); assert.strictEqual(est.ultimaGuias.lidas, 1); assert.strictEqual(est.ultimaGuias.comErro, 0); assert.strictEqual(est.ultimaGuias.origem, 'gatilho');
// log do IA: uma linha por arquivo lido, com o nome na observação e custo > 0
const LOG = linhasDe('IA log').filter(l => l['Item'] === 'guias'); assert.strictEqual(LOG.length, 10, '8 de setembro + 1 de julho + 1 de outubro'); assert.ok(LOG.every(l => l['Arquivos'] === 1 && l['Custo (US$)'] > 0));
// 8. sugestão refeita sem custo: a sessão da Eva é lançada depois da leitura → na execução seguinte a guia passa de sem_atendimento a lida
ss.getSheetByName('Setembro').appendRow(lm(5, 'Eva Sem Linha', 'Cedplan', '', 'S-eva-5'));
F.chamadas.length = 0; r = ok(API.lerGuias({ mes: 'Setembro' }), 'recasar'); assert.strictEqual(r.novos, 0); assert.strictEqual(F.chamadas.length, 0, 'refazer a sugestão não chama o modelo'); assert.strictEqual(r.recasadas, 1, 'só a Eva muda');
G = linhasDe('Guias lidas'); const eva = G.filter(g => g['Nome'] === '05-09 Eva Sem Linha.pdf')[0]; assert.strictEqual(eva['Status'], 'lida'); assert.deepStrictEqual(JSON.parse(eva['Sugestão']).linhas.map(l => l.id), ['S-eva-5']); assert.ok(/sugestão refeita .* \(era sem_atendimento\)/.test(eva['Observação']));
assert.strictEqual(G.filter(g => g['Nome'] === '28-09 Ana Conv.pdf')[0]['Status'], 'confirmada', 'confirmadas não são mexidas');
r = ok(API.lerGuias({ mes: 'Setembro' }), 'recasar de novo'); assert.strictEqual(r.recasadas, 0, 'sem mudança, nada regravado');
console.log('servidor-guias: ok');
