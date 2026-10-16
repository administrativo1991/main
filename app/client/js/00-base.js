/* ---------- utilitários de tela ---------- */
var $ = function (s, raiz) { return (raiz || document).querySelector(s); };
var $$ = function (s, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(s)); };
var toastT;
function toast(m) { var t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("show"); }, 3200); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }

/* ícones: SVG de traço, sem emoji e sem biblioteca externa */
var SVG0 = '<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
function ic(nome, s, w) {
  var d = {
    alerta: '<path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    check: '<path d="M5 12l5 5L20 7"/>',
    phone: '<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z"/>',
    send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/>',
    seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    direita: '<path d="M9 6l6 6-6 6"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    pontos: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
    cadeado: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
    fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
    bloqueio: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
    cobrar: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',
    calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    chegou: '<path d="M20 6L9 17l-5-5"/>'
  }[nome] || '';
  return SVG0.replace(/\{s\}/g, s || 16).replace('{w}', w || 2.4) + d + '</svg>';
}
function aviso(tipo, titulo, texto, extraHtml) {
  var icone = tipo === 'vermelha' ? ic('bloqueio', 28) : tipo === 'verde' ? ic('check', 20, 3) : tipo === 'laranja' ? ic('alerta', 28) : ic('info', 24, 2.2);
  return '<div class="faixa ' + tipo + '">' + icone + '<div class="corpo">' + (titulo ? '<div class="t">' + titulo + '</div>' : '') + (texto ? '<div>' + texto + '</div>' : '') + '</div>' + (extraHtml || '') + '</div>';
}
function erroBox(lista, titulo) { return lista && lista.length ? '<div class="faixa erro"><strong>' + esc(titulo || 'Falta corrigir') + '</strong><div>' + lista.map(esc).join('<br>') + '</div></div>' : ''; }

/* ---------- ponte com o Apps Script (ou simulação, quando aberto fora do Google) ---------- */
var MOCK = (typeof google === 'undefined' || !google.script);
function call(nome, dados) {
  if (MOCK) return mock(nome, dados);
  return new Promise(function (res, rej) {
    google.script.run.withSuccessHandler(function (txt) {
      var r; try { r = JSON.parse(txt); } catch (e) { return rej(new Error('Resposta inesperada do servidor.')); }
      if (!r.ok) return rej(new Error(r.erro || 'Erro no servidor.'));
      res(r.dados);
    }).withFailureHandler(function (err) { rej(new Error((err && err.message) || String(err))); }).api(nome, dados || {});
  });
}
/*__MOCK_INICIO__*/ // simulação local (dist/index.html); o build tira este bloco da versão publicada
window.__ev = function (s) { return eval(s); }; // testes da simulação enxergam o escopo do app
var mockWhats = { 'Theo Barreto Lima': '(32) 9 8888-1111', 'Beatriz Almeida Rocha': '(32) 9 9999-2222', 'Igor Modelo Silva': '(32) 9 7777-3333' }, mockEnviadas = {};
var mockReg = [], mockDia = [], mockPendOk = [], mockPagos = {}, mockMens = {}, mockDecisoes = {};
var mockProfs = [{ nome: "Juliana Ribeiro", especialidade: "Psicologia", esp: 'Psicologia', horarios: { Segunda: '08:00-12:00, 13:00-19:00', 'Terça': '08:00-12:00', Quarta: '13:00-19:00', Quinta: '08:00-12:00, 13:00-18:00', Sexta: '', 'Sábado': '' }, duracao: 30 },
  { nome: "Giovana Grossi", especialidade: "Psicologia (estágio)", esp: 'Psicologia', horarios: { Segunda: '10:00-12:00, 13:00-16:00', 'Terça': '', Quarta: '', Quinta: '', Sexta: '', 'Sábado': '' }, duracao: null },
  { nome: "Dr. Victor Cunha", especialidade: "Pediatria", esp: 'Pediatria', horarios: { Segunda: '14:00-18:00', 'Terça': '', Quarta: '', Quinta: '14:00-18:00', Sexta: '', 'Sábado': '' }, duracao: 45 },
  { nome: "Marileia Rodrigues", especialidade: "Psicanálise e ABA", esp: 'Psicanálise', horarios: {}, duracao: null }];
var mockValores = [{ especialidade: 'Psicologia', valor: 120, nome: 'cheio', ativo: true }, { especialidade: 'Psicologia', valor: 100, nome: 'cartão de parceria', ativo: true }, { especialidade: 'Psicologia', valor: 80, nome: 'combinado', ativo: true }, { especialidade: 'Psicologia', valor: 70, nome: 'combinado', ativo: true }, { especialidade: 'Psicologia', valor: 50, nome: 'social', ativo: true }, { especialidade: 'Psicologia', valor: 25, nome: 'combinado', ativo: true }, { especialidade: 'Pediatria', valor: 200, nome: 'cheio', ativo: true }, { especialidade: 'Pediatria', valor: 120, nome: 'social', ativo: true }];
var mockParams = { vencimento_dia: 10, tolerancia_dia: 15, taxa_falta_pct: 50, rascunho_horas: 2, cache_minutos: 5, demora_aviso_segundos: 20, chave_pix: '' };
var mockLemb = [{ linha: 2, data: '03/10/2026 18:10', texto: 'Semana que vem a Dra. Luciana não atende na quinta.', validoAte: '03/10/2026', quem: 'simulacao@local' }, { linha: 3, data: hojeStr() + ' 08:00', texto: 'Hoje a Dra. Luciana atende só até 16h: remarcar quem está de 16h30 em diante.', validoAte: '', quem: 'simulacao@local' }];
var mockAgenda = [{ ID: 'F-1', Paciente: 'Beatriz Almeida Rocha', Profissional: 'Juliana Ribeiro', 'Dia da semana': 'Segunda', Hora: '08:00', 'Frequência': 'Semanal', 'Começa em': '01/09/2026', 'Termina em': '', Ativo: 'Sim', 'Observação': '', Tipo: 'sessão' },
  { ID: 'F-2', Paciente: 'Carlos Henrique Dias', Profissional: 'Juliana Ribeiro', 'Dia da semana': 'Segunda', Hora: '09:00', 'Frequência': 'Quinzenal', 'Começa em': '07/09/2026', 'Termina em': '', Ativo: 'Sim', 'Observação': '', Tipo: '' },
  { ID: 'F-3', Paciente: 'Pedro Augusto Neves', Profissional: 'Juliana Ribeiro', 'Dia da semana': 'Segunda', Hora: '10:00', 'Frequência': 'Semanal', 'Começa em': '', 'Termina em': '', Ativo: 'Sim', 'Observação': '', Tipo: '' },
  { ID: 'F-4', Paciente: 'Sofia Ramos Teixeira', Profissional: 'Giovana Grossi', 'Dia da semana': 'Segunda', Hora: '14:00', 'Frequência': 'Semanal', 'Começa em': '', 'Termina em': '', Ativo: 'Sim', 'Observação': '', Tipo: '' },
  { ID: 'F-5', Paciente: 'Ana Luísa Fontes Braga', Profissional: 'Giovana Grossi', 'Dia da semana': 'Segunda', Hora: '11:00', 'Frequência': 'Semanal', 'Começa em': '', 'Termina em': '', Ativo: 'Sim', 'Observação': '', Tipo: '' },
  { ID: 'F-6', Paciente: 'Theo Barreto Lima', Profissional: 'Giovana Grossi', 'Dia da semana': 'Segunda', Hora: '13:00', 'Frequência': 'Semanal', 'Começa em': '', 'Termina em': '', Ativo: 'Sim', 'Observação': '', Tipo: '' },
  { ID: 'F-7', Paciente: 'Helena Vasconcelos Prado', Profissional: 'Dr. Victor Cunha', 'Dia da semana': 'Segunda', Hora: '17:00', 'Frequência': 'Semanal', 'Começa em': '', 'Termina em': '', Ativo: 'Sim', 'Observação': '', Tipo: 'consulta' },
  { ID: 'F-8', Paciente: 'Lívia Fontes Pereira', Profissional: 'Juliana Ribeiro', 'Dia da semana': 'Segunda', Hora: '15:00', 'Frequência': 'Semanal', 'Começa em': '', 'Termina em': '', Ativo: 'Sim', 'Observação': '', Tipo: '' },
  { ID: 'F-9', Paciente: 'Igor Modelo Silva', Profissional: 'Juliana Ribeiro', 'Dia da semana': 'Segunda', Hora: '08:00', 'Frequência': 'Semanal', 'Começa em': '', 'Termina em': '', Ativo: 'Sim', 'Observação': '', Tipo: 'sessão' },
  { ID: 'F-10', Paciente: 'Igor Modelo Silva', Profissional: 'Giovana Grossi', 'Dia da semana': 'Segunda', Hora: '08:30', 'Frequência': 'Semanal', 'Começa em': '', 'Termina em': '', Ativo: 'Sim', 'Observação': '', Tipo: 'aplicação de teste' },
  { ID: 'F-11', Paciente: 'Mara Quinzenal Souza', Profissional: 'Giovana Grossi', 'Dia da semana': 'Segunda', Hora: '16:00', 'Frequência': 'Quinzenal', 'Começa em': '', 'Termina em': '', Ativo: 'Sim', 'Observação': '', Tipo: '' }];
var mockBase = [
  { linha: 2, nome: "Isaac Modelo Santos", cpf: "529.982.247-25", nasc: "15/03/2022", pagador: "Natália Modelo Santos", convenio: "Particular", ativo: "Sim" },
  { linha: 3, nome: "Isac Modelo de Souza", cpf: "111.444.777-35", nasc: "07/08/2024", pagador: "", convenio: "", ativo: "Sim" },
  { linha: 4, nome: "Isabelli Exemplo Portes", cpf: "", nasc: "13/11/2014", pagador: "", convenio: "", ativo: "Sim" }
];
var mockPacientes = [{ linha: 2, nome: 'Beatriz Almeida Rocha', cpf: '529.982.247-25', nasc: '03/05/1994', pagador: 'Beatriz Almeida Rocha', convenio: 'Particular', obsCobranca: '', ativo: 'Sim' },
  { linha: 3, nome: 'Carlos Henrique Dias', cpf: '529.982.247-25', nasc: '21/09/1979', pagador: 'Carlos Henrique Dias', convenio: 'Particular', obsCobranca: '', ativo: 'Sim' },
  { linha: 4, nome: 'Theo Barreto Lima', cpf: '529.982.247-25', nasc: '12/07/2015', pagador: 'Daniela Barreto Lima', convenio: 'Particular', obsCobranca: '', ativo: 'Sim', resp: 'Daniela Barreto Lima', respPar: 'Mãe' },
  { linha: 5, nome: 'Lívia Fontes Pereira', cpf: '529.982.247-25', nasc: '26/01/2010', pagador: '', convenio: 'Particular', obsCobranca: 'Pro bono até 31/10. A partir de 01/11: social.', ativo: 'Sim' },
  { linha: 6, nome: 'Pedro Augusto Neves', cpf: '529.982.247-25', nasc: '31/07/1980', pagador: '', convenio: 'Cedplan', obsCobranca: 'Cedplan — guia assinada antes da sessão.', ativo: 'Sim' },
  { linha: 7, nome: 'Sofia Ramos Teixeira', cpf: '529.982.247-25', nasc: '16/06/1999', pagador: 'Associação Boa Esperança', convenio: 'Particular', obsCobranca: '', ativo: 'Sim' },
  { linha: 8, nome: 'Ana Luísa Fontes Braga', cpf: '529.982.247-25', nasc: '14/02/1996', pagador: 'Ana Luísa Fontes Braga', convenio: 'Particular', obsCobranca: '', ativo: 'Sim' },
  { linha: 9, nome: 'Luana Castro Figueiredo', cpf: '529.982.247-25', nasc: '30/10/1988', pagador: 'Luana Castro Figueiredo', convenio: 'Particular', obsCobranca: '', ativo: 'Sim' },
  { linha: 10, nome: 'Helena Vasconcelos Prado', cpf: '', nasc: '02/02/2024', pagador: 'Renata Vasconcelos Prado', convenio: 'Particular', obsCobranca: '', ativo: 'Sim' },
  { linha: 11, nome: 'Marcos Vinícius Tavares', cpf: '529.982.247-25', nasc: '08/12/1989', pagador: 'Marcos Vinícius Tavares', convenio: 'Particular', obsCobranca: 'Sessão R$ 100 combinado com a Juliana.', ativo: 'Sim' },
  { linha: 12, nome: 'Mara Quinzenal Souza', cpf: '529.982.247-25', nasc: '04/04/2016', pagador: 'Mara Quinzenal Souza', convenio: 'Particular', obsCobranca: 'Quinzenal: mensalidade R$ 120.', ativo: 'Sim' },
  { linha: 13, nome: 'Igor Modelo Silva', cpf: '529.982.247-25', nasc: '10/10/2016', pagador: 'Fábio Modelo Silva', convenio: 'Particular', obsCobranca: '', ativo: 'Sim' }];
// Cobrança por profissional (simulação): uma linha por paciente × profissional
var mockCPP = [
  { id: 'C-1', paciente: 'Beatriz Almeida Rocha', profissional: 'Juliana Ribeiro', ativo: 'Sim', cobranca: 'Por sessão', valorSessao: 120, pagamento: 'Na hora', decididoPor: 'Juliana', decididoEm: '15/10/2026', linha: 2 },
  { id: 'C-2', paciente: 'Carlos Henrique Dias', profissional: 'Juliana Ribeiro', ativo: 'Sim', cobranca: 'Por sessão', valorSessao: 70, pagamento: 'Posterior', ate: '31/10/2026', decididoPor: 'migração 15/10', decididoEm: '15/10/2026', linha: 3 },
  { id: 'C-3', paciente: 'Carlos Henrique Dias', profissional: 'Juliana Ribeiro', ativo: 'Sim', cobranca: 'Por sessão', valorSessao: 70, pagamento: 'Antecipado', desde: '01/11/2026', decididoPor: 'migração 15/10', decididoEm: '15/10/2026', linha: 4 },
  { id: 'C-4', paciente: 'Theo Barreto Lima', profissional: 'Giovana Grossi', ativo: 'Sim', cobranca: 'Por sessão', valorSessao: 80, pagamento: 'Antecipado', decididoPor: 'Juliana', decididoEm: '15/10/2026', linha: 5 },
  { id: 'C-5', paciente: 'Lívia Fontes Pereira', profissional: 'Juliana Ribeiro', ativo: 'Sim', cobranca: 'Pro bono', pagamento: 'Não se aplica', ate: '31/10/2026', decididoPor: 'Juliana', decididoEm: '15/10/2026', linha: 6 },
  { id: 'C-6', paciente: 'Lívia Fontes Pereira', profissional: 'Juliana Ribeiro', ativo: 'Sim', cobranca: 'Mensalidade fixa', valorMensal: 200, pagamento: 'Antecipado', desde: '01/11/2026', decididoPor: 'Juliana', decididoEm: '15/10/2026', linha: 7 },
  { id: 'C-7', paciente: 'Pedro Augusto Neves', profissional: 'Juliana Ribeiro', ativo: 'Sim', cobranca: 'Convênio', convenio: 'Cedplan', pagamento: 'Não se aplica', decididoPor: 'migração 15/10', decididoEm: '15/10/2026', linha: 8 },
  { id: 'C-8', paciente: 'Sofia Ramos Teixeira', profissional: 'Giovana Grossi', ativo: 'Sim', cobranca: 'Mensalidade fixa', valorMensal: 200, pagamento: 'Antecipado', decididoPor: 'migração 15/10', decididoEm: '15/10/2026', linha: 9 },
  { id: 'C-9', paciente: 'Ana Luísa Fontes Braga', profissional: 'Giovana Grossi', ativo: 'Sim', cobranca: 'Por sessão', valorSessao: 70, pagamento: 'Posterior', decididoPor: 'migração 15/10', decididoEm: '15/10/2026', linha: 10 },
  { id: 'C-10', paciente: 'Luana Castro Figueiredo', profissional: 'Juliana Ribeiro', ativo: 'Sim', cobranca: 'Por sessão', valorSessao: 80, pagamento: 'Antecipado', decididoPor: 'Juliana', decididoEm: '15/10/2026', linha: 11 },
  { id: 'C-11', paciente: 'Marcos Vinícius Tavares', profissional: 'Juliana Ribeiro', ativo: 'Sim', cobranca: 'Por sessão', valorSessao: 100, pagamento: 'Na hora', decididoPor: 'Juliana', decididoEm: '15/10/2026', obs: 'Combinado com a Juliana.', linha: 12 },
  { id: 'C-12', paciente: 'Mara Quinzenal Souza', profissional: 'Giovana Grossi', ativo: 'Sim', cobranca: 'Mensalidade fixa', valorMensal: 120, pagamento: 'Antecipado', decididoPor: 'gestão', decididoEm: '15/10/2026', obs: 'Quinzenal.', linha: 13 },
  { id: 'C-13', paciente: 'Igor Modelo Silva', profissional: 'Juliana Ribeiro', ativo: 'Sim', cobranca: 'Mensalidade fixa', valorMensal: 200, pagamento: 'Antecipado', decididoPor: 'migração 15/10', decididoEm: '15/10/2026', linha: 14 }];
function mockComp(l, chave) { // estado da competência na simulação: pago em mockPagos; sessões agendadas = 4 (5 em meses de 5 semanas); Posterior = linhas Não do mês
  var k = l.paciente + '|' + l.profissional + '|' + chave, pg = mockPagos[k] || {}, m = mockMens[k] || {};
  var regs = mockReg.filter(function (r) { return r.paciente === l.paciente && r.profissional === l.profissional && Cobranca.chaveMes(dataObj(r.data)) === chave; });
  var ini = Cobranca.dataObj('01/' + ('0' + (MESES_PT.indexOf(chave.split('/')[0]) + 1)).slice(-2) + '/' + chave.split('/')[1]), nSeg = 0; if (ini) for (var d = new Date(ini.getFullYear(), ini.getMonth(), 1); d.getMonth() === ini.getMonth(); d.setDate(d.getDate() + 1)) if (d.getDay() === 1) nSeg++;
  return { chave: chave, pago: pg.pago || '', data: pg.data || '', forma: pg.forma || '', nf: pg.nf || '', sessoes: m.sessoes != null ? m.sessoes : (l.pagamento === 'Antecipado' && l.cobranca === 'Por sessão' ? nSeg : null), valorCobrado: m.valorCobrado != null ? m.valorCobrado : null, abatimentos: l.paciente === 'Luana Castro Figueiredo' && /Novembro/.test(chave) ? [{ texto: '− 1 sessão cancelada pela clínica em 27/10', n: 1 }] : [], recebido: pg.recebido || 0,
    atendidas: regs.filter(function (r) { return /^Atendido/.test(r.oque); }).length, aReceber: regs.filter(function (r) { return r.pago === 'Não'; }).reduce(function (a, r) { return a + (num(r.valor) || 0); }, 0), sessoesEditadas: m.sessoes != null };
}
function mockBloco(paciente, profissional, data, proc, oque) { var p = mockPacientes.filter(function (x) { return x.nome === paciente; })[0] || {}, v = Cobranca.linhaVigente(mockCPP, paciente, profissional, data), pr = mockProfs.filter(function (x) { return x.nome === profissional; })[0]; var esp = pr ? pr.esp : ''; var vl = mockValores.filter(function (x) { return x.especialidade === esp && /cheio/.test(x.nome); })[0]; return Cobranca.calcular({ linha: v.linha, profissional: profissional, especialidade: esp, valorCheio: vl ? vl.valor : null, procedimento: proc, oque: oque, competencia: v.linha ? mockComp(v.linha, Cobranca.chaveMes(data)) : null, hoje: data, params: mockParams, pagador: p.pagador || '', avisoLinha: v.aviso, convenioPaciente: p.convenio || '' }); }
function mockComps() { var o = {}, h = new Date(), chs = [Cobranca.chaveMes(new Date(h.getFullYear(), h.getMonth() - 1, 1)), Cobranca.chaveMes(h), Cobranca.chaveMes(new Date(h.getFullYear(), h.getMonth() + 1, 1))]; mockCPP.forEach(function (l) { if (!(l.pagamento === 'Antecipado' || l.pagamento === 'Posterior' || l.cobranca === 'Mensalidade fixa')) return; var k = l.paciente + '|' + l.profissional; o[k] = o[k] || {}; chs.forEach(function (c) { o[k][c] = mockComp(l, c); }); }); return o; }
// alertas na simulação (os textos são os do servidor: alertasBase_)
function mockAlertasDe(nomes) {
  var A = { 'Theo Barreto Lima': [{ tipo: 'divida', cor: 'vermelha', texto: 'Deve R$ 240,00 de 2 sessões sem pagamento, a mais antiga de 02/08 (75 dias)', acao: 'ficha' }, { tipo: 'cobrado', cor: 'laranja', texto: 'Cobrado no WhatsApp em 05/10 (há 11 dias) e outubro com Juliana Ribeiro ainda não foi pago', acao: 'cobranca' }],
    'Beatriz Almeida Rocha': [{ tipo: 'faltas', cor: 'laranja', texto: '2 faltas sem aviso ou em cima da hora em 60 dias (25/09, 09/10)', acao: 'ficha' }, { tipo: 'avaliacao', cor: 'lilas', texto: 'Avaliação com Giovana Grossi parada: 3 aplicações, a última em 01/10 (15 dias). Confira com a profissional', acao: 'ficha' }],
    'Igor Modelo Silva': [{ tipo: 'parou', cor: 'amarela', texto: 'Horário fixo de quarta 14:00 com Dr. Victor Cunha, mas a última sessão atendida foi em 10/09 (36 dias): confirme se continua ou encerre o horário', acao: 'agenda' }] }, out = {};
  (nomes || []).forEach(function (n) { var l = (A[n] || []).slice(); if (!mockWhats[n]) l.push({ tipo: 'whats', cor: 'cinza', texto: 'Sem celular no cadastro: a confirmação e a cobrança no WhatsApp não saem. Peça o número', acao: 'pacientes' }); if (l.length) out[n] = l; });
  return out;
}
// parcelamentos na simulação (mesma conta do servidor: estadoAcordo_)
var mockParc = [], mockParcPag = {};
function mockAcordo(a) {
  var h = new Date(), hoje = new Date(h.getFullYear(), h.getMonth(), h.getDate()), pg = mockParcPag[a.id] || [], resto = pg.reduce(function (s, x) { return s + x.valor; }, 0);
  a.pago = Math.round(resto * 100) / 100; a.saldo = Math.max(0, Math.round((a.total - a.pago) * 100) / 100); a.pagamentos = pg;
  a.parcelas = a.venc.map(function (q, i) { var c = Math.min(q.valor, Math.max(0, resto)); resto -= c; var sit = c >= q.valor - 0.005 ? 'paga' : c > 0 ? 'parcial' : 'aberta'; return { n: i + 1, venc: q.venc, valor: q.valor, pago: c, situacao: sit, atrasada: sit !== 'paga' && dataObj(q.venc) < hoje }; });
  a.atrasado = a.situacao === 'ativo' && a.parcelas.some(function (q) { return q.atrasada; }); a.proxima = a.situacao === 'ativo' ? a.parcelas.filter(function (q) { return q.situacao !== 'paga'; })[0] || null : null;
  return a;
}
function mockParcelas(nome, d) {
  if (nome === 'criarParcelamento') {
    var n = parseInt(d.parcelas, 10), total = d.tipo === 'divida' ? (d.linhas || []).length * 70 : Number(String(d.total || '').replace(/\./g, '').replace(',', '.')), erros = [];
    if (!(n >= 1 && n <= 24)) erros.push('Número de parcelas: de 1 a 24.'); if (!(total > 0)) erros.push(d.tipo === 'divida' ? 'Marque as sessões em aberto que entram no acordo.' : 'Valor total maior que zero.');
    if (d.tipo !== 'divida' && !d.procedimento) erros.push('Escolha o procedimento (sai em cada parcela paga).'); if (d.tipo !== 'divida' && !d.profissional) erros.push('Escolha o profissional.');
    var d0 = dataObj(d.primeiroVencimento); if (!d0) erros.push('Primeiro vencimento inválido.'); if (erros.length) return { ok: false, erros: erros };
    var cents = Math.round(total * 100), base = Math.floor(cents / n), venc = [];
    for (var i = 0; i < n; i++) { var y = d0.getFullYear(), m = d0.getMonth() + i, ult = new Date(y, m + 1, 0).getDate(), dd = new Date(y, m, Math.min(d0.getDate(), ult)); venc.push({ venc: ('0' + dd.getDate()).slice(-2) + '/' + ('0' + (dd.getMonth() + 1)).slice(-2) + '/' + dd.getFullYear(), valor: (i === n - 1 ? cents - base * (n - 1) : base) / 100 }); }
    var id = 'P-sim' + (mockParc.length + 1);
    mockParc.push({ id: id, data: hojeStr(), paciente: d.paciente, tipo: d.tipo === 'divida' ? 'divida' : 'avaliacao', tipoTxt: d.tipo === 'divida' ? 'Dívida renegociada' : 'Serviço parcelado', descricao: d.descricao || d.procedimento || ('Acordo de ' + (d.linhas || []).length + ' sessões em aberto'), procedimento: d.procedimento || '', profissional: d.profissional || '', total: total, n: n, venc: venc, linhas: d.linhas || [], situacao: 'ativo', obs: d.obs || '' });
    return { ok: true, id: id, total: total, vencimentos: venc };
  }
  var a = mockParc.filter(function (x) { return x.id === d.id; })[0];
  if (nome === 'pagarParcela') { if (!a) return { ok: false, erros: ['Parcelamento não encontrado.'] }; mockAcordo(a); var v = Number(String(d.valor || '').replace(/\./g, '').replace(',', '.')); if (!(v > 0)) return { ok: false, erros: ['Informe o valor recebido.'] }; if (v > a.saldo + 0.005) return { ok: false, erros: ['O valor passa do saldo do acordo.'] }; if (!d.forma) return { ok: false, erros: ['Escolha a forma de pagamento.'] };
    var nx = a.proxima ? a.proxima.n : a.n; (mockParcPag[a.id] = mockParcPag[a.id] || []).push({ data: d.data, valor: v, forma: d.forma }); mockAcordo(a); if (a.saldo < 0.005) a.situacao = 'quitado'; return { ok: true, id: a.id, parcelas: 'parcela ' + nx + '/' + a.n, quitado: a.situacao === 'quitado', erros: [] }; }
  if (nome === 'cancelarParcelamento') { if (!a) return { ok: false, erros: ['Parcelamento não encontrado.'] }; if (!String(d.motivo || '').trim()) return { ok: false, erros: ['Escreva o motivo do cancelamento.'] }; a.situacao = 'cancelado'; a.obs = (a.obs ? a.obs + ' | ' : '') + 'Cancelado: ' + d.motivo; return { ok: true }; }
  return { ok: true, acordos: mockParc.filter(function (x) { return d.paciente ? x.paciente === d.paciente : x.situacao === 'ativo'; }).map(mockAcordo) };
}
// a receber e perdas na simulação
var mockPerdidos = [{ aba: 'Setembro', id: 'A-p1', data: '03/09/2026', paciente: 'Igor Modelo Silva', profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia – convênio', convenio: 'Cedplan', valor: 100, motivo: 'glosa do convênio' }], mockAR = null;
function mockAReceber(nome, d) {
  var h = new Date(), dia = function (n) { var x = new Date(h.getTime() - n * 864e5); return ('0' + x.getDate()).slice(-2) + '/' + ('0' + (x.getMonth() + 1)).slice(-2) + '/' + x.getFullYear(); };
  var L = function (id, n, pac, pag, prof, proc, valor, saldo, pago) { return { aba: MESES_PT[new Date(h.getTime() - n * 864e5).getMonth()], linha: 2, id: id, data: dia(n), paciente: pac, pagador: pag, profissional: prof, procedimento: proc, valor: valor, saldo: saldo, pago: pago, dias: n, faixa: n <= 30 ? 'ate30' : n <= 60 ? 'ate60' : 'mais60', obs: '' }; };
  if (!mockAR) mockAR = [L('A-r1', 75, 'Theo Barreto Lima', 'Rita Lima', 'Juliana Ribeiro', 'Sessão de psicologia', 120, 120, 'Não'), L('A-r2', 44, 'Beatriz Almeida Rocha', '', 'Giovana Grossi', 'Avaliação neuropsicológica', 900, 600, 'Parcial'),
    L('A-r3', 12, 'Igor Modelo Silva', '', 'Dr. Victor Cunha', 'Consulta pediátrica', 250, 250, '(vazio)'), L('A-r4', 3, 'Theo Barreto Lima', 'Rita Lima', 'Juliana Ribeiro', 'Sessão de psicologia', 120, 120, 'Não'), L('', 2, 'Ana Luísa Fontes Braga', '', 'Juliana Ribeiro', 'Sessão de psicologia', 120, 120, 'Não')];
  var motivos = ['glosa do convênio', 'guia não autorizada', 'paciente não pagou', 'paciente desistiu', 'relevado pela gestão'];
  if (nome === 'darComoPerdido') { if (!String(d.motivo || '').trim()) return { ok: false, erros: ['Escreva o motivo da perda.'] }; var ids = (d.itens || []).map(function (x) { return x.id; });
    mockAR.filter(function (l) { return ids.indexOf(l.id) >= 0; }).forEach(function (l) { mockPerdidos.push({ aba: l.aba, id: l.id, data: l.data, paciente: l.paciente, profissional: l.profissional, procedimento: l.procedimento, convenio: 'Particular', valor: l.valor, motivo: d.motivo }); });
    mockAR = mockAR.filter(function (l) { return ids.indexOf(l.id) < 0; }); return { ok: true, feitos: ids.length, erros: [] }; }
  var soma = function (f) { return mockAR.filter(f).reduce(function (a, l) { return a + l.saldo; }, 0); };
  if (nome === 'aReceber') return { ok: true, parcelasVencidas: [{ id: 'P-sim0', paciente: 'Beatriz Almeida Rocha', pagador: '', descricao: 'Avaliação neuropsicológica', n: 1, de: 3, venc: dia(20), valor: 600, dias: 20 }], linhas: mockAR.slice().sort(function (a, b) { return b.dias - a.dias; }), motivos: motivos, total: soma(function () { return true; }), faixas: { ate30: soma(function (l) { return l.faixa === 'ate30'; }), ate60: soma(function (l) { return l.faixa === 'ate60'; }), mais60: soma(function (l) { return l.faixa === 'mais60'; }) } };
  var g = function (k) { var o = {}; mockPerdidos.forEach(function (l) { var x = o[l[k]] = o[l[k]] || { nome: l[k], n: 0, valor: 0 }; x.n++; x.valor += l.valor; }); return Object.keys(o).map(function (k2) { return o[k2]; }).sort(function (a, b) { return b.valor - a.valor; }); };
  var meses = ['Setembro', 'Outubro'].map(function (m) { var p = mockPerdidos.filter(function (l) { return l.aba === m; }); return { mes: m, atendido: m === 'Setembro' ? 14060.2 : 5372.5, perdido: p.reduce(function (a, l) { return a + l.valor; }, 0), n: p.length }; });
  return { ok: true, meses: meses, porMotivo: g('motivo'), porConvenio: g('convenio'), porProfissional: g('profissional'), linhas: mockPerdidos, total: { atendido: 19432.7, perdido: mockPerdidos.reduce(function (a, l) { return a + l.valor; }, 0), n: mockPerdidos.length } };
}
// conciliação na simulação: extrato e vendas de mentira; confirmar muda a situação e some da lista
var mockExt = null, mockVendas = null, mockConcOk = {};
function mockConc(nome, d) {
  var h = new Date(), mm = ('0' + (h.getMonth() + 1)).slice(-2) + '/' + h.getFullYear(), dd = function (n) { return ('0' + n).slice(-2) + '/' + mm; };
  if (nome === 'importarExtrato' || nome === 'importarVendasCartao') {
    var n = (String(d.texto).match(nome === 'importarExtrato' ? /<STMTTRN>/gi : /\n/g) || []).length; if (!n) return { ok: false, erros: ['Não achei entradas nesse arquivo.'] };
    if (nome === 'importarExtrato') mockExt = mockExt || []; else mockVendas = mockVendas || []; return { ok: true, lidos: n, novos: n, jaTinha: 0 };
  }
  if (!mockExt) mockExt = [{ id: 'B1', data: dd(2), valor: 120, tipo: 'Pix', quem: 'Carla Barreto Lima', desc: 'Pix recebido - Carla Barreto Lima' }, { id: 'B2', data: dd(3), valor: 240, tipo: 'Pix', quem: 'Rita Almeida Rocha', desc: '' },
    { id: 'B3', data: dd(3), valor: 6137.79, tipo: 'Pix', quem: 'Cedplan Saude', desc: '', sugestao: 'convênio (fatura)' }, { id: 'B4', data: dd(1), valor: 200, tipo: 'Pix', quem: 'Marileia Rodrigues De Oliveira', desc: '', sugestao: 'aluguel de sala' },
    { id: 'B5', data: dd(6), valor: 90, tipo: 'Pix (QR Code)', quem: 'Pessoa Desconhecida', desc: '' }, { id: 'B6', data: dd(3), valor: 208.57, tipo: 'Cartão (vendas)', quem: '', desc: 'Vendas - Maquininha', situacao: 'conciliado', ligado: 'Venda no cartão V1' },
    { id: 'B7', data: dd(5), valor: 0.42, tipo: 'Rendimento', quem: '', desc: 'Rendimento', situacao: 'não é paciente' }];
  if (!mockVendas) mockVendas = [{ id: 'V1', data: dd(2), forma: 'Crédito', parcelas: 'à Vista', bandeira: 'Visa', bruto: 215, taxa: 6.43, liquido: 208.57, liberacao: dd(3), comprador: '', depositoSug: { id: 'B6', data: dd(3), valor: 208.57, situacao: 'pendente' } },
    { id: 'V2', data: dd(4), forma: 'Crédito', parcelas: 'Parcelado 4x', bandeira: 'Mastercard', bruto: 1200, taxa: 23.4, liquido: 1176.6, liberacao: dd(4), comprador: '', depositoSug: null }];
  if (nome === 'conciliar') { (d.itens || []).forEach(function (it) { mockConcOk[it.id] = it.recs && it.recs.length ? 'conciliado' : it.situacao; (it.recs || []).forEach(function (r) { mockConcOk['lanc:' + r.id] = 1; }); }); return { ok: true, feitos: (d.itens || []).length, erros: [] }; }
  var L = function (id, dia, pac, prof, valor, forma) { return { aba: MESES_PT[h.getMonth()], linha: 2 + +id.slice(1), id: id, paciente: pac, profissional: prof, data: dd(dia), dataPag: dd(dia), valor: valor, forma: forma }; };
  var sug = [{ tipo: 'pix', forca: 'forte', aviso: '', ext: mockExt[0], recs: [L('L1', 2, 'Theo Barreto Lima', 'Juliana Ribeiro', 120, 'Pix')] },
    { tipo: 'varios', forca: 'confira', aviso: '2 lançamentos num Pix só', ext: mockExt[1], recs: [L('L2', 1, 'Beatriz Almeida Rocha', 'Juliana Ribeiro', 120, 'Pix'), L('L3', 3, 'Beatriz Almeida Rocha', 'Juliana Ribeiro', 120, 'Pix')] },
    { tipo: 'cartao', forca: 'confira', aviso: 'R$ 15,00 a mais na maquininha (acréscimo?)', venda: mockVendas[0], recs: [L('L4', 2, 'Igor Modelo Silva', 'Dr. Victor Cunha', 200, 'Cartão de crédito')] }];
  var feito = function (id) { return mockConcOk[id]; };
  sug = sug.filter(function (g) { return !feito(g.ext ? g.ext.id : g.venda.id); });
  var usados = {}; sug.forEach(function (g) { g.recs.forEach(function (r) { usados[r.id] = 1; }); });
  var semBanco = [L('L5', 5, 'Theo Barreto Lima', 'Juliana Ribeiro', 70, 'Pix'), L('L6', 6, 'Beatriz Almeida Rocha', 'Giovana Grossi', 90, 'Pix')].filter(function (r) { return !mockConcOk['lanc:' + r.id]; });
  var ext = mockExt.map(function (e) { return Object.assign({ situacao: 'pendente', ligado: '', obs: '' }, e, feito(e.id) ? { situacao: feito(e.id) } : {}); });
  var pend = ext.filter(function (e) { return e.situacao === 'pendente'; }), semLanc = pend.filter(function (e) { return !sug.some(function (g) { return g.ext && g.ext.id === e.id; }) && e.tipo !== 'Cartão (vendas)'; });
  var vendas = mockVendas.map(function (v) { return Object.assign({ situacao: feito(v.id) || 'pendente', ligado: '', deposito: '', obs: '' }, v); });
  var vsl = vendas.filter(function (v) { return v.situacao === 'pendente' && !sug.some(function (g) { return g.venda && g.venda.id === v.id; }); });
  var soma = function (l, f) { return Math.round(l.reduce(function (a, x) { return a + f(x); }, 0) * 100) / 100; };
  return { ok: true, chave: d.chave, sugestoes: sug, semLancamento: semLanc, vendasSemLancamento: vsl, semBanco: semBanco, resolvidos: ext.filter(function (e) { return e.situacao !== 'pendente'; }), vendas: vendas,
    situacoes: ['conciliado', 'convênio (fatura)', 'mensalidade anotada em Mensalistas', 'mês anterior ao app', 'aluguel de sala', 'não é paciente', 'sem lançamento no app', 'pendente'],
    resumo: { entradas: ext.length, valorEntradas: soma(ext, function (e) { return e.valor; }), resolvidas: ext.length - pend.length, pendentes: pend.length, valorSemLanc: soma(semLanc, function (e) { return e.valor; }) + soma(vsl, function (v) { return v.bruto; }), valorSemBanco: soma(semBanco, function (r) { return r.valor; }), taxasCartao: soma(vendas, function (v) { return v.taxa; }), temExtrato: true, temVendas: true } };
}
// IA (16/10): estado/pausa/gatilho, guias lidas (5 casos: 1 linha · várias sessões · nome diferente · ilegível · não é guia · sem atendimento)
var mockIAE = { ativa: true, itens: { guias: true, conciliacao: true, perguntar: true }, gastoMes: 0.42, gastoDia: 0.03, chamadasMes: 61, tetoMes: 20, tetoDia: 3, pct: 2, avisoPct: 80, pausada: '', mensagem: '', modelo: 'claude-haiku-5-5', horaGatilho: 19, gatilho: { instalado: true, n: 1 }, temChave: true, ultimaGuias: { quando: hojeStr() + ' 19:02', lidas: 6, confirmar: 2, conferir: 4, comErro: 0, restantes: 0, parou: '', custo: 0.0031, origem: 'gatilho' }, gestao: true };
function mockGuia(id, nome, status, conf, lido, pac, linhas, motivos) { return { id: id, nome: nome, pasta: 'CEDPLAN/10 OUT 26/' + (pac || 'solto'), link: 'https://drive.google.com/file/d/' + id + '/view', miniatura: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="120"><rect width="96" height="120" fill="#f3eef7"/><text x="8" y="60" font-size="11" fill="#6B3FA0">guia</text></svg>'), convenio: 'Cedplan', lidaEm: hojeStr() + ' 19:02', status: status, confianca: conf, motivos: motivos || '', obs: '', lido: Object.assign({ numero: '', carteirinha: '', nome: '', datas: [], procedimento: 'Sessão de psicoterapia', quantidade: 1, assinatura: true, legibilidade: 'boa', observacao: '', paginas: 1, numeros: [] }, lido), sugestao: { paciente: pac || '', linhas: linhas || [], como: 'nome lido' }, candidatas: pac ? [{ aba: 'Setembro', id: 'A-sim-c1', data: '23/09/2026', hora: '10:00', profissional: 'Juliana Ribeiro', guia: 'Sim' }, { aba: 'Outubro', id: 'A-sim-c2', data: '07/10/2026', hora: '10:00', profissional: 'Juliana Ribeiro', guia: '' }] : [], confirmadoPor: '', linhasGravadas: '', custo: 0.0005 }; }
var mockGuias = [
  mockGuia('g1', '30-09 Pedro Augusto.pdf', 'lida', 'alta', { numero: '1504122', carteirinha: '0012345', nome: 'Pedro Augusto Neves', datas: ['30/09/2026'] }, 'Pedro Augusto Neves', [{ aba: 'Setembro', id: 'A-sim-p2', data: '30/09/2026', hora: '10:00', profissional: 'Juliana Ribeiro', guia: '' }]),
  mockGuia('g2', 'Igor guia 4 sessoes.pdf', 'lida', 'alta', { numero: '7788', carteirinha: '998877', nome: 'Igor Modelo Silva', datas: ['03/10/2026', '10/10/2026', '17/10/2026'], quantidade: 3 }, 'Igor Modelo Silva', [{ aba: 'Outubro', id: 'A-sim-i1', data: '03/10/2026', hora: '09:00', profissional: 'Juliana Ribeiro', guia: '' }, { aba: 'Outubro', id: 'A-sim-i2', data: '10/10/2026', hora: '09:00', profissional: 'Juliana Ribeiro', guia: 'Sim' }, { aba: 'Outubro', id: 'A-sim-i3', data: '17/10/2026', hora: '09:00', profissional: 'Juliana Ribeiro', guia: '' }]),
  mockGuia('g3', '08-10 Bia Rocha.pdf', 'baixa_confianca', 'baixa', { numero: '555', nome: 'Beatriz A. da Rocha', datas: ['08/10/2026'] }, 'Beatriz Almeida Rocha', [{ aba: 'Outubro', id: 'A-sim-b1', data: '08/10/2026', hora: '08:00', profissional: 'Juliana Ribeiro', guia: '' }], 'nome lido na guia não bateu com o cadastro; usei o da pasta/arquivo'),
  mockGuia('g4', '09-10 foto escura.jpg', 'baixa_confianca', 'baixa', { numero: '', nome: 'Theo Barreto Lima', datas: ['09/10/2026'], legibilidade: 'ilegivel', assinatura: false, observacao: 'foto escura, campos pouco legíveis' }, 'Theo Barreto Lima', [{ aba: 'Outubro', id: 'A-sim-t1', data: '09/10/2026', hora: '15:00', profissional: 'Juliana Ribeiro', guia: '' }], 'leitura ilegivel; sem assinatura visível'),
  mockGuia('g5', 'comprovante pix.pdf', 'nao_e_guia', 'baixa', { observacao: 'comprovante de Pix, não é guia' }, '', [], 'o modelo não viu uma guia: comprovante de Pix'),
  mockGuia('g6', '02-10 Theo.pdf', 'sem_atendimento', 'alta', { numero: '42', carteirinha: '55', nome: 'Theo Barreto Lima', datas: ['02/10/2026'] }, 'Theo Barreto Lima', [], 'nenhuma sessão de convênio de Theo Barreto Lima em 02/10/2026')
];
function mockIA(nome, d) {
  if (nome === 'iaEstado') return Object.assign({ ok: true }, mockIAE);
  if (nome === 'iaPausar') { mockIAE.ativa = d.ativa !== false; mockIAE.pausada = mockIAE.ativa ? '' : 'pausada'; mockIAE.mensagem = mockIAE.ativa ? '' : 'IA pausada pela gestão'; return { ok: true, estado: Object.assign({ ok: true }, mockIAE) }; }
  if (nome === 'iaDefinir') { var k = String(d.chave).replace(/^ia_/, ''); if (mockIAE.itens[k] !== undefined) mockIAE.itens[k] = !/^n/i.test(d.valor); return { ok: true, estado: Object.assign({ ok: true }, mockIAE) }; }
  if (nome === 'iaInstalarGatilho') { mockIAE.gatilho = { instalado: true, n: 1 }; return { ok: true, hora: mockIAE.horaGatilho, gatilho: mockIAE.gatilho }; }
  if (nome === 'lerGuias') return { ok: true, lidas: 2, confirmar: 1, conferir: 1, ignoradas: 0, duplicadas: 0, comErro: 0, restantes: 0, novos: 2, custo: 0.0011, custoPorGuia: 0.00055, parou: '', mensagens: [], erros: [] };
  if (nome === 'guiasLidas') return { ok: true, itens: mockGuias.filter(function (g) { return !g._fim; }), ontem: mockGuias.filter(function (g) { return !g._fim; }).length, ontemData: hojeStr(), ia: { pausada: mockIAE.pausada, mensagem: mockIAE.mensagem, ultima: mockIAE.ultimaGuias } };
  if (nome === 'confirmarGuia') { var g = mockGuias.filter(function (x) { return x.id === d.idArquivo; })[0]; if (!g) return { ok: false, erros: ['Guia não encontrada.'] }; if (!(d.linhas || []).length) return { ok: false, erros: ['Escolha pelo menos uma linha.'] }; g._fim = 'confirmada'; (d.linhas || []).forEach(function (l) { if (/^A-sim-p/.test(l.id)) mockPendOk.push(l.id); }); return { ok: true, gravadas: d.linhas.map(function (l) { return l.aba + ':' + l.id; }), erros: [], carteirinha: d.gravarCarteirinha ? g.lido.carteirinha : '', numero: g.lido.numero }; }
  if (nome === 'ignorarGuia') { var g2 = mockGuias.filter(function (x) { return x.id === d.idArquivo; })[0]; if (g2) g2._fim = 'ignorada'; return { ok: true }; }
  return null;
}
function mock(nome, d) {
  return new Promise(function (res) { setTimeout(function () {
    var hoje = new Date();
    var ia = mockIA(nome, d || {}); if (ia) return res(ia);
    if (nome === 'bootstrap') return res({ usuario: { email: 'simulacao@local', perfil: window.__RECEPCAO ? 'recepcao' : 'gestao' }, planilha: '(simulação, sem planilha)', hora: '', hoje: hojeStr(),
      lembrete: mockLemb[mockLemb.length - 1], lembretes: mockLemb.slice(-5).reverse(),
      listas: { oque: ["Atendido", "Desmarcou com antecedência (≥ 24h)", "Faltou avisando em cima da hora (< 24h)", "Faltou sem aviso", "Cancelado pela clínica"], pago: ["Sim", "Não", "Convênio (fatura)", "Pacote (sessão já paga)", "Não se aplica (pro bono / permuta)", "Perdido / glosa", "Parcial", "Incluída na mensalidade"], formas: ["Pix", "Dinheiro", "Cartão de débito", "Cartão de crédito", "Link de pagamento"],
        cobrancas: Cobranca.COBRANCAS.slice(), pagamentos: Cobranca.PAGAMENTOS.slice(), feriados: [], convenios: ["Particular", "Cedplan", "Sabin Sinai", "Unafisco", "AAPI JF", "Plan Minas", "PLASC", "AMIL", "ASSEFAZ", "FUSEX", "IPSM", "Sulamérica", "18 de Julho", "Aeronáutica"] },
      profissionais: mockProfs, pacientes: mockBase.concat(mockPacientes.map(function (p) { return { linha: p.linha + 10, nome: p.nome, cpf: '', nasc: p.nasc, pagador: p.pagador, convenio: p.convenio, ativo: 'Sim' }; })), params: mockParams, valores: mockValores });
    if (nome === 'bootstrapAtendimento') return res({ hoje: hojeStr(), chave: Cobranca.chaveMes(hoje), abaMes: MESES_PT[hoje.getMonth()], abaMesExiste: true, params: mockParams, valores: mockValores,
      procedimentos: [{ nome: 'Consulta pediátrica', especialidade: 'Pediatria', valor: 200 }, { nome: 'Consulta pediátrica – cartão de parceria ou AAPI JF', especialidade: 'Pediatria', valor: 160 }, { nome: 'Retorno pediátrico (com pedido de exames, até 30 dias)', especialidade: 'Pediatria', valor: 0 },
        { nome: 'Anamnese psicologia', especialidade: 'Psicologia', valor: 140 }, { nome: 'Sessão de psicologia', especialidade: 'Psicologia', valor: 120 }, { nome: 'Sessão de psicologia – cartão de parceria', especialidade: 'Psicologia', valor: 100 }, { nome: 'Sessão de psicologia – convênio', especialidade: 'Psicologia', valor: 0 }, { nome: 'Taxa de falta – psicologia', especialidade: 'Psicologia', valor: 120 }, { nome: 'Aplicação de teste – avaliação neuropsicológica', especialidade: 'Psicologia', valor: 0 }, { nome: 'Avaliação neuropsicológica', especialidade: 'Psicologia', valor: null }],
      cobrancas: mockCPP.slice(), competencias: mockComps(), pacientes: mockPacientes });
    if (nome === 'salvarLembrete') { var nl = { linha: mockLemb.length + 2, data: hojeStr() + ' ' + agoraHora(), texto: d.encerrar ? '' : d.texto, validoAte: d.encerrar ? '' : (d.validoAte || ''), quem: 'simulacao@local' }; mockLemb.push(nl); return res({ ok: true, linha: nl.linha, lembrete: nl.texto ? nl : null, lembretes: mockLemb.slice(-5).reverse() }); }
    if (nome === 'registrarAtendimento') {
      var mp = mockPacientes.filter(function (p) { return p.nome === d.paciente; })[0]; if (!mp) return res({ ok: false, erros: ['Paciente não está em Pacientes.'] });
      var b = mockBloco(d.paciente, d.profissional, dataObj(d.data) || hoje, d.procedimento, d.oque), pago = Cobranca.pagoK(b, d.recebeu), valor = b.recebeu ? (d.valor !== '' && d.valor != null ? num(d.valor) : b.valor) : (b.valor == null ? '' : b.valor);
      if (b.detalheObrigatorio && !String(d.detalhe || '').trim()) return res({ ok: false, erros: ['Escreva no Detalhe o que aconteceu: é obrigatório em falta sem aviso e em cima da hora.'] });
      if (pago === 'Sim' && !(valor > 0)) return res({ ok: false, erros: ['Recebeu = Sim exige um valor maior que zero.'] });
      mockReg.push({ paciente: d.paciente, profissional: d.profissional, oque: d.oque, hora: d.hora, data: d.data, procedimento: d.procedimento, id: 'A-sim-' + (mockReg.length + 1), valor: valor === '' ? 0 : valor, recebido: pago === 'Parcial' ? num(d.valorRecebido) : 0, pago: pago, forma: d.forma || '', nf: pago === 'Sim' || pago === 'Parcial' ? (d.nf || 'Não') : '', nfN: d.nfNumero || '', guia: d.guia || '', convenio: mp.convenio, detalhe: d.detalhe || '', decisao: '', obs: (b.detalhe ? 'Falta/desmarcação — ' + (d.detalhe || '') : '') + (d.observacao || '') });
      return res({ ok: true, id: 'A-sim-' + mockReg.length, linha: 41 + mockReg.length, aba: MESES_PT[(dataObj(d.data) || hoje).getMonth()], pago: pago, valor: valor, bloco: { situacao: b.situacao, frase: b.frase }, pendenteDecisao: !!b.detalhe }); }
    if (nome === 'listaDoDia' || nome === 'agendaSemana') {
      var montar = function (ds) {
        var dt = dataObj(ds) || hoje, dn = DIAS_PT[dt.getDay()];
        var itens = mockAgenda.filter(function (a) { return a['Dia da semana'] === dn; }).map(function (a) { return { hora: a['Hora'], paciente: a['Paciente'], profissional: a['Profissional'], origem: a['Frequência'], agendaId: a['ID'], obs: '', tipo: a.Tipo || '' }; }).concat(mockDia.filter(function (x) { return x.data === ds && !/^Não vem|^Confirmado|^Removido/.test(x.origem); }).map(function (x) { return { hora: x.hora, paciente: x.paciente, profissional: x.profissional, origem: x.origem, listaId: x.id, tipo: x.origem }; }));
        mockReg.filter(function (x) { return x.data === ds && !itens.some(function (it) { return it.paciente === x.paciente && it.profissional === x.profissional; }); }).forEach(function (x) { itens.push({ hora: x.hora || '', paciente: x.paciente, profissional: x.profissional, origem: 'Registrado', tipo: '' }); }); // registrados fora da lista (como no servidor)
        itens.forEach(function (it) { var r = mockReg.filter(function (x) { return x.paciente === it.paciente && x.profissional === it.profissional && x.data === ds; }).slice(-1)[0]; it.registro = r ? { oque: r.oque, id: r.id, procedimento: r.procedimento, hora: r.hora, valor: r.valor, recebido: r.recebido, pago: r.pago, forma: r.forma, nf: r.nf, nfN: r.nfN, guia: r.guia, convenio: r.convenio } : null; var nv = mockDia.filter(function (x) { return x.data === ds && /^Não vem/.test(x.origem) && x.paciente === it.paciente; })[0]; if (nv) it.naoVem = nv.origem; var cf = mockDia.filter(function (x) { return x.data === ds && x.origem === 'Confirmado' && x.paciente === it.paciente; })[0]; if (cf) it.confirmado = { por: 'simulacao@local', quando: 'ontem 17:40' };
          var mp2 = mockPacientes.filter(function (p) { return p.nome === it.paciente; })[0]; if (!mp2) { it.cobrancaHoje = null; return; }
          var b2 = mockBloco(it.paciente, it.profissional, dt, it.registro ? it.registro.procedimento : (/aplicação de teste/i.test(it.tipo) ? 'Aplicação de teste' : ''), it.registro ? it.registro.oque : 'Atendido');
          it.cobrancaHoje = { situacao: b2.situacao, cor: b2.cor, curto: b2.curto, frase: b2.frase, apoio: b2.apoio, valor: b2.valor, valorMes: b2.valorMes, guia: b2.guia, nf: b2.nf, decidido: b2.decidido, obsLinha: b2.obsLinha, aviso: b2.aviso, linhas: Cobranca.linhasDoPaciente(mockCPP, it.paciente, dt).map(Cobranca.resumoLinha) }; });
        return { data: ds, diaSemana: dn, itens: itens, abaMes: MESES_PT[dt.getMonth()], abaMesExiste: true, alertas: mockAlertasDe(itens.map(function (it) { return it.paciente; })) };
      };
      if (nome === 'agendaSemana') { var b0 = dataObj(d.data) || hoje, seg0 = new Date(b0.getFullYear(), b0.getMonth(), b0.getDate() - ((b0.getDay() + 6) % 7)), dias0 = []; for (var i0 = 0; i0 < 7; i0++) { var dt0 = new Date(seg0.getFullYear(), seg0.getMonth(), seg0.getDate() + i0), ds0 = ('0' + dt0.getDate()).slice(-2) + '/' + ('0' + (dt0.getMonth() + 1)).slice(-2) + '/' + dt0.getFullYear(), r0 = montar(ds0); dias0.push({ data: ds0, diaSemana: r0.diaSemana, itens: d.profissional ? r0.itens.filter(function (x) { return x.profissional === d.profissional; }) : r0.itens }); } return res({ inicio: dias0[0].data, profissional: d.profissional || '', dias: dias0 }); }
      var r = montar(d.data);
      var pend = { 'Carlos Henrique Dias': [{ tipo: 'pag', aba: 'Setembro', id: 'A-sim-p1', data: '29/09/2026', hora: '09:00', profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia', oque: 'Atendido', valor: 70, pago: '', convenio: 'Particular', nf: '', guia: '' }], 'Pedro Augusto Neves': [{ tipo: 'guia', aba: 'Outubro', id: 'A-sim-p2', data: '30/09/2026', hora: '10:00', profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia – convênio', oque: 'Atendido', valor: 0, pago: 'Convênio (fatura)', convenio: 'Cedplan', nf: '', guia: '' }] };
      Object.keys(pend).forEach(function (k) { pend[k] = pend[k].filter(function (x) { return mockPendOk.indexOf(x.id) < 0; }); if (!pend[k].length) delete pend[k]; });
      r.pendencias = pend; r.params = mockParams; return res(r); }
    if (nome === 'agendaFixa') return res(mockAgenda);
    if (nome === 'salvarExpediente') { var pf = mockProfs.filter(function (x) { return x.nome === d.profissional; })[0]; if (!pf) return res({ ok: false, erros: ['Profissional não está na aba Profissionais.'] }); pf.horarios = d.horarios; pf.duracao = parseInt(d.duracao, 10) || null; return res({ ok: true, colunasCriadas: [], profissionais: mockProfs }); }
    if (nome === 'salvarAgendaFixa') { var id = d.id || ('F-' + (mockAgenda.length + 1)); var ex = mockAgenda.filter(function (a) { return a.ID === id; })[0]; var row = { ID: id, Paciente: d.paciente, Profissional: d.profissional, 'Dia da semana': d.diaSemana, Hora: d.hora, 'Frequência': d.frequencia || 'Semanal', 'Começa em': d.comecaEm || '', 'Termina em': d.terminaEm || '', Ativo: d.ativo === false ? 'Não' : 'Sim', 'Observação': d.observacao || '', Tipo: d.tipo || '' }; if (ex) Object.assign(ex, row); else mockAgenda.push(row); return res({ ok: true, id: id }); }
    if (nome === 'acrescentarAoDia') { var nid = 'D-' + (mockDia.length + 1); mockDia.push({ id: nid, data: d.data, hora: d.hora, paciente: d.paciente, profissional: d.profissional, origem: d.origem || 'Avulso' }); return res({ ok: true, id: nid }); }
    if (nome === 'remarcar') { mockDia.push({ id: 'D-x' + mockDia.length, data: d.de, hora: d.horaDe, paciente: d.paciente, profissional: d.profissional, origem: 'Não vem · remarcado para ' + d.para }); mockDia.push({ id: 'D-y' + mockDia.length, data: d.para, hora: d.horaPara || d.horaDe, paciente: d.paciente, profissional: d.profissional, origem: 'Remarcação de ' + d.de }); return res({ ok: true }); }
    if (nome === 'fichaPaciente') { var fp = mockPacientes.filter(function (x) { return x.nome === d.nome; })[0]; if (!fp) return res({ ok: false, erros: ['Paciente não encontrado em Pacientes.'] });
      var fw = Mensagens.foneDoPaciente({ whats: mockWhats[fp.nome] }), fcpp = mockCPP.filter(function (l) { return l.paciente === fp.nome; });
      var fses = mockReg.filter(function (x) { return x.paciente === fp.nome; }).map(function (x) { return { data: x.data, hora: x.hora, profissional: x.profissional, procedimento: x.procedimento, oque: x.oque, valor: x.valor, pago: x.pago, saldo: x.pago === 'Não' ? x.valor : 0, aba: '', id: x.id }; }).reverse();
      fses.push({ data: '29/09/2026', hora: '09:00', profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia', oque: 'Atendido', valor: 70, pago: 'Não', saldo: 70, aba: 'Setembro', id: 'A-sim-f1' });
      return res({ ok: true, paciente: { nome: fp.nome, nasc: fp.nasc, ativo: 'Sim', convenio: fp.convenio, pagador: fp.pagador, obsCobranca: fp.obsCobranca, resp: fp.resp || '', respPar: fp.respPar || '', fone: fw.fone, foneFmt: fw.foneFmt, foneDe: fw.de, cpfFinal: '7225' },
        cobrancas: fcpp.map(function (l0) { var l = Cobranca.linhaDe(l0); return { id: l0.id, profissional: l0.profissional, resumo: Cobranca.resumoLinha(l), vigente: true, ativo: 'Sim', obs: l0.obs || '' }; }),
        fixos: mockAgenda.filter(function (a) { return a.Paciente === fp.nome; }).map(function (a) { return { dia: a['Dia da semana'], hora: a.Hora, profissional: a.Profissional, frequencia: a['Frequência'], tipo: a.Tipo === 'sessão' ? '' : (a.Tipo || '') }; }),
        proximos: mockAgenda.filter(function (a) { return a.Paciente === fp.nome; }).map(function (a) { return { data: '19/10/2026', diaSemana: 'Segunda', hora: a.Hora, profissional: a.Profissional, tipo: '', confirmado: false, naoVem: '', registrado: '' }; }),
        aberto: fses.filter(function (x) { return x.pago === 'Não' && /^Atendido/.test(x.oque); }).map(function (x) { var noAcordo = mockParc.some(function (a) { return a.situacao === 'ativo' && a.linhas.some(function (l) { return l.id === x.id; }); }); return { tipo: noAcordo ? 'acordo' : 'receber', r: x }; }), mensal: [], parcelamentos: mockParcelas('parcelamentos', { paciente: fp.nome }).acordos, alertas: mockAlertasDe([fp.nome])[fp.nome] || [], sessoes: fses, totalSessoes: fses.length, ultimaVez: fses[0] ? { data: fses[0].data, profissional: fses[0].profissional } : null,
        mensagens: Object.keys(mockEnviadas).filter(function (k) { return k.indexOf(fp.nome) >= 0; }).map(function (k) { return { quando: mockEnviadas[k].quando, tipo: k.split('|').length > 3 || /^\d/.test(k) ? 'Confirmação' : 'Cobrança', por: 'simulacao@local' }; }), alteracoes: [] }); }
    if (nome === 'registrarLote') { var resL = []; return (d.itens || []).reduce(function (pr, x) { return pr.then(function () { return mock('registrarAtendimento', x).then(function (r1) { resL.push(r1); }); }); }, Promise.resolve()).then(function () { var nL = resL.filter(function (r1) { return r1.ok; }).length; res({ ok: true, gravados: nL, falharam: resL.length - nL, resultados: resL }); }); }
    if (nome === 'confirmacoes') { // simulação: todo dia útil repete a agenda fixa de segunda
      var cde = dataObj(d.de), cate = dataObj(d.ate) || cde; if (!cde) return res({ ok: false, erros: ['Data inválida.'] });
      var grp = {}, ordC = [];
      for (var cd = new Date(cde.getTime()); cd <= cate; cd.setDate(cd.getDate() + 1)) {
        if (cd.getDay() === 0 || cd.getDay() === 6) continue; var cds = ('0' + cd.getDate()).slice(-2) + '/' + ('0' + (cd.getMonth() + 1)).slice(-2) + '/' + cd.getFullYear();
        mockAgenda.filter(function (a) { return a['Dia da semana'] === 'Segunda' && a.Ativo !== 'Não'; }).forEach(function (a) {
          var mp = mockPacientes.filter(function (p) { return p.nome === a.Paciente; })[0] || {}, fone = String(mockWhats[a.Paciente] || '').replace(/\D/g, ''), k = mp.pagador ? 'p:' + mp.pagador : 'x:' + a.Paciente;
          if (!grp[k]) { grp[k] = { chave: k, pagador: mp.pagador || '', fone: '', foneFmt: '', foneDe: '', itens: [] }; ordC.push(k); }
          if (fone && !grp[k].fone) { grp[k].fone = '55' + fone; grp[k].foneFmt = mockWhats[a.Paciente]; grp[k].foneDe = 'pagador'; }
          var conf = mockDia.filter(function (x) { return x.data === cds && x.paciente === a.Paciente && x.profissional === a.Profissional && x.origem === 'Confirmado'; })[0];
          grp[k].itens.push({ data: cds, diaSemana: DIAS_PT[cd.getDay()], hora: a.Hora, paciente: a.Paciente, profissional: a.Profissional, tipo: a.Tipo === 'sessão' ? '' : (a.Tipo || ''), confirmado: conf ? { por: 'simulacao@local', quando: '' } : null, enviado: mockEnviadas[cds + '|' + a.Paciente + '|' + a.Profissional] || null });
        });
      }
      var gsC = ordC.map(function (k) { var g = grp[k]; g.pacientes = g.itens.map(function (x) { return x.paciente; }).filter(function (x, j, a) { return a.indexOf(x) === j; }); g.aConfirmar = g.itens.filter(function (x) { return !x.confirmado; }).length;
        g.mensagem = Mensagens.confirmacao('', g.pagador, g.itens); return g; });
      return res({ ok: true, de: d.de, ate: d.ate || d.de, grupos: gsC, modelo: '', total: gsC.reduce(function (n, g) { return n + g.itens.length; }, 0) }); }
    if (nome === 'marcarMensagemEnviada') { (d.itens || []).forEach(function (x) { mockEnviadas[(d.competencia ? '' : x.data + '|') + x.paciente + '|' + x.profissional + (d.competencia ? '|' + d.competencia : '')] = { por: 'simulacao@local', quando: hojeStr() + ' ' + agoraHora() }; }); return res({ ok: true, n: (d.itens || []).length, por: 'simulacao@local', quando: hojeStr() + ' ' + agoraHora() }); }
    if (nome === 'salvarWhats') { var dg = String(d.whats || '').replace(/\D/g, ''); if (dg.length < 10 || dg.length > 11) return res({ ok: false, erros: ['WhatsApp inválido: DDD + número, ex.: (32) 9 9999-9999.'] }); (d.pacientes || []).forEach(function (p) { mockWhats[p] = mascaraFone(dg); }); return res({ ok: true, salvos: d.pacientes, fone: '55' + dg, foneFmt: mascaraFone(dg) }); }
    if (nome === 'confirmar') { mockDia.push({ id: 'D-c' + mockDia.length, data: d.data, hora: d.hora, paciente: d.paciente, profissional: d.profissional, origem: 'Confirmado' }); return res({ ok: true }); }
    if (nome === 'removerDoDia') { mockDia = mockDia.filter(function (x) { return x.id !== d.id; }); return res({ ok: true }); }
    if (nome === 'lerCadastro') { var pc = (AT ? AT.pacientes : []).filter(function (p) { return p.nome === d.nome; })[0]; if (!pc) return res({ ok: false, erros: ['Paciente não encontrado em Pacientes.'] }); return res({ ok: true, nome: pc.nome, nasc: pc.nasc, cpfFinal: String(pc.cpf || '').replace(/\D/g, '').slice(-4), indicacao: '', primeira: '', campos: { convenio: pc.convenio, carteirinha: '', obsCobranca: pc.obsCobranca, pagador: pc.pagador, whats: '', telPac: pc.telPac || '', profRef: '', pagadorCpf: '', respNome: pc.resp || '', respPar: pc.respPar || '', respTel: '', respCpf: '' } }); }
    if (nome === 'cobrancasDoPaciente') return res({ ok: true, linhas: mockCPP.filter(function (l) { return l.paciente === d.nome; }).map(function (l) { var x = Cobranca.linhaDe(l); x.linha = l.linha; x.resumo = Cobranca.resumoLinha(l); return x; }), valores: mockValores });
    if (nome === 'salvarCobrancaProf') { var ex2 = d.id ? mockCPP.filter(function (l) { return l.id === d.id; })[0] : null; var nv = { id: d.id || ('C-' + (mockCPP.length + 1)), paciente: d.paciente, profissional: d.profissional, ativo: d.ativo === false ? 'Não' : 'Sim', cobranca: d.cobranca, convenio: d.convenio || '', valorSessao: d.valorSessao === '' ? null : num(d.valorSessao), valorMensal: d.valorMensal === '' ? null : num(d.valorMensal), pagamento: d.pagamento, desde: d.desde || '', ate: d.ate || '', decididoPor: d.decididoPor, decididoEm: hojeStr(), obs: d.obs || '', linha: ex2 ? ex2.linha : mockCPP.length + 2 }; if (ex2) Object.assign(ex2, nv); else mockCPP.push(nv); if (AT) AT.cobrancas = mockCPP.slice(); return res({ ok: true, id: nv.id, alterados: ['linha'] }); }
    if (nome === 'cobrancaMes') { var ch = d.chave || Cobranca.chaveMes(hoje), itens2 = []; mockCPP.forEach(function (l0) { var l = Cobranca.linhaDe(l0); if (!(l.pagamento === 'Antecipado' || l.pagamento === 'Posterior' || l.cobranca === 'Mensalidade fixa')) return; var c = mockComp(l, ch), sit = Cobranca.situacaoCompetencia(l, c, hoje, mockParams), v = l.cobranca === 'Mensalidade fixa' ? l.valorMensal : l.valorSessao, nAb = c.abatimentos.length, sc = c.sessoes != null ? Math.max(0, c.sessoes - nAb) : null, p = mockPacientes.filter(function (x) { return x.nome === l.paciente; })[0] || {};
        itens2.push({ paciente: l.paciente, profissional: l.profissional, id: l.id, cobranca: l.cobranca, pagamento: l.pagamento, valor: v, valorMes: l.cobranca === 'Mensalidade fixa' ? l.valorMensal : (c.valorCobrado != null ? c.valorCobrado : (l.pagamento === 'Posterior' ? null : (v != null && sc != null ? v * sc : null))), sessoes: c.sessoes, sessoesCobradas: sc, abatimentos: c.abatimentos, valorCobradoEditado: c.valorCobrado != null, pago: c.pago, data: c.data, forma: c.forma, nf: c.nf, recebido: c.recebido, atendidas: c.atendidas, aReceber: c.aReceber, situacao: sit.sit, cor: sit.cor, situacaoTxt: sit.txt, pagador: p.pagador || '', obs: l.obs, decidido: l.decididoPor, rotulo: Cobranca.resumoLinha(l), fone: Mensagens.fone(mockWhats[l.paciente]), foneFmt: mockWhats[l.paciente] || '', foneDe: mockWhats[l.paciente] ? 'pagador' : '', cobrado: mockEnviadas[l.paciente + '|' + l.profissional + '|' + ch] || null }); });
      itens2.sort(function (a, b) { return a.paciente.localeCompare(b.paciente); }); return res({ ok: true, chave: ch, itens: itens2, competencias: ['Outubro/2026', 'Novembro/2026'], colunasExistem: true, proximaChave: Cobranca.proximaCompetencia(ch), proximaExiste: false, hoje: hojeStr(), params: mockParams }); }
    if (nome === 'registrarPagamentoMes') { (d.competencias || []).forEach(function (ch) { mockPagos[d.paciente + '|' + d.profissional + '|' + ch] = { pago: d.parcial ? 'Parcial' : 'Sim', data: d.data, forma: d.forma, nf: d.nf || 'Não', recebido: d.parcial ? num(d.valor) : 0 }; mockReg.forEach(function (r) { if (r.paciente === d.paciente && r.profissional === d.profissional && r.pago === 'Não' && Cobranca.chaveMes(dataObj(r.data)) === ch) { r.pago = 'Sim'; r.forma = d.forma; } }); }); if (AT) AT.competencias = mockComps(); return res({ ok: true, feitos: (d.competencias || []).map(function (ch) { return { chave: ch, id: 'A-sim-pg', linha: 60, aba: MESES_PT[hoje.getMonth()], valor: num(d.valor) }; }) }); }
    if (nome === 'editarSessoesCompetencia') { mockMens[d.paciente + '|' + d.profissional + '|' + d.chave] = { sessoes: d.sessoes === '' ? null : num(d.sessoes), valorCobrado: d.valorCobrado === '' || d.valorCobrado == null ? null : num(d.valorCobrado) }; if (AT) AT.competencias = mockComps(); return res({ ok: true }); }
    if (nome === 'criarColunasMes') return res({ ok: true, chave: d.chave, colunas: [] });
    if (nome === 'decidirFalta') { var rg = mockReg.filter(function (x) { return x.id === d.id; })[0]; if (rg) { rg.decisao = d.decisao; rg.obs = (rg.obs ? rg.obs + ' | ' : '') + 'Decisão da gestão: ' + d.decisao; } mockDecisoes[d.id] = d.decisao; var tx = null; if (d.decisao === 'cobrar taxa de falta') { tx = { id: 'A-sim-tx' + mockReg.length, valor: 35 }; mockReg.push({ paciente: rg ? rg.paciente : '?', profissional: rg ? rg.profissional : '', oque: 'Atendido', data: rg ? rg.data : hojeStr(), procedimento: 'Taxa de falta – psicologia', id: tx.id, valor: 35, pago: 'Não', forma: '', nf: 'Não', guia: '', convenio: 'Particular', obs: 'Taxa de falta' }); } return res({ ok: true, id: d.id, decisao: d.decisao, taxa: tx }); }
    if (nome === 'aplicarAlteracoesLote') return res({ ok: true, feitos: (d.itens || []).map(function (i) { return i.nome; }), erros: [] });
    if (nome === 'atualizarCadastro') return res({ ok: true, alterados: Object.keys(d.campos || {}).slice(0, 2) });
    if (nome === 'criarAbaMes') return res({ ok: true, aba: d.nome, modelo: 'Outubro' });
    if (nome === 'exportarMes') return res({ ok: true, nome: 'OUT 26 - Recepção atendimentos (app)', url: '#drive', xlsx: '#xlsx', linhas: 12, pasta: 'Controle Financeiro/2026/10 Out_26/2_Atendimentos', criadas: [], aviso: '', atualizado: '05/10/2026 12:00' });
    if (nome === 'gestaoResumo') { var mesN = d.mes || MESES_PT[hoje.getMonth()], regsM = mockReg.filter(function (r) { return MESES_PT[(dataObj(r.data) || hoje).getMonth()] === mesN; }).map(function (r) { return Object.assign({ aba: mesN, linha: 0 }, r); });
      var faltasM = regsM.filter(function (r) { return /^(Faltou|Desmarcou)/.test(r.oque); }).concat([{ aba: mesN, id: 'A-sim-g4', data: '05/' + ('0' + (hoje.getMonth() + 1)).slice(-2) + '/2026', hora: '10:00', paciente: 'Pedro Augusto Neves', profissional: 'Juliana Ribeiro', oque: 'Faltou sem aviso', obs: 'Falta/desmarcação — não apareceu, não atendeu o telefone', detalhe: 'não apareceu, não atendeu o telefone', decisao: mockDecisoes['A-sim-g4'] || '' }, { aba: mesN, id: 'A-sim-g9', data: '07/' + ('0' + (hoje.getMonth() + 1)).slice(-2) + '/2026', hora: '15:00', paciente: 'Lívia Fontes Pereira', profissional: 'Juliana Ribeiro', oque: 'Faltou avisando em cima da hora (< 24h)', obs: 'Falta/desmarcação — avisou às 7h que o filho acordou com febre', detalhe: 'avisou às 7h que o filho acordou com febre', decisao: mockDecisoes['A-sim-g9'] || '' }]);
      return res({ ok: true, mes: mesN, abaExiste: true, total: 40 + regsM.length, atendidos: 35, recebido: 3120, pagamentoPendente: [{ id: 'A-sim-g1', data: hojeStr(), hora: '09:00', paciente: 'Beatriz Almeida Rocha', profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia', valor: 120, pago: '', obs: '' }].concat(regsM.filter(function (r) { return r.pago === 'Não'; })), nfPendente: [{ id: 'A-sim-g2', data: hojeStr(), hora: '', paciente: 'Marcos Vinícius Tavares', valor: 100, forma: 'Pix', quem: '', nf: 'Não', pago: 'Sim' }], semGuia: [{ id: 'A-sim-g3', data: hojeStr(), hora: '10:00', paciente: 'Pedro Augusto Neves', convenio: 'Cedplan', profissional: 'Juliana Ribeiro', guia: '', pdfNaPasta: 'não' }, { id: 'A-sim-t1', data: '09/10/2026', hora: '15:00', paciente: 'Theo Barreto Lima', convenio: 'Cedplan', profissional: 'Juliana Ribeiro', guia: '', pdfNaPasta: 'sim', pdfArquivo: '09-10 foto escura.jpg' }], guiasAConferir: window.__RECEPCAO ? [] : mockGuias.filter(function (g) { return !g._fim && /baixa_confianca|sem_atendimento|nao_e_guia/.test(g.status); }), faltas: faltasM, cadastroIncompleto: [{ paciente: 'Helena Vasconcelos Prado', profissional: 'Dr. Victor Cunha', data: hojeStr(), id: 'A-sim-g10', pago: 'Sim', valor: 200 }], descontos: [], extras: [], pagadorDiferente: [{ id: 'A-sim-g6', data: hojeStr(), hora: '', paciente: 'Helena Vasconcelos Prado', quem: 'Avó', valor: 200, nf: 'Sim' }], perdidos: window.__RECEPCAO ? [] : [{ id: 'A-sim-g8', data: '25/09/2026', hora: '13:00', paciente: 'Pedro Augusto Neves', profissional: 'Juliana Ribeiro', convenio: 'Cedplan', valor: 40, pago: 'Perdido / glosa', obs: 'PERDIDO / glosa: guia não autorizada pelo convênio' }], alteracoes: [{ quando: '05/11/2026 09:12', paciente: 'Yandra Duarte Pires', campo: 'Convênio', de: '', para: 'Sabin Sinai', quem: 'carteirinha apresentada', por: 'simulacao@local' }], mesesExistentes: ['Setembro', 'Outubro', 'Novembro'], competencias: ['Outubro/2026', 'Novembro/2026'], semConvenio: [], virada: { mes: mesN, modo: 'app', formulas: [], viradaEm: '10/10/2026 15:00' } }); }
    if (nome === 'virarAbaMes') { window.__VIRADO = true; return res({ ok: true, mes: d.mes, linhas: 419, faixas: 'F2:H e N2:N', diferencas: 0, texto: d.mes + ' · virada para o app' }); }
    if (nome === 'linhasAbertasPaciente') return res({ ok: true, aba: 'Outubro', paciente: d.nome, convenio: 'Cedplan', modalidade: 'Convênio', linhas: [] });
    if (nome === 'atualizarLinhasDoCadastro') return res({ ok: true, aba: 'Outubro', atualizadas: d.ids });
    if (nome === 'lancamentos') { var ml = mockReg.map(function (r) { return Object.assign({ aba: MESES_PT[(dataObj(r.data) || hoje).getMonth()], linha: 12, dataPag: '', quem: '', saldo: r.pago === 'Não' ? r.valor : 0 }, r); }); var qn = (d.paciente || '').toLowerCase(); return res({ ok: true, linhas: ml.filter(function (x) { return !qn || x.paciente.toLowerCase().indexOf(qn) >= 0; }), total: ml.length }); }
    if (nome === 'corrigirLancamento') { var mr = mockReg.filter(function (x) { return x.id === d.id; })[0], cc = d.campos || {}, alt = []; ['pago', 'forma', 'nf', 'guia', 'nfNumero'].forEach(function (k) { if (cc[k] != null && (!mr || cc[k] !== mr[k === 'nfNumero' ? 'nfN' : k])) { if (mr) mr[k === 'nfNumero' ? 'nfN' : k] = cc[k]; alt.push(k); } }); if (cc.recebidoAgora && mr) { mr.pago = 'Sim'; mr.forma = cc.forma || ''; alt.push('Pago?'); } if (cc.observacao) alt.push('Observação'); if (!alt.length) return res({ ok: false, erros: ['Nada mudou: os campos já estavam assim.'] }); if (/^A-sim-p/.test(d.id)) mockPendOk.push(d.id); return res({ ok: true, id: d.id, aba: d.aba, linha: 41, alterados: alt, novos: cc, plano: null }); }
    if (nome === 'parcelamentos' || nome === 'criarParcelamento' || nome === 'pagarParcela' || nome === 'cancelarParcelamento') return res(mockParcelas(nome, d));
    if (nome === 'aReceber' || nome === 'darComoPerdido' || nome === 'perdasAno') return res(mockAReceber(nome, d));
    if (nome === 'conciliacao' || nome === 'conciliar' || nome === 'importarExtrato' || nome === 'importarVendasCartao') return res(mockConc(nome, d));
    if (nome === 'repasseMes') { var RG = window.__mockRegras = window.__mockRegras || [{ linha: 2, ativa: true, profissional: 'Juliana Ribeiro', convenio: 'Particular', procedimento: '', pct: 80, valorRef: 0, obs: '' }, { linha: 3, ativa: true, profissional: 'Giovana Grossi', convenio: 'Qualquer', procedimento: '', pct: 0, valorRef: 0, obs: 'estagiária' }];
      var LR = [{ data: '02/10/2026', paciente: 'Beatriz Almeida Rocha', profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia', convenio: 'Particular', pago: 'Sim', valor: 120, situacao: 'pago', pct: 80, basePago: 120, basePrev: 120, repassePago: 96, repassePrev: 96, oque: 'Atendido' }];
      var POR = {}; LR.forEach(function (x) { var q = POR[x.profissional] = POR[x.profissional] || { profissional: x.profissional, sessoes: 0, basePago: 0, repassePago: 0, basePrev: 0, repassePrev: 0, semRegra: 0, perdido: 0, desconto: 0, descontoObs: '', porConvenio: [] }; q.sessoes++; q.basePago += x.basePago; q.repassePago += x.repassePago; q.basePrev += x.basePrev; q.repassePrev += x.repassePrev; q.porConvenio.push({ convenio: x.convenio, pct: x.pct, sessoes: 1 }); q.liquidoPago = q.repassePago; q.liquidoPrev = q.repassePrev; });
      return res({ ok: true, mes: d.mes, abaExiste: true, regras: RG, linhas: LR, porProfissional: Object.keys(POR).map(function (k) { return POR[k]; }), semRegra: 0, atualizado: hojeStr() + ' ' + agoraHora() }); }
    if (nome === 'salvarRegrasRepasse') { window.__mockRegras = (d.regras || []).map(function (g, i) { return Object.assign({}, g, { linha: i + 2, pct: g.pct === '' ? null : num(String(g.pct)), valorRef: num(g.valorRef) || 0, ativa: g.ativa !== false }); }); return res({ ok: true, alteradas: d.regras.length, regras: window.__mockRegras }); }
    if (nome === 'criarPaciente') {
      var dup = Duplicatas.verificar(d, mockBase);
      if (dup.bloqueio) return res({ ok: false, erros: ['CPF já cadastrado: ' + dup.bloqueio.paciente.nome] });
      if (!d.confirmouDuplicata && dup.avisos.length) return res({ ok: false, precisaConfirmar: true, avisos: dup.avisos.map(function (a) { return { nome: a.paciente.nome, nasc: a.paciente.nasc, pagador: a.paciente.pagador, modalidade: '', motivos: a.motivos }; }) });
      mockBase.push({ linha: mockBase.length + 2, nome: d.nome, cpf: d.cpf, nasc: d.nasc, pagador: d.pagador, convenio: d.convenio, ativo: 'Sim' });
      return res({ ok: true, linha: mockBase.length + 1, nome: d.nome, colunasCriadas: [] });
    }
    res({});
  }, 300); });
}
/*__MOCK_FIM__*/

/* ---------- estado global ---------- */
var BOOT = null, AT = null;
var DIAS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
var MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
var ESP_KEYS = [['psicopedagog', 'Psicopedagogia'], ['psican', 'Psicanálise'], ['psicolog', 'Psicologia'], ['pediatr', 'Pediatria'], ['gineco', 'Ginecologia e obstetrícia'], ['clinic', 'Clínica geral'], ['clínic', 'Clínica geral'], ['nutri', 'Nutrição'], ['aba', 'Terapia ABA']];
function ehGestao() { return !!(BOOT && BOOT.usuario && BOOT.usuario.perfil === 'gestao'); }
function quemSou() { return ehGestao() ? 'Gestão' : 'Recepção'; }

/* ---------- formatos, máscaras ---------- */
function num(v) { if (v == null || v === '') return null; var n = Number(String(v).replace(/\./g, '').replace(',', '.')); return isNaN(n) ? null : n; }
function brl(n) { return n == null ? '' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function brlCurto(n) { n = Number(n) || 0; return 'R$ ' + (n % 1 ? brl(n) : n.toLocaleString('pt-BR')); }
function hojeStr() { var d = new Date(); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
function agoraHora() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
function mascaraCPF(v) { v = v.replace(/\D/g, '').slice(0, 11); return v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); }
function mascaraData(v) { v = v.replace(/\D/g, '').slice(0, 8); return v.replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2'); }
function mascaraHora(v) { v = v.replace(/\D/g, '').slice(0, 4); return v.length > 2 ? v.slice(0, 2) + ':' + v.slice(2) : v; }
function mascaraFone(v) { v = v.replace(/\D/g, '').slice(0, 11); if (v.length <= 2) return v; if (v.length <= 6) return '(' + v.slice(0, 2) + ') ' + v.slice(2); if (v.length <= 10) return '(' + v.slice(0, 2) + ') ' + v.slice(2, 6) + '-' + v.slice(6); return '(' + v.slice(0, 2) + ') ' + v.slice(2, 3) + ' ' + v.slice(3, 7) + '-' + v.slice(7); }
function dataValida(s) { var m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (!m) return false; var d = new Date(+m[3], +m[2] - 1, +m[1]); return d.getFullYear() == +m[3] && d.getMonth() == +m[2] - 1 && d.getDate() == +m[1] && d <= new Date(); }
function dataObj(s) { var m = (s || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; }
function isoParaBR(v) { var m = (v || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function dataParaISO(dt) { return dt.getFullYear() + '-' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + dt.getDate()).slice(-2); }
function venceu(ddmmaaaa) { var m = (ddmmaaaa || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (!m) return false; return new Date(+m[3], +m[2] - 1, +m[1], 23, 59) < new Date(); }
function idade(nasc) { var d = dataObj(nasc); if (!d) return ''; var h = new Date(), a = h.getFullYear() - d.getFullYear(); if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) a--; return a >= 0 ? a + ' anos' : ''; }
function pick(lista, prefixo) { var o = (lista || []).filter(function (x) { return x.toLowerCase().indexOf(prefixo.toLowerCase()) === 0; })[0]; return o || ''; }
function preencherSelect(sel, itens, vazio) { sel.innerHTML = ''; if (vazio) { var o0 = document.createElement('option'); o0.value = ''; o0.textContent = vazio; sel.appendChild(o0); } itens.forEach(function (x) { var o = document.createElement('option'); o.value = x.nome || x; o.textContent = x.nome ? x.nome + (x.especialidade ? ' · ' + x.especialidade : '') : x; sel.appendChild(o); }); }
function setSel(sel, v) { v = v || ''; sel.value = v; if (sel.value !== v) { var o = document.createElement('option'); o.value = v; o.textContent = v + (v ? ' (fora da lista)' : ''); sel.appendChild(o); sel.value = v; } }
function seg(root, valor) { $$('button', root).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === valor)); }); }
function primeiroNome(n) { return String(n || '').replace(/^Dra?\. /, '').split(' ')[0]; }
function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }

/* ---------- cadastro: Cobrança por profissional (Fase 1, 15/10) ----------
   A cobrança é por paciente × profissional (aba "Cobrança por profissional"), não por paciente. As frases do bloco
   "O que fazer agora" vêm do módulo compartilhado `Cobranca` (o mesmo do servidor); a tela só desenha. */
function pacInfo(nome) { return (AT && AT.pacientes.filter(function (p) { return p.nome === nome; })[0]) || null; }
function ehConvenio(p) { return !!(p && p.convenio && p.convenio !== 'Particular'); }
function profInfo(nome) { return (BOOT && BOOT.profissionais || []).filter(function (x) { return x.nome === nome; })[0] || null; }
function espDoProf(nome) { var p = profInfo(nome); return p ? (p.esp || p.especialidade || '') : ''; }
function valoresDaEsp(esp) { return (BOOT && BOOT.valores || []).filter(function (v) { return v.ativo !== false && v.especialidade === esp; }); }
function valorCheio(esp) { var l = valoresDaEsp(esp); if (!l.length) return null; var ch = l.filter(function (v) { return /cheio/i.test(v.nome); })[0]; return ch ? ch.valor : Math.max.apply(null, l.map(function (v) { return v.valor; })); }
function linhasDe(nome, data) { return Cobranca.linhasDoPaciente(AT ? AT.cobrancas : [], nome, data || new Date()); }
function linhaVigente(nome, prof, data) { return Cobranca.linhaVigente(AT ? AT.cobrancas : [], nome, prof, data || new Date()); }
function competenciaDe(nome, prof, data) { var ch = Cobranca.chaveMes(data || new Date()); return ((AT && AT.competencias || {})[nome + '|' + prof] || {})[ch] || null; }
// o bloco "O que fazer agora" calculado na tela (Registrar recalcula ao trocar o profissional sem ir ao servidor)
function blocoDe(nome, prof, data, procedimento, oque) {
  var p = pacInfo(nome), v = linhaVigente(nome, prof, data), esp = espDoProf(prof);
  return Cobranca.calcular({ linha: v.linha, profissional: prof, especialidade: esp, valorCheio: valorCheio(esp), procedimento: procedimento, oque: oque, competencia: v.linha ? competenciaDe(nome, prof, data) : null, hoje: data || new Date(), params: BOOT ? BOOT.params : null, pagador: p ? p.pagador : '', avisoLinha: v.aviso, convenioPaciente: p ? p.convenio : '' });
}
function cadastroIncompleto(p) { return !!p && !linhasDe(p.nome).length && !ehConvenio(p); }
// CPF e nascimento não são obrigatórios (gestão, 08/10), mas a recepção é avisada pra completar
function faltasDoc(p) { var f = []; if (p && !String(p.cpf || '').replace(/\D/g, '')) f.push('CPF'); if (p && !String(p.nasc || '').trim()) f.push('data de nascimento'); return f; }
function faltasDocTxt(p) { return faltasDoc(p).join(' e '); }
// resumo do cadastro: "Juliana: sessão R$ 80, antecipado · Giovana: pro bono"
function resumoCadastro(p) { if (!p) return ''; var l = linhasDe(p.nome).map(Cobranca.resumoLinha); return l.length ? l.join(' · ') : (ehConvenio(p) ? 'Convênio ' + p.convenio + ' (sem linha por profissional)' : 'sem cobrança cadastrada · cobra pela tabela'); }
var COR_FAIXA = { amarelo: 'amarela', azul: 'azul', verde: 'verde', vermelho: 'vermelha', cinza: 'cinza', laranja: 'laranja' };
var ICONE_BLOCO = { amarelo: 'cobrar', azul: 'calendario', verde: 'check', vermelho: 'bloqueio', cinza: 'info', laranja: 'alerta' };
// o bloco grande (Registrar) e o pequeno (painel da Agenda)
function blocoHtml(b, pequeno) {
  if (!b) return '';
  var cor = COR_FAIXA[b.cor] || 'cinza', icn = ic(ICONE_BLOCO[b.cor] || 'info', pequeno ? 22 : 34, b.cor === 'verde' ? 3 : 2.4);
  return '<div class="bloco-agora ' + cor + (pequeno ? ' p' : '') + '">' + icn + '<div class="corpo"><div class="frase">' + esc(b.frase) + '</div>' + (b.apoio ? '<div class="apoio">' + esc(b.apoio) + '</div>' : '') +
    (b.obsLinha ? '<div class="obs"><em>' + esc(b.obsLinha) + '</em></div>' : '') + (b.decidido ? '<div class="dec">' + esc(b.decidido) + '</div>' : '') + (b.aviso ? '<div class="aviso">' + esc(b.aviso) + '</div>' : '') + '</div></div>';
}
function tagsDe(p) {
  var t = []; if (!p) return t;
  if (ehConvenio(p)) t.push({ cor: 'lilas', txt: 'Convênio ' + p.convenio });
  if (cadastroIncompleto(p)) t.push({ cor: 'laranja', ic: 'alerta', txt: 'sem cobrança cadastrada · cadastre em Pacientes' });
  if (faltasDoc(p).length) t.push({ cor: 'laranja', ic: 'alerta', txt: 'sem ' + faltasDocTxt(p) + ' · completar cadastro' });
  return t;
}
function tagHtml(t, p) { return '<span class="tag ' + (p ? 'p ' : '') + t.cor + '">' + (t.ic ? ic(t.ic, 13, 2.5) : '') + esc(t.txt) + '</span>'; }
// sessões de mensalidade/antecipado/convênio não entram nas pendências de pagamento
function pendentePagamento(r) { return (r.pago === '' || r.pago === 'Não' || r.pago === 'Parcial') && (!/^Mensalidade|^Antecipado|plano|mensal|convênio|AAPI/i.test(r.procedimento) || /\(compra\)/i.test(r.procedimento)); }
// procedimento pela cobrança do profissional: convênio usa a variante "– convênio"; o resto usa o procedimento base
function derivarProc(base, p, prof) {
  var l = AT.procedimentos, cands = l.filter(function (q) { return q.nome.indexOf(base + ' – ') === 0; });
  if (!cands.length || !p) return base;
  var v = linhaVigente(p.nome, prof || '', new Date()).linha, chave = v && v.cobranca === 'Convênio' ? 'convênio' : '';
  var c = chave ? cands.filter(function (q) { return q.nome.toLowerCase().indexOf(chave) >= 0; })[0] : null;
  return c ? c.nome : base;
}
function espsDoProf(nome) { var pr = profInfo(nome); if (!pr) return []; var e = String(pr.especialidade || '').toLowerCase(), out = []; ESP_KEYS.forEach(function (k) { if (e.indexOf(k[0]) >= 0 && out.indexOf(k[1]) < 0) out.push(k[1]); }); return out; }
function procsDe(esps) { return AT.procedimentos.filter(function (p) { return !esps.length || esps.indexOf(p.especialidade) >= 0; }); }
function ehVariante(p, lista) { var i = p.nome.indexOf(' – '); if (i < 0) return false; var base = p.nome.slice(0, i); return lista.some(function (q) { return q.nome === base; }); }
function tiposDe(esps) { var l = procsDe(esps); return l.filter(function (p) { return !ehVariante(p, l) && !/\(compra\)/.test(p.nome) && !/^Mensalidade|^Renovação|^Antecipado|^Taxa de falta/.test(p.nome); }); }
function procObj(nome) { return AT.procedimentos.filter(function (p) { return p.nome === nome; })[0] || null; }
function tipoCurto(it) { var t = String(it.tipo || '').trim(); if (t) return t.toLowerCase(); var o = String(it.origem || ''); if (/Primeira consulta|Retorno|Aplicação de teste|Encaixe|Reposição|Avulso/i.test(o)) return o.toLowerCase(); var esp = espDoProf(it.profissional); return /Psicolog|Psican|ABA|Psicopedag/i.test(esp) ? 'sessão' : 'consulta'; }
// lista própria de pacientes (no lugar do datalist nativo): busca por nome ou pagador, setas, Enter, clique
function comboPacientes(input, aoEscolher) {
  var box = el('<div class="combo-lista" hidden role="listbox"></div>'), idx = -1, itens = [];
  input.parentNode.insertBefore(box, input.nextSibling); input.setAttribute('autocomplete', 'off'); input.removeAttribute('list');
  function fechar() { box.hidden = true; box.innerHTML = ''; idx = -1; itens = []; }
  function render() {
    var q = semAcento(input.value.trim()); if (!q || !AT) return fechar();
    itens = AT.pacientes.filter(function (p) { return !/^n/i.test(p.ativo || 'Sim') && (semAcento(p.nome).indexOf(q) >= 0 || (p.pagador && semAcento(p.pagador).indexOf(q) >= 0)); }).slice(0, 8);
    if (!itens.length) { box.innerHTML = '<div class="combo-vazio">Ninguém com “' + esc(input.value.trim()) + '” em Pacientes</div>'; box.hidden = false; return; }
    box.innerHTML = itens.map(function (p, i) { return '<div class="combo-item' + (i === idx ? ' ativo' : '') + '" role="option" data-i="' + i + '"><b>' + esc(p.nome) + '</b><span>' + esc([p.nasc ? idade(p.nasc) : '', p.pagador && p.pagador !== p.nome ? 'pagador: ' + p.pagador : ''].filter(Boolean).join(' · ')) + '</span></div>'; }).join('');
    $$('.combo-item', box).forEach(function (d) { d.addEventListener('mousedown', function (e) { e.preventDefault(); escolher(+d.dataset.i); }); });
    box.hidden = false;
  }
  function escolher(i) { var p = itens[i]; if (!p) return; input.value = p.nome; fechar(); if (aoEscolher) aoEscolher(p); }
  input.addEventListener('input', function () { idx = -1; render(); });
  input.addEventListener('focus', render);
  input.addEventListener('blur', function () { setTimeout(fechar, 150); });
  input.addEventListener('keydown', function (e) {
    if (box.hidden) { if (e.key === 'ArrowDown') { render(); } return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(itens.length - 1, idx + 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(0, idx - 1); render(); }
    else if (e.key === 'Enter') { if (itens.length) { e.preventDefault(); escolher(idx < 0 ? 0 : idx); } }
    else if (e.key === 'Escape') fechar();
  });
  return { fechar: fechar };
}
function semAcento(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

/* ---------- navegação ---------- */
/* ---------- correção de um lançamento já gravado na aba do mês (gestão e recepção usam o mesmo formulário) ---------- */
// reg: { id, oque, pago, forma, nf, nfN, guia, quem, valor, convenio, dataPag } · foco: 'pag' | 'nf' | 'guia' | 'obs' | 'todos'
// Pago? = "Perdido / glosa" (gestão, 10/10): fora de a receber, guias e receita; só a gestão marca, com o motivo
var PAGO_PERDIDO = 'Perdido / glosa';
function ehPerdido(pago) { return /^Perdido/i.test(String(pago || '').trim()); }
function ehConvReg(reg, p) { return !!((p && ehConvenio(p)) || (reg.convenio && !/^Particular$/i.test(reg.convenio)) || /^Convênio/.test(reg.pago || '')); }
function saldoReg(reg) { var v = Number(reg.valor) || 0; return reg.pago === 'Parcial' ? Math.max(0, Math.round((v - (Number(reg.recebido) || 0)) * 100) / 100) : v; }
// foco 'pag' = receber (total ou parcial; gestão 07/10) · 'amplo' = corrigir tudo da linha (data, profissional, valores…) · 'nf' / 'guia' / 'obs' / 'todos' = campos de cobrança
function corrigirForm(reg, foco, p) {
  var atendido = /^Atendido/.test(reg.oque || 'Atendido'), conv = ehConvReg(reg, p), html = '<div class="grid g2 corr">';
  var forma = '<label class="campo" data-sim>Forma<select data-c="forma"></select></label>';
  var quem = '<label class="campo" data-sim>Quem pagou<input data-c="quemPagou" list="dl-pagadores" autocomplete="off" value="' + esc(reg.quem || (p ? (p.pagador || p.nome) : '')) + '"></label>';
  var nf = '<label class="campo" data-sim>NF emitida?<select data-c="nf"><option>Sim</option><option>Não</option><option>Não se aplica</option></select></label><label class="campo" data-sim>Nº da NF<input data-c="nfNumero" autocomplete="off" value="' + (foco === 'pag' ? '' : esc(reg.nfN || '')) + '"></label>';
  if (foco === 'pag') {
    var sal = saldoReg(reg);
    html += '<div class="c2 muted" data-resumo>Sessão ' + (reg.valor ? 'R$ ' + brl(reg.valor) : 'sem valor') + (reg.pago === 'Parcial' ? ' · já recebido R$ ' + brl(reg.recebido) + ' · <b>em aberto R$ ' + brl(sal) + '</b>' : '') + '. Recebeu menos que o total? O resto continua em aberto.</div>' +
      '<label class="campo">Valor recebido agora<div class="campo-wrap"><span class="prefixo">R$</span><input data-c="recebidoAgora" class="dinheiro" inputmode="decimal" value="' + (sal ? brl(sal) : '') + '"></div></label>' +
      '<label class="campo">Data do pagamento<input data-c="dataPagamento" inputmode="numeric" maxlength="10" value="' + esc(hojeStr()) + '"></label>' + forma + quem + nf;
  } else {
    if (foco === 'amplo') {
      var prOpts = (AT && AT.procedimentos || []).map(function (x) { return x.nome; }); if (prOpts.indexOf(reg.procedimento || '') < 0) prOpts.unshift(reg.procedimento || ''); // procedimento vazio fica vazio (não vira o 1º da lista)
      var oqOpts = (BOOT.listas.oque || []).slice(); if (reg.oque && oqOpts.indexOf(reg.oque) < 0) oqOpts.unshift(reg.oque);
      var sel = function (k, opts, atual) { return '<select data-c="' + k + '">' + opts.map(function (o) { return '<option' + (o === atual ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>'; };
      html += '<div class="c2 faixa nota">Lançou por engano (duplicado, paciente errado)? <button type="button" class="btn link" data-engano>Marcar como lançado por engano</button> A linha vira "Cancelado pela clínica" (nada é apagado) e, se for sessão de plano, a consulta volta pro plano.</div>';
      html += '<label class="campo">Data<input data-c="data" inputmode="numeric" maxlength="10" value="' + esc(reg.data || '') + '"></label><label class="campo">Hora<input data-c="hora" inputmode="numeric" maxlength="5" value="' + esc(reg.hora || '') + '"></label>' +
        '<label class="campo c2">Paciente<input data-c="paciente" list="dl-pacientes" autocomplete="off" value="' + esc(reg.paciente || '') + '"></label>' +
        '<label class="campo">Profissional' + sel('profissional', (BOOT.profissionais || []).map(function (x) { return x.nome; }).concat(reg.profissional && !(BOOT.profissionais || []).some(function (x) { return x.nome === reg.profissional; }) ? [reg.profissional] : []), reg.profissional) + '</label>' +
        '<label class="campo">O que aconteceu' + sel('oque', oqOpts, reg.oque) + '</label>' +
        '<label class="campo c2">Procedimento' + sel('procedimento', prOpts, reg.procedimento) + '</label>' +
        '<label class="campo">Valor da sessão<div class="campo-wrap"><span class="prefixo">R$</span><input data-c="valor" class="dinheiro" inputmode="decimal" value="' + (reg.valor !== '' && reg.valor != null ? brl(reg.valor) : '') + '"></div></label>';
      // convênio e modalidade ficam gravados na linha (copiados do cadastro ao salvar); trocar aqui fica registrado
      var opc = function (lista, atual) { var l = (lista || []).slice(); if (atual && l.indexOf(atual) < 0) l.unshift(atual); return [''].concat(l); };
      var selC = function (k, opts, atual) { return '<select data-c="' + k + '">' + opts.map(function (o) { return '<option value="' + esc(o) + '"' + (o === (atual || '') ? ' selected' : '') + '>' + esc(o || '(em branco)') + '</option>'; }).join('') + '</select>'; };
      html += '<label class="campo">Convênio da linha' + selC('convenio', opc(BOOT.listas.convenios, reg.convenio), reg.convenio) + '</label>' +
        '<label class="campo">Modalidade da linha' + selC('modalidade', opc(BOOT.listas.modalidades, reg.modalidade), reg.modalidade) + '</label>' +
        '<div class="c2 muted" style="font-size:13px">Convênio e modalidade foram copiados do cadastro quando a sessão foi salva; mudar o cadastro não muda esta linha.' + ' Trocar aqui fica registrado na coluna "Registrado por (app)" e em "Alterações de lançamento".' + '</div>';
    }
    var mostraPago = foco === 'amplo' || (atendido && (foco === 'nf' || foco === 'todos')), mostraGuia = foco === 'guia' || ((foco === 'todos' || foco === 'amplo') && conv);
    var pagoOpts = (BOOT.listas.pago || []).slice(); if (pagoOpts.indexOf('Parcial') < 0) pagoOpts.push('Parcial'); if (reg.pago && pagoOpts.indexOf(reg.pago) < 0) pagoOpts.unshift(reg.pago); if (!reg.pago) pagoOpts.unshift('');
    var pagoIni = foco === 'nf' && (!reg.pago || reg.pago === 'Não') ? 'Sim' : (reg.pago || '');
    if (mostraPago) html += '<label class="campo">Pago?<select data-c="pago">' + pagoOpts.map(function (o) { return '<option value="' + esc(o) + '"' + (o === pagoIni ? ' selected' : '') + '>' + esc(o || '(em branco)') + '</option>'; }).join('') + '</select></label>' +
      '<label class="campo" data-parcial>Valor já recebido<div class="campo-wrap"><span class="prefixo">R$</span><input data-c="valorRecebido" class="dinheiro" inputmode="decimal" value="' + (reg.recebido ? brl(reg.recebido) : '') + '"></div></label>' +
      '<label class="campo c2" data-perdido>Motivo da perda <span class="leg">(obrigatório; o Valor fica como referência do que se perdeu)</span><input data-c="motivoPerdido" autocomplete="off" placeholder="ex.: guia 1504122 não autorizada (trocou de convênio)"></label>' +
      '<label class="campo" data-sim>Data do pagamento<input data-c="dataPagamento" inputmode="numeric" maxlength="10" value="' + esc(reg.dataPag || hojeStr()) + '"></label>' + forma + quem + nf;
    if (mostraGuia) html += '<label class="check forte c2"><input type="checkbox" data-c="guia"' + (reg.guia === 'Sim' ? ' checked' : '') + '> Guia assinada</label>';
    if (foco === 'amplo') html += '<label class="campo c2">Quem informou / motivo <span class="leg">(obrigatório se mudar data, paciente, profissional, procedimento ou valores)</span><input data-c="quemInformou" autocomplete="off" placeholder="ex.: extrato do Pix de 12/09 mostra R$ 80"></label>';
  }
  html += '<label class="campo c2">Acrescentar à observação' + (foco === 'obs' ? '' : ' <span class="leg">(opcional)</span>') + '<input data-c="observacao" autocomplete="off" placeholder="' + (foco === 'obs' ? 'ex.: taxa de falta — cobrar no próximo atendimento (gestão)' : 'ex.: pagou depois, por Pix') + '"></label></div>';
  var box = el('<div>' + html + '</div>');
  var fSel = $('[data-c=forma]', box); if (fSel) { preencherSelect(fSel, BOOT.listas.formas || [], '—'); setSel(fSel, foco === 'pag' ? '' : (reg.forma || '')); }
  var nfSel = $('[data-c=nf]', box); if (nfSel) setSel(nfSel, foco === 'nf' ? 'Sim' : foco === 'pag' ? 'Não' : (reg.nf || 'Não'));
  var pSel = $('[data-c=pago]', box), soSim = function () { var v = pSel ? pSel.value : 'Sim', sim = v === 'Sim' || v === 'Parcial'; $$('[data-sim]', box).forEach(function (l) { l.hidden = !sim; }); $$('[data-parcial]', box).forEach(function (l) { l.hidden = v !== 'Parcial'; }); $$('[data-perdido]', box).forEach(function (l) { l.hidden = !(ehPerdido(v) && !ehPerdido(reg.pago)); }); };
  if (pSel) pSel.addEventListener('change', soSim); soSim();
  $$('[data-c=dataPagamento], [data-c=data]', box).forEach(function (i) { i.addEventListener('input', function () { this.value = mascaraData(this.value); }); });
  var hr = $('[data-c=hora]', box); if (hr) hr.addEventListener('input', function () { this.value = mascaraHora(this.value); });
  var be = $('[data-engano]', box); if (be) be.addEventListener('click', function () {
    var oq = $('[data-c=oque]', box), canc = (BOOT.listas.oque || []).filter(function (o) { return /^Cancelado pela cl/i.test(o); })[0];
    if (!canc) return toast('"Cancelado pela clínica" não está na aba Listas: peça pra gestão acrescentar.');
    setSel(oq, canc);
    var qi = $('[data-c=quemInformou]', box); if (qi && !qi.value.trim()) qi.value = 'lançado por engano (' + quemSou() + ')';
    var ob = $('[data-c=observacao]', box); if (ob && !ob.value.trim()) ob.value = 'Lançado por engano — não houve esta sessão';
    toast('Confira e clique em "Gravar correção"');
  });
  return box;
}
// lê o formulário: manda só o que mudou em relação à linha (o servidor confere de novo e registra)
function corrigirCampos(box, reg) {
  var c = {}, v = function (k) { return $('[data-c=' + k + ']', box); }, txt = function (k) { var e = v(k); return e ? e.value.trim() : null; };
  var mudou = function (k, atual) { var x = txt(k); if (x != null && x !== String(atual == null ? '' : atual)) c[k] = x; };
  if (v('recebidoAgora')) { c.recebidoAgora = txt('recebidoAgora'); c.dataPagamento = txt('dataPagamento'); c.forma = v('forma').value; c.quemPagou = txt('quemPagou'); c.nf = v('nf').value; c.nfNumero = txt('nfNumero'); }
  ['data', 'hora', 'paciente', 'profissional', 'procedimento', 'oque'].forEach(function (k) { mudou(k, reg[k]); });
  ['convenio', 'modalidade'].forEach(function (k) { var e = v(k); if (e && !e.disabled && e.value !== String(reg[k] || '')) c[k] = e.value; });
  var val = v('valor'); if (val) { var nv = num(val.value); if (nv !== (reg.valor === '' || reg.valor == null ? null : Number(reg.valor))) c.valor = val.value.trim(); }
  var pago = v('pago');
  if (pago) {
    if (pago.disabled) pago = null;
  }
  if (pago) {
    if (pago.value !== (reg.pago || '') || v('valor') == null) c.pago = pago.value;
    if (ehPerdido(pago.value) && !ehPerdido(reg.pago)) { c.pago = pago.value; c.motivoPerdido = txt('motivoPerdido') || ''; }
    if (pago.value === 'Parcial') { var vr = num(txt('valorRecebido')); if (vr !== (Number(reg.recebido) || null)) { c.valorRecebido = txt('valorRecebido'); c.pago = 'Parcial'; } }
    if (pago.value === 'Sim' || pago.value === 'Parcial') { c.dataPagamento = txt('dataPagamento'); c.forma = v('forma').value; c.quemPagou = txt('quemPagou'); c.nf = v('nf').value; c.nfNumero = txt('nfNumero'); if (v('valor') && c.pago == null && c.forma === (reg.forma || '') && c.nf === (reg.nf || 'Não') && c.nfNumero === (reg.nfN || '') && c.dataPagamento === (reg.dataPag || hojeStr())) { delete c.dataPagamento; delete c.forma; delete c.nf; delete c.nfNumero; if (c.quemPagou === (reg.quem || '') || !reg.quem) delete c.quemPagou; } }
    if (v('valor') && c.pago == null && (c.dataPagamento != null || c.forma != null || c.nf != null || c.nfNumero != null || c.quemPagou != null)) c.pago = pago.value;
  }
  var g = v('guia'); if (g) { var gv = g.checked ? 'Sim' : 'Não'; if (gv !== (reg.guia || 'Não')) c.guia = gv; }
  var qi = txt('quemInformou'); if (qi) c.quemInformou = qi;
  var o = txt('observacao'); if (o) c.observacao = o;
  return c;
}
function corrigirValidar(c, reg) {
  var e = [], valor = c.valor != null ? num(c.valor) : Number(reg.valor);
  if (c.recebidoAgora != null) { var ag = num(c.recebidoAgora); if (!(ag > 0)) e.push('Informe o valor recebido agora.'); else if (ag > saldoReg(Object.assign({}, reg, { valor: valor })) + 0.001) e.push('O valor recebido passa do que está em aberto (R$ ' + brl(saldoReg(reg)) + '). Se o valor da sessão está errado, use "Corrigir lançamento" na tela Pendências.'); }
  if (c.pago === 'Sim' && !(valor > 0)) e.push('Pago? = Sim exige um valor da sessão maior que zero.');
  if (ehPerdido(c.pago) && !ehPerdido(reg.pago) && !c.motivoPerdido) e.push('"' + PAGO_PERDIDO + '": escreva o motivo da perda.');
  if (c.pago === 'Parcial') { var vr = num(c.valorRecebido != null ? c.valorRecebido : reg.recebido); if (!(vr > 0 && vr < valor)) e.push('Pago? = Parcial: o "valor já recebido" tem de ser maior que zero e menor que o valor da sessão.'); }
  if (c.dataPagamento && !dataValida(c.dataPagamento)) e.push('Data do pagamento inválida (dd/mm/aaaa).');
  if (c.data && !dataObj(c.data)) e.push('Data da sessão inválida (dd/mm/aaaa).');
  var amplo = ['data', 'hora', 'paciente', 'profissional', 'procedimento', 'oque', 'valor', 'valorRecebido'].some(function (k) { return c[k] != null; });
  if (amplo && !c.quemInformou) e.push('Mudou dados da sessão ou valores: preencha "Quem informou / motivo".');
  if (!Object.keys(c).filter(function (k) { return k !== 'quemInformou'; }).length) e.push('Nada pra corrigir: mude algum campo ou escreva na observação.');
  return e;
}

var TELAS = { hoje: 's-hoje', confirmar: 's-confirmar', ficha: 's-ficha', registrar: 's-registrar', pacientes: 's-pacientes', cobranca: 's-cobranca', meudia: 's-meudia', gestao: 's-gestao', repasse: 's-repasse', conciliacao: 's-conciliacao', areceber: 's-areceber' };
var TITULOS = { hoje: 'Agenda', confirmar: 'Confirmações', ficha: 'Ficha do paciente', registrar: 'Registrar atendimento', pacientes: 'Pacientes', cobranca: 'Cobrança do mês', meudia: 'Meu dia', gestao: 'Pendências', repasse: 'Repasse', conciliacao: 'Conciliação', areceber: 'A receber e perdas' };
var SO_GESTAO = { repasse: true, conciliacao: true, areceber: true };
var telaAtual = 'hoje', navGen = 0;
var INICIAR = {};
function go(id, extra) {
  if (!TELAS[id] || (SO_GESTAO[id] && BOOT && !ehGestao())) id = 'hoje';
  telaAtual = id; navGen++;
  Object.keys(TELAS).forEach(function (k) { $("#" + TELAS[k]).hidden = id !== k; });
  $("#a-rodape").hidden = id !== 'registrar' || !AT;
  $("#p-rodape").hidden = id !== 'pacientes' || !BOOT;
  $$("[data-go]").forEach(function (b) { if (b.dataset.go === id) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  $("#titulo-cel").textContent = TITULOS[id];
  document.title = TITULOS[id] + ' · Recepção Nascente';
  if (INICIAR[id]) INICIAR[id](extra);
  window.scrollTo(0, 0);
}
// trocar de tela cancela (ignora) a resposta da chamada anterior: a função só roda se a tela ainda for a mesma
function aindaNa(tela, gen) { return telaAtual === tela && gen === navGen; }
$$("[data-go]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); go(b.dataset.go); }); });
$$("#logo-link, #logo-link-cel").forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); go('hoje'); }); });
$$(".imprimir").forEach(function (b) { b.addEventListener('click', function () { window.print(); }); }); // Imprimir de cada tela, como nos mockups
document.addEventListener('click', function (e) { if (!e.target.closest('.mais')) $$('.mais-menu').forEach(function (m) { m.remove(); }); });

/* ---------- tempos (a gestão vê no rodapé) e aviso de demora ---------- */
var TEMPOS = {}, chamadasAbertas = 0, avisoDemoraT = null;
var callBruto = call;
call = function (nome, dados) {
  var t0 = Date.now(); chamadasAbertas++;
  clearTimeout(avisoDemoraT); avisoDemoraT = setTimeout(function () { if (chamadasAbertas > 0) banner('Demorou mais que o normal (a planilha está lenta). Aguarde mais um pouco ou <a href="#" id="banner-retry">tente de novo</a>.', true); }, ((BOOT && BOOT.params && BOOT.params.demora_aviso_segundos) || 20) * 1000);
  return callBruto(nome, dados).then(function (r) { registrarTempo(nome, Date.now() - t0, r && r._ms); return r; }).catch(function (e) { registrarTempo(nome, Date.now() - t0, null); throw e; });
};
function registrarTempo(nome, total, servidor) {
  chamadasAbertas--; if (chamadasAbertas <= 0) { chamadasAbertas = 0; clearTimeout(avisoDemoraT); var b = $("#banner"); if (!b.hidden && /Demorou/.test(b.textContent)) banner(''); }
  TEMPOS[nome] = { total: total, servidor: servidor, quando: agoraHora() };
  var r = $("#rodape-tempos"); if (r && ehGestao()) { r.hidden = false; r.textContent = 'tempos: ' + Object.keys(TEMPOS).slice(-4).map(function (k) { var t = TEMPOS[k]; return k + ' ' + (t.total / 1000).toFixed(1) + ' s' + (t.servidor != null ? ' (servidor ' + (t.servidor / 1000).toFixed(1) + ' s)' : ''); }).join(' · '); }
}
function banner(msg, html) { var b = $("#banner"); if (!msg) { b.hidden = true; return; } b.hidden = false; if (html) b.innerHTML = msg; else b.textContent = msg; var rt = $("#banner-retry"); if (rt) rt.addEventListener('click', function (e) { e.preventDefault(); location.reload(); }); }

/* ---------- carga inicial ---------- */
var aoCarregarAT = [];
function quandoAT(fn) { if (AT) fn(); else aoCarregarAT.push(fn); }
function carregar() {
  call('bootstrap').then(function (b) {
    BOOT = b;
    var email = b.usuario.email || '';
    $("#chip-nome").textContent = quemSou(); $("#chip-av").textContent = quemSou().charAt(0); $("#chip-av-cel").textContent = quemSou().charAt(0);
    $("#chip-mail").textContent = (ehGestao() ? 'gestão' : 'recepção') + (MOCK ? ' · simulação' : '');
    $("#chip-user").title = (email || '') + ' · perfil ' + (ehGestao() ? 'gestão' : 'recepção');
    if (ehGestao()) $("#chip-user").classList.add('gestao');
    // menu por perfil (gestão 16/10): Agenda · Confirmações · Registrar · Pacientes · Cobrança do mês · Meu dia · Pendências iguais pras duas (a recepção faz tudo o que a gestão faz ali, menos a IA); Repasse · Conciliação · A receber só a gestão
    $$('[data-go=repasse], [data-go=conciliacao], [data-go=areceber]').forEach(function (x) { x.hidden = !ehGestao(); });
    $$('.so-gestao').forEach(function (x) { x.hidden = !ehGestao(); });
    $$('.so-recepcao').forEach(function (x) { x.hidden = ehGestao(); });
    var dl = $("#dl-pagadores"); dl.innerHTML = ''; var vistos = {};
    b.pacientes.forEach(function (p) { String(p.pagador || '').split(/\s*\/\s*/).forEach(function (n) { n = n.trim(); if (n && !vistos[n]) { vistos[n] = 1; var o = document.createElement('option'); o.value = n; dl.appendChild(o); } }); });
    banner('');
    return call('bootstrapAtendimento');
  }).then(function (a) {
    AT = a;
    var dl = $("#dl-pacientes"); dl.innerHTML = ''; a.pacientes.forEach(function (p) { var o = document.createElement('option'); o.value = p.nome; dl.appendChild(o); });
    var fila = aoCarregarAT; aoCarregarAT = []; fila.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
    if (telaAtual === 'registrar') $("#a-rodape").hidden = false;
    if (telaAtual === 'pacientes') $("#p-rodape").hidden = false;
  }).catch(function (e) {
    $("#d-carregando").textContent = 'Não consegui abrir a planilha: ' + e.message;
    banner('Planilha indisponível. O que você digitar fica guardado neste computador. Tentando de novo em 15 s…');
    setTimeout(carregar, 15000);
  });
}
// recarrega os dados do atendimento (cobranças, competências) depois de uma gravação que muda o estado do mês
function recarregarAT() { return call('bootstrapAtendimento').then(function (a) { AT = a; return a; }); }
