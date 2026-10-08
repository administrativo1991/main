/* ---------- utilitários de tela ---------- */
var $ = function (s, raiz) { return (raiz || document).querySelector(s); };
var $$ = function (s, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(s)); };
var toastT;
function toast(m) { var t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("show"); }, 3200); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
function banner(msg) { var b = $("#banner"); if (!msg) { b.hidden = true; return; } b.hidden = false; b.textContent = msg; }

/* ícones: SVG de traço, sem emoji e sem biblioteca externa */
var SVG0 = '<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
function ic(nome, s, w) {
  var d = {
    alerta: '<path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    check: '<path d="M5 12l5 5L20 7"/>',
    seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    direita: '<path d="M9 6l6 6-6 6"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    pontos: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
    cadeado: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
    fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
    bloqueio: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>'
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
var mockReg = [], mockDia = [], mockPendOk = [];
var mockProfs = [{ nome: "Juliana Ribeiro", especialidade: "Psicologia", horarios: { Segunda: '08:00-12:00, 13:00-19:00', 'Terça': '08:00-12:00', Quarta: '13:00-19:00', Quinta: '08:00-12:00, 13:00-18:00', Sexta: '', 'Sábado': '' }, duracao: 30 },
  { nome: "Giovana Grossi", especialidade: "Psicologia (estágio)", horarios: { Segunda: '10:00-12:00, 13:00-16:00', 'Terça': '', Quarta: '', Quinta: '', Sexta: '', 'Sábado': '' }, duracao: null },
  { nome: "Dr. Victor Cunha", especialidade: "Pediatria", horarios: { Segunda: '14:00-18:00', 'Terça': '', Quarta: '', Quinta: '14:00-18:00', Sexta: '', 'Sábado': '' }, duracao: 45 },
  { nome: "Marileia Rodrigues", especialidade: "Psicanálise e ABA", horarios: {}, duracao: null }];
var mockLemb = [{ linha: 2, data: '03/10/2026 18:10', texto: 'Semana que vem a Dra. Luciana não atende na quinta.', validoAte: '03/10/2026', quem: 'simulacao@local' }, { linha: 3, data: hojeStr() + ' 08:00', texto: 'Hoje a Dra. Luciana atende só até 16h: remarcar quem está de 16h30 em diante.', validoAte: '', quem: 'simulacao@local' }];
var mockAgenda = [{ ID: 'F-1', Paciente: 'Beatriz Almeida Rocha', Profissional: 'Juliana Ribeiro', 'Dia da semana': 'Segunda', Hora: '08:00', 'Frequência': 'Semanal', 'Começa em': '01/09/2026', 'Termina em': '', Ativo: 'Sim', 'Observação': '' },
  { ID: 'F-2', Paciente: 'Carlos Henrique Dias', Profissional: 'Juliana Ribeiro', 'Dia da semana': 'Segunda', Hora: '09:00', 'Frequência': 'Quinzenal', 'Começa em': '07/09/2026', 'Termina em': '', Ativo: 'Sim', 'Observação': '' },
  { ID: 'F-3', Paciente: 'Pedro Augusto Neves', Profissional: 'Juliana Ribeiro', 'Dia da semana': 'Segunda', Hora: '10:00', 'Frequência': 'Semanal', 'Começa em': '', 'Termina em': '', Ativo: 'Sim', 'Observação': '' },
  { ID: 'F-4', Paciente: 'Sofia Ramos Teixeira', Profissional: 'Giovana Grossi', 'Dia da semana': 'Segunda', Hora: '14:00', 'Frequência': 'Semanal', 'Começa em': '', 'Termina em': '', Ativo: 'Sim', 'Observação': '' },
  { ID: 'F-5', Paciente: 'Ana Luísa Fontes Braga', Profissional: 'Giovana Grossi', 'Dia da semana': 'Segunda', Hora: '11:00', 'Frequência': 'Semanal', 'Começa em': '', 'Termina em': '', Ativo: 'Sim', 'Observação': '' },
  { ID: 'F-6', Paciente: 'Theo Barreto Lima', Profissional: 'Giovana Grossi', 'Dia da semana': 'Segunda', Hora: '13:00', 'Frequência': 'Semanal', 'Começa em': '', 'Termina em': '', Ativo: 'Sim', 'Observação': '' },
  { ID: 'F-7', Paciente: 'Helena Vasconcelos Prado', Profissional: 'Dr. Victor Cunha', 'Dia da semana': 'Segunda', Hora: '17:00', 'Frequência': 'Semanal', 'Começa em': '', 'Termina em': '', Ativo: 'Sim', 'Observação': '' },
  { ID: 'F-8', Paciente: 'Lívia Fontes Pereira', Profissional: 'Juliana Ribeiro', 'Dia da semana': 'Segunda', Hora: '15:00', 'Frequência': 'Semanal', 'Começa em': '', 'Termina em': '', Ativo: 'Sim', 'Observação': '' }];
var mockBase = [
  { linha: 2, nome: "Isaac Modelo Santos", cpf: "529.982.247-25", nasc: "15/03/2022", pagador: "Natália Modelo Santos", modalidade: "Por sessão", convenio: "Particular", ativo: "Sim" },
  { linha: 3, nome: "Isac Modelo de Souza", cpf: "111.444.777-35", nasc: "07/08/2024", pagador: "", modalidade: "", convenio: "", ativo: "Sim" },
  { linha: 4, nome: "Isabelli Exemplo Portes", cpf: "", nasc: "13/11/2014", pagador: "", modalidade: "", convenio: "", ativo: "Sim" }
];
var mockPacientes = [{ linha: 2, nome: 'Beatriz Almeida Rocha', cpf: '529.982.247-25', nasc: '03/05/1994', modalidade: 'Tabela', pagamento: 'Na sessão', regra: '', obsCobranca: '', pagador: 'Beatriz Almeida Rocha', convenio: 'Particular', valorCombinado: '' },
  { linha: 3, nome: 'Carlos Henrique Dias', cpf: '529.982.247-25', nasc: '21/09/1979', modalidade: 'Por sessão (combinado)', valorNum: 70, pagamento: 'Posterior', regra: '', obsCobranca: '', pagador: 'Carlos Henrique Dias', convenio: 'Particular', valorCombinado: 'Pagamento posterior: R$ 70 por sessão (era Plano de 4 consultas)' },
  { linha: 4, nome: 'Theo Barreto Lima', cpf: '529.982.247-25', nasc: '12/07/2015', modalidade: 'Pacote de sessões', pctN: 4, pctV: 150, pagamento: 'Antecipado', regra: '', obsCobranca: '', pagador: 'Daniela Barreto Lima', convenio: 'Particular', valorCombinado: 'R$ 150/mês' },
  { linha: 5, nome: 'Lívia Fontes Pereira', cpf: '529.982.247-25', nasc: '26/01/2010', modalidade: 'Pro bono', pagamento: 'Não se aplica', regra: '', obsCobranca: 'Pro bono até 31/10. A partir de 01/11: social.', pagador: '', convenio: 'Particular', valorCombinado: '' },
  { linha: 6, nome: 'Pedro Augusto Neves', cpf: '529.982.247-25', nasc: '31/07/1980', modalidade: 'Convênio', pagamento: 'Posterior', regra: '', obsCobranca: 'Cedplan — guia assinada antes da sessão.', pagador: '', convenio: 'Cedplan', valorCombinado: '' },
  { linha: 7, nome: 'Sofia Ramos Teixeira', cpf: '529.982.247-25', nasc: '16/06/1999', modalidade: 'Pacote social', pctN: 4, pctV: 200, pagamento: 'Antecipado', regra: '', obsCobranca: '', pagador: 'Associação Boa Esperança', convenio: 'Particular', valorCombinado: '' },
  { linha: 8, nome: 'Ana Luísa Fontes Braga', cpf: '529.982.247-25', nasc: '14/02/1996', modalidade: 'Pacote de sessões', pctN: 4, pctV: 280, pagamento: 'Posterior', regra: '', obsCobranca: '', pagador: 'Ana Luísa Fontes Braga', convenio: 'Particular', valorCombinado: '' },
  { linha: 9, nome: 'Luana Castro Figueiredo', cpf: '529.982.247-25', nasc: '30/10/1988', modalidade: 'Por sessão (combinado)', valorNum: 80, pagamento: 'Antecipado', regra: '', obsCobranca: '', pagador: 'Luana Castro Figueiredo', convenio: 'Particular', valorCombinado: '' },
  { linha: 10, nome: 'Helena Vasconcelos Prado', cpf: '', nasc: '02/02/2024', modalidade: '', pagamento: '', regra: '', obsCobranca: '', pagador: 'Renata Vasconcelos Prado', convenio: 'Particular', valorCombinado: '' },
  { linha: 11, nome: 'Marcos Vinícius Tavares', cpf: '529.982.247-25', nasc: '08/12/1989', modalidade: 'Por sessão (combinado)', valorNum: 100, pagamento: 'Na sessão', regra: '', obsCobranca: '', pagador: 'Marcos Vinícius Tavares', convenio: 'Particular', valorCombinado: 'Sessão R$ 100 combinado com a Juliana.' }];
var mockSessoes = { 'Theo Barreto Lima': { disponiveis: 2, ultima: '01/10/2026', ultimaSessoes: 4, validade: '30/11/2026', faltasAvisadasMes: 0, sessoesMes: 2, aPagarMes: 0, renovouMes: true, vencido: false },
  'Sofia Ramos Teixeira': { disponiveis: 0, ultima: '01/09/2026', ultimaSessoes: 4, validade: '31/10/2026', faltasAvisadasMes: 1, sessoesMes: 3, aPagarMes: 0, renovouMes: false, vencido: false },
  'Ana Luísa Fontes Braga': { disponiveis: 0, ultima: '', ultimaSessoes: 0, validade: '', faltasAvisadasMes: 0, sessoesMes: 2, aPagarMes: 140, renovouMes: false, vencido: false } };
function mock(nome, d) {
  return new Promise(function (res) { setTimeout(function () {
    if (nome === 'bootstrap') return res({ usuario: { email: 'simulacao@local', perfil: window.__RECEPCAO ? 'recepcao' : 'gestao' }, planilha: '(simulação, sem planilha)', hora: '',
      lembrete: mockLemb[mockLemb.length - 1], lembretes: mockLemb.slice(-5).reverse(),
      listas: { oque: ["Atendido", "Desmarcou com antecedência (≥ 24h)", "Faltou avisando em cima da hora (< 24h)", "Faltou sem aviso", "Cancelado pela clínica"], pago: ["Sim", "Não", "Convênio (fatura)", "Pacote (sessão já paga)", "Não se aplica (pro bono / permuta)", "Parcial"], formas: ["Pix", "Dinheiro", "Cartão de débito", "Cartão de crédito", "Link de pagamento"], modalidades: COBRANCAS.slice(), pagamentos: PAGAMENTOS.slice(),
        modalidadesEsp: [], regras: ["Tabela", "Paga o que consegue", "Valor fixo combinado", "Mensalidade fixa (independe do nº de sessões)", "Pro bono", "Permuta", "Convênio"],
        convenios: ["Particular", "Cedplan", "Sabin Sinai", "Unafisco", "AAPI JF", "Plan Minas", "PLASC", "AMIL", "ASSEFAZ", "FUSEX", "IPSM", "Sulamérica", "18 de Julho", "Aeronáutica"] },
      profissionais: mockProfs, pacientes: mockBase.concat(mockPacientes.map(function (p) { return { linha: p.linha + 10, nome: p.nome, cpf: '', nasc: p.nasc, pagador: p.pagador, modalidade: p.modalidade, convenio: p.convenio, ativo: 'Sim' }; })) });
    if (nome === 'bootstrapAtendimento') return res({ hoje: hojeStr(), abaMes: MESES_PT[new Date().getMonth()], abaMesExiste: true, mensalistasInfo: { modeloNovo: true, mes: MESES_PT[new Date().getMonth()].toUpperCase(), coluna: MESES_PT[new Date().getMonth()].toUpperCase() + ' — pago?' },
      procedimentos: [{ nome: 'Consulta pediátrica', especialidade: 'Pediatria', valor: 200 }, { nome: 'Consulta pediátrica – cartão de parceria ou AAPI JF', especialidade: 'Pediatria', valor: 160 }, { nome: 'Retorno pediátrico (com pedido de exames, até 30 dias)', especialidade: 'Pediatria', valor: 0 },
        { nome: 'Anamnese psicologia', especialidade: 'Psicologia', valor: 140 }, { nome: 'Sessão de psicologia', especialidade: 'Psicologia', valor: 120 }, { nome: 'Sessão de psicologia – cartão de parceria', especialidade: 'Psicologia', valor: 100 }, { nome: 'Sessão de psicologia – plano de 4 consultas', especialidade: 'Psicologia', valor: 0 }, { nome: 'Sessão de psicologia – mensalidade fixa', especialidade: 'Psicologia', valor: 0 }, { nome: 'Sessão de psicologia – mensal valor especial', especialidade: 'Psicologia', valor: 0 }, { nome: 'Sessão de psicologia – convênio', especialidade: 'Psicologia', valor: 0 }, { nome: 'Taxa de falta – psicologia', especialidade: 'Psicologia', valor: 120 }, { nome: 'Aplicação de teste – avaliação neuropsicológica', especialidade: 'Psicologia', valor: 0 }, { nome: 'Avaliação neuropsicológica', especialidade: 'Psicologia', valor: null }, { nome: 'Plano de 4 consultas – psicologia (compra)', especialidade: 'Psicologia', valor: 400 }, { nome: 'Plano de 12 consultas – psicologia (compra)', especialidade: 'Psicologia', valor: 960 }],
      pacotes: {}, mensalistas: {}, pacotesSessoes: JSON.parse(JSON.stringify(mockSessoes)),
      pacientes: mockPacientes });
    if (nome === 'proximasSessoes') { var b0 = dataObj(d.de) || new Date(), ps = []; for (var q = 0; q < (d.n || 4); q++) { var dq = new Date(b0.getTime() + q * 7 * 864e5); ps.push({ data: ('0' + dq.getDate()).slice(-2) + '/' + ('0' + (dq.getMonth() + 1)).slice(-2) + '/' + dq.getFullYear(), hora: '09:30', profissional: d.profissional }); } return res({ ok: true, sessoes: ps }); }
    if (nome === 'lancarAntecipado') return res({ ok: true, total: num(d.valorSessao) * d.sessoes.length, lancadas: d.sessoes.map(function (x, i) { return { id: 'A-sim-ant' + i, aba: 'Outubro', linha: 50 + i, data: x.data }; }) });
    if (nome === 'salvarLembrete') { var nl = { linha: mockLemb.length + 2, data: hojeStr() + ' ' + agoraHora(), texto: d.encerrar ? '' : d.texto, validoAte: d.encerrar ? '' : (d.validoAte || ''), quem: 'simulacao@local' }; mockLemb.push(nl); return res({ ok: true, linha: nl.linha, lembrete: nl.texto ? nl : null, lembretes: mockLemb.slice(-5).reverse() }); }
    if (nome === 'registrarAtendimento') { var mp = mockPacientes.filter(function (p) { return p.nome === d.paciente; })[0]; mockReg.push({ paciente: d.paciente, profissional: d.profissional, oque: d.oque, hora: d.hora, data: d.data, procedimento: d.procedimento, id: 'A-sim-' + (mockReg.length + 1), valor: num(d.valor) || 0, pago: d.pago || '', forma: d.forma || '', nf: d.nf || '', guia: d.guia || '', convenio: mp ? mp.convenio : '' }); var cons = null, dispo = null; if (mp && ehPacoteCob(mp) && !d.cobrarAvulsa) { var ms = mockSessoes[mp.nome] = mockSessoes[mp.nome] || { disponiveis: 0, ultima: '', validade: '', faltasAvisadasMes: 0, sessoesMes: 0, aPagarMes: 0 }; cons = consumoPacote(d.oque, d.procedimento, d.mesmaSemana, ms.faltasAvisadasMes); if (/^1ª falta/.test(cons.nota)) ms.faltasAvisadasMes++; if (pagDe(mp) === 'Antecipado') { ms.disponiveis += cons.delta; dispo = ms.disponiveis; } }
      return res({ ok: true, id: 'A-sim-' + mockReg.length, linha: 41 + mockReg.length, aba: MESES_PT[new Date().getMonth()], pacote: null, consumo: cons, disponiveis: dispo }); }
    if (nome === 'listaDoDia') {
      var itens = mockAgenda.map(function (a) { return { hora: a['Hora'], paciente: a['Paciente'], profissional: a['Profissional'], origem: a['Frequência'], agendaId: a['ID'], obs: '' }; }).concat(mockDia.filter(function (x) { return x.data === d.data && !/^Não vem|^Confirmado|^Removido/.test(x.origem); }).map(function (x) { return { hora: x.hora, paciente: x.paciente, profissional: x.profissional, origem: x.origem, listaId: x.id }; }));
      itens.forEach(function (it) { var r = mockReg.filter(function (x) { return x.paciente === it.paciente && x.profissional === it.profissional && x.data === d.data; })[0]; it.registro = r ? { oque: r.oque, id: r.id, procedimento: r.procedimento, hora: r.hora, valor: r.valor, pago: r.pago, forma: r.forma, nf: r.nf, guia: r.guia, convenio: r.convenio } : null; var nv = mockDia.filter(function (x) { return x.data === d.data && /^Não vem/.test(x.origem) && x.paciente === it.paciente; })[0]; if (nv) it.naoVem = nv.origem; var cf = mockDia.filter(function (x) { return x.data === d.data && x.origem === 'Confirmado' && x.paciente === it.paciente; })[0]; if (cf) it.confirmado = { por: 'simulacao@local', quando: 'ontem 17:40' }; });
      var pend = { 'Carlos Henrique Dias': [{ tipo: 'pag', aba: 'Setembro', id: 'A-sim-p1', data: '29/09/2026', hora: '09:00', profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia', oque: 'Atendido', valor: 70, pago: '', convenio: 'Particular', nf: '', guia: '' }], 'Pedro Augusto Neves': [{ tipo: 'guia', aba: 'Outubro', id: 'A-sim-p2', data: '30/09/2026', hora: '10:00', profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia – convênio', oque: 'Atendido', valor: 0, pago: 'Convênio (fatura)', convenio: 'Cedplan', nf: '', guia: '' }] };
      Object.keys(pend).forEach(function (k) { pend[k] = pend[k].filter(function (x) { return mockPendOk.indexOf(x.id) < 0; }); if (!pend[k].length) delete pend[k]; });
      return res({ data: d.data, diaSemana: DIAS_PT[(dataObj(d.data) || new Date()).getDay()], itens: itens, abaMes: MESES_PT[new Date().getMonth()], abaMesExiste: true, pendencias: pend }); }
    if (nome === 'agendaFixa') return res(mockAgenda);
    if (nome === 'agendaSemana') { var b0 = dataObj(d.data) || new Date(), seg0 = new Date(b0.getFullYear(), b0.getMonth(), b0.getDate() - ((b0.getDay() + 6) % 7)), dias0 = [];
      for (var i0 = 0; i0 < 7; i0++) { var dt0 = new Date(seg0.getFullYear(), seg0.getMonth(), seg0.getDate() + i0), ds0 = ('0' + dt0.getDate()).slice(-2) + '/' + ('0' + (dt0.getMonth() + 1)).slice(-2) + '/' + dt0.getFullYear(), dn0 = DIAS_PT[dt0.getDay()];
        var it0 = mockAgenda.filter(function (a) { return a['Dia da semana'] === dn0; }).map(function (a) { return { hora: a['Hora'], paciente: a['Paciente'], profissional: a['Profissional'], origem: a['Frequência'], agendaId: a['ID'], obs: '', registro: null }; })
          .concat(mockDia.filter(function (x) { return x.data === ds0 && !/^Não vem|^Confirmado|^Removido/.test(x.origem); }).map(function (x) { return { hora: x.hora, paciente: x.paciente, profissional: x.profissional, origem: x.origem, listaId: x.id, registro: null }; }));
        dias0.push({ data: ds0, diaSemana: dn0, itens: d.profissional ? it0.filter(function (x) { return x.profissional === d.profissional; }) : it0 }); }
      return res({ inicio: dias0[0].data, profissional: d.profissional || '', dias: dias0 }); }
    if (nome === 'salvarExpediente') { var pf = mockProfs.filter(function (x) { return x.nome === d.profissional; })[0]; if (!pf) return res({ ok: false, erros: ['Profissional não está na aba Profissionais.'] }); pf.horarios = d.horarios; pf.duracao = parseInt(d.duracao, 10) || null; return res({ ok: true, colunasCriadas: [], profissionais: mockProfs }); }
    if (nome === 'salvarAgendaFixa') { var id = d.id || ('F-' + (mockAgenda.length + 1)); var ex = mockAgenda.filter(function (a) { return a.ID === id; })[0]; var row = { ID: id, Paciente: d.paciente, Profissional: d.profissional, 'Dia da semana': d.diaSemana, Hora: d.hora, 'Frequência': d.frequencia || 'Semanal', 'Começa em': d.comecaEm || '', 'Termina em': d.terminaEm || '', Ativo: d.ativo === false ? 'Não' : 'Sim', 'Observação': d.observacao || '' }; if (ex) Object.assign(ex, row); else mockAgenda.push(row); return res({ ok: true, id: id }); }
    if (nome === 'acrescentarAoDia') { var nid = 'D-' + (mockDia.length + 1); mockDia.push({ id: nid, data: d.data, hora: d.hora, paciente: d.paciente, profissional: d.profissional, origem: d.origem || 'Avulso' }); return res({ ok: true, id: nid }); }
    if (nome === 'remarcar') { mockDia.push({ id: 'D-x' + mockDia.length, data: d.de, hora: d.horaDe, paciente: d.paciente, profissional: d.profissional, origem: 'Não vem · remarcado para ' + d.para }); mockDia.push({ id: 'D-y' + mockDia.length, data: d.para, hora: d.horaPara || d.horaDe, paciente: d.paciente, profissional: d.profissional, origem: 'Remarcação de ' + d.de }); return res({ ok: true }); }
    if (nome === 'lancarPacote') return res({ ok: true, id: 'P-novo', validade: '11/01/2027', linhaRecebimento: 43, aba: MESES_PT[new Date().getMonth()] });
    if (nome === 'confirmar') { mockDia.push({ id: 'D-c' + mockDia.length, data: d.data, hora: d.hora, paciente: d.paciente, profissional: d.profissional, origem: 'Confirmado' }); return res({ ok: true }); }
    if (nome === 'lerCadastro') { var pc = (AT ? AT.pacientes : []).filter(function (p) { return p.nome === d.nome; })[0]; if (!pc) return res({ ok: false, erros: ['Paciente não encontrado em Pacientes.'] }); return res({ ok: true, nome: pc.nome, nasc: pc.nasc, cpfFinal: String(pc.cpf || '').replace(/\D/g, '').slice(-4), indicacao: '', primeira: '', campos: { modalidade: pc.modalidade, convenio: pc.convenio, carteirinha: '', regra: pc.regra, valorCombinado: pc.valorCombinado, valorNum: pc.valorNum == null ? '' : String(pc.valorNum), pctN: pc.pctN == null ? '' : String(pc.pctN), pctV: pc.pctV == null ? '' : String(pc.pctV), pagamento: pc.pagamento || '', obsCobranca: pc.obsCobranca, pagador: pc.pagador, whats: '', telPac: pc.telPac || '', profRef: '', pagadorCpf: '', respNome: pc.nome === 'Theo Barreto Lima' ? 'Daniela Barreto Lima' : '', respPar: pc.nome === 'Theo Barreto Lima' ? 'Mãe' : '', respTel: '', respCpf: '' } }); }
    if (nome === 'renovarPacote') { var mr0 = mockSessoes[d.paciente] = mockSessoes[d.paciente] || { disponiveis: 0, faltasAvisadasMes: 0, sessoesMes: 0, aPagarMes: 0 }; var n0 = parseInt(d.sessoes, 10); if (!(n0 > 0) || !(num(d.valor) > 0) || !d.forma) return res({ ok: false, erros: ['Informe sessões, valor e forma de pagamento.'] }); mr0.disponiveis += n0; mr0.ultima = d.data; mr0.validade = n0 >= 12 ? '08/04/2027' : '08/12/2026'; mr0.renovouMes = true; return res({ ok: true, id: 'R-sim', aba: MESES_PT[new Date().getMonth()], linha: 60, validade: mr0.validade, disponiveis: mr0.disponiveis }); }
    if (nome === 'pacotesPainel') return res({ ok: true, dia: new Date().getDate(), itens: mockPacientes.filter(function (p) { return ehPacoteCob(p); }).map(function (p) { var e = mockSessoes[p.nome] || { disponiveis: 0, sessoesMes: 0, aPagarMes: 0 }, k = pacoteDe(p), pg = pagDe(p); return { paciente: p.nome, cobranca: p.modalidade, sessoes: k.n, valor: k.valor, pagamento: pg, disponiveis: e.disponiveis, ultima: e.ultima || '', validade: e.validade || '', sessoesMes: e.sessoesMes, aPagarMes: e.aPagarMes, situacao: pg === 'Antecipado' ? (e.disponiveis <= 0 ? 'esgotado' : e.disponiveis === 1 ? 'renovar' : 'ok') : (e.aPagarMes > 0 ? 'a pagar no mês' : 'ok'), pagador: p.pagador }; }) });
    if (nome === 'viradaPropostas') return res({ ok: true, itens: [{ nome: 'Carlos Henrique Dias', de: 'Por sessão R$ 70 · Posterior', para: 'Pacote de 4 sessões · R$ 280 · Antecipado', campos: { modalidade: 'Pacote de sessões', pctN: 4, pctV: 280, pagamento: 'Antecipado' } }, { nome: 'Ana Luísa Fontes Braga', de: 'Pacote de sessões · Posterior', para: 'Pacote de sessões · Antecipado', campos: { pagamento: 'Antecipado' } }, { nome: 'Lívia Fontes Pereira', de: 'Pro bono', para: 'Pacote social · Antecipado', campos: { modalidade: 'Pacote social', pagamento: 'Antecipado', regra: '' } }] });
    if (nome === 'aplicarAlteracoesLote') return res({ ok: true, feitos: (d.itens || []).map(function (i) { return i.nome; }), erros: [] });
    if (nome === 'atualizarCadastro') return res({ ok: true, alterados: Object.keys(d.campos || {}).slice(0, 2) });
    if (nome === 'removerDoDia') { mockDia = mockDia.filter(function (x) { return x.id !== d.id; }); return res({ ok: true }); }
    if (nome === 'criarColunasMes') return res({ ok: true, coluna: d.mes.toUpperCase() + ' — pago?' });
    if (nome === 'criarAbaMes') return res({ ok: true, aba: d.nome, modelo: 'Outubro' });
    if (nome === 'exportarMes') return res({ ok: true, nome: 'OUT 26 - Recepção atendimentos (app)', url: '#drive', xlsx: '#xlsx', linhas: 12, pasta: 'Controle Financeiro/2026/10 Out_26/2_Atendimentos', criadas: [], aviso: '', atualizado: '05/10/2026 12:00' });
    if (nome === 'gestaoResumo') return res({ ok: true, mes: d.mes || MESES_PT[new Date().getMonth()], abaExiste: true, total: 40, atendidos: 35, recebido: 3120, pagamentoPendente: [{ id: 'A-sim-g1', data: hojeStr(), hora: '09:00', paciente: 'Beatriz Almeida Rocha', profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia', valor: 120, pago: '', obs: '' }, { id: 'A-sim-g7', data: '19/09/2026', hora: '09:00', paciente: 'Beatriz Almeida Rocha', profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia', valor: 120, recebido: 50, pago: 'Parcial', obs: 'Recebido R$ 50,00 em 19/09/2026' }], nfPendente: [{ id: 'A-sim-g2', data: hojeStr(), hora: '', paciente: 'Marcos Vinícius Tavares', valor: 100, forma: 'Pix', quem: '', nf: 'Não', pago: 'Sim' }], semGuia: [{ id: 'A-sim-g3', data: hojeStr(), hora: '10:00', paciente: 'Pedro Augusto Neves', convenio: 'Cedplan', profissional: 'Juliana Ribeiro', guia: '' }], faltas: [{ id: 'A-sim-g4', data: '05/11/2026', hora: '10:00', paciente: 'Pedro Augusto Neves', profissional: 'Juliana Ribeiro', oque: 'Faltou sem aviso', obs: '' }], descontos: [{ id: 'A-sim-g5', data: '06/11/2026', hora: '', paciente: 'Carlos Henrique Dias', procedimento: 'Sessão de psicologia', valor: 90, obs: 'Desconto: R$ 90,00 (tabela R$ 120,00) — Juliana', log: 'simulacao@local · 06/11/2026 10:00' }], extras: [], pagadorDiferente: [{ id: 'A-sim-g6', data: hojeStr(), hora: '', paciente: 'Helena Vasconcelos Prado', quem: 'Avó', valor: 200, nf: 'Sim' }], alteracoes: [{ quando: '05/11/2026 09:12', paciente: 'Yandra Duarte Pires', campo: 'Convênio', de: '', para: 'Sabin Sinai', quem: 'carteirinha apresentada', por: 'simulacao@local' }], mesesExistentes: ['Setembro', 'Outubro', 'Novembro'], colunasMensalistas: ['SETEMBRO', 'OUTUBRO', 'NOVEMBRO'] });
    if (nome === 'lancamentos') { var ml = [{ aba: 'Setembro', linha: 12, id: 'A-sim-l1', data: '12/09/2026', hora: '09:00', paciente: 'Beatriz Almeida Rocha', profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia', oque: 'Atendido', valor: 120, recebido: 0, pago: 'Sim', dataPag: '12/09/2026', forma: 'Pix', quem: '', nf: 'Sim', nfN: '55', guia: '', convenio: 'Particular', obs: '' },
        { aba: 'Setembro', linha: 20, id: 'A-sim-l2', data: '19/09/2026', hora: '09:00', paciente: 'Beatriz Almeida Rocha', profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia', oque: 'Atendido', valor: 120, recebido: 50, pago: 'Parcial', dataPag: '19/09/2026', forma: 'Dinheiro', quem: '', nf: 'Não', nfN: '', guia: '', convenio: 'Particular', obs: 'Recebido R$ 50,00 em 19/09/2026 (Dinheiro); em aberto R$ 70,00' }];
      var qn = (d.paciente || '').toLowerCase(); return res({ ok: true, linhas: ml.filter(function (x) { return !qn || x.paciente.toLowerCase().indexOf(qn) >= 0; }), total: 2 }); }
    if (nome === 'corrigirLancamento' && d.campos && (d.campos.recebidoAgora || d.campos.valor || d.campos.valorRecebido || d.campos.data)) { if (/^A-sim-p/.test(d.id)) mockPendOk.push(d.id); return res({ ok: true, id: d.id, aba: d.aba, linha: 20, alterados: Object.keys(d.campos).filter(function (k) { return k !== 'quemInformou'; }), novos: d.campos, plano: null }); }
    if (nome === 'corrigirLancamento') { var mr = mockReg.filter(function (x) { return x.id === d.id; })[0], cc = d.campos || {}, alt = []; ['pago', 'forma', 'nf', 'guia'].forEach(function (k) { if (cc[k] != null && (!mr || cc[k] !== mr[k])) { if (mr) mr[k] = cc[k]; alt.push(k); } }); if (cc.observacao) alt.push('Observação'); if (!alt.length) return res({ ok: false, erros: ['Nada mudou: os campos já estavam assim.'] }); if (/^A-sim-p/.test(d.id)) mockPendOk.push(d.id); return res({ ok: true, id: d.id, aba: d.aba, linha: 41, alterados: alt, novos: cc, plano: null }); }
    if (nome === 'criarPaciente') {
      var dup = Duplicatas.verificar(d, mockBase);
      if (dup.bloqueio) return res({ ok: false, erros: ['CPF já cadastrado: ' + dup.bloqueio.paciente.nome] });
      if (!d.confirmouDuplicata && dup.avisos.length) return res({ ok: false, precisaConfirmar: true, avisos: dup.avisos.map(function (a) { return { nome: a.paciente.nome, nasc: a.paciente.nasc, pagador: a.paciente.pagador, modalidade: a.paciente.modalidade, motivos: a.motivos }; }) });
      mockBase.push({ linha: mockBase.length + 2, nome: d.nome, cpf: d.cpf, nasc: d.nasc, pagador: d.pagador, modalidade: d.modalidade, convenio: d.convenio, ativo: 'Sim' });
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

/* ---------- cadastro: Cobrança + Pagamento (gestão, 07-08/10) ----------
   Cobrança = como o valor é calculado; Pagamento = quando é pago. Os nomes antigos (antes da migração de 08/10) são lidos como os novos. */
var COBRANCAS = ['Tabela', 'Por sessão (combinado)', 'Pacote de sessões', 'Pacote social', 'Convênio', 'Pro bono', 'Permuta'];
var COB_RESTRITA = ['Pacote de sessões', 'Pacote social', 'Pro bono', 'Permuta']; // definidas pela gestão
var PAGAMENTOS = ['Na sessão', 'Antecipado', 'Posterior', 'Não se aplica'];
var PAG_SUGERIDO = { 'Tabela': 'Na sessão', 'Por sessão (combinado)': 'Na sessão', 'Pacote de sessões': 'Antecipado', 'Pacote social': 'Antecipado', 'Convênio': 'Posterior', 'Pro bono': 'Não se aplica', 'Permuta': 'Não se aplica' };
var PACOTE_SOCIAL = { n: 4, valor: 200 };
function pacInfo(nome) { return (AT && AT.pacientes.filter(function (p) { return p.nome === nome; })[0]) || null; }
function ehConvenio(p) { return !!(p.convenio && p.convenio !== 'Particular'); }
// texto antigo "R$ 70 por sessão" (antes da migração); depois vale o número em "Valor combinado (R$)"
function valorSessaoCad(p) { var m = String(p && p.valorCombinado || '').match(/R\$\s?([\d.]+(?:,\d{1,2})?)\s*(?:por sess|\/\s*sess|a sess)/i); return m ? num(m[1]) : null; }
function valorComb(p) { if (!p) return null; if (p.valorNum != null && p.valorNum !== '') return Number(p.valorNum); return valorSessaoCad(p); }
function cobDe(p) {
  if (!p) return '';
  var m = String(p.modalidade || '').trim();
  if (COBRANCAS.indexOf(m) >= 0) return m;
  if (!m) return ehConvenio(p) ? 'Convênio' : '';
  if (/^Mensalidade (social|fixa)|^Social/i.test(m)) return 'Pacote social';
  if (/^(Plano|Pacote) |^Mensal \(valor especial\)/i.test(m)) return 'Pacote de sessões';
  if (/^Pro bono/i.test(m)) return 'Pro bono';
  if (/^Permuta/i.test(m)) return 'Permuta';
  if (/^Conv[êe]nio/i.test(m)) return 'Convênio';
  if (/^Por sessão|^Pagamento (posterior|antecipado)/i.test(m)) return valorComb(p) != null ? 'Por sessão (combinado)' : 'Tabela';
  return 'Tabela';
}
function pagDe(p) {
  if (!p) return '';
  if (PAGAMENTOS.indexOf(p.pagamento) >= 0) return p.pagamento;
  if (/^Pagamento posterior/i.test(p.modalidade || '')) return 'Posterior';
  if (/^Pagamento antecipado/i.test(p.modalidade || '')) return 'Antecipado';
  return PAG_SUGERIDO[cobDe(p)] || 'Na sessão';
}
function ehPacoteCob(p) { return !!p && /^Pacote/.test(cobDe(p)); }
function ehProBono(p) { return !!p && /^(Pro bono|Permuta)$/.test(cobDe(p)); }
function cobConvenio(p) { return !!p && cobDe(p) === 'Convênio'; }
function ehPosterior(p) { return pagDe(p) === 'Posterior'; }
function ehAntecipado(p) { return pagDe(p) === 'Antecipado'; }
function cadastroIncompleto(p) { return !String(p.modalidade || '').trim() && !ehConvenio(p); }
// CPF e nascimento não são obrigatórios (gestão, 08/10), mas a recepção é avisada pra completar
function faltasDoc(p) { var f = []; if (p && !String(p.cpf || '').replace(/\D/g, '')) f.push('CPF'); if (p && !String(p.nasc || '').trim()) f.push('data de nascimento'); return f; }
function faltasDocTxt(p) { return faltasDoc(p).join(' e '); }
function modCurta(m) { return String(m || '').replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim(); }
function pacoteDe(p) { if (cobDe(p) === 'Pacote social') return { n: PACOTE_SOCIAL.n, valor: PACOTE_SOCIAL.valor }; return { n: Number(p.pctN) || 0, valor: Number(p.pctV) || 0 }; }
function valorSessaoPacote(p) { var k = pacoteDe(p); return k.n > 0 && k.valor > 0 ? Math.round(k.valor / k.n * 100) / 100 : null; }
function estPacote(p) { return (AT && AT.pacotesSessoes && p && AT.pacotesSessoes[p.nome]) || { disponiveis: 0, ultima: '', validade: '', faltasAvisadasMes: 0, sessoesMes: 0, aPagarMes: 0, renovouMes: false, vencido: false }; }
function sessoesTxt(n) { return n + (n === 1 || n === -1 ? ' sessão' : ' sessões'); }
function disponiveisTxt(n) { return n + (n === 1 ? ' sessão disponível' : ' sessões disponíveis'); }
function diaMes(d) { return String(d || '').slice(0, 5); }
// o que gasta sessão do pacote: igual ao servidor (consumoPacote_)
function consumoPacote(oque, proc, mesmaSemana, faltasAvisadasMes) {
  oque = String(oque || ''); proc = String(proc || '');
  if (/^(Aplicação de teste|Retorno|Renovação)/i.test(proc)) return { delta: 0, nota: 'aplicação de teste e retorno não gastam sessão' };
  if (/^Atendido/.test(oque) || /sem aviso/i.test(oque)) return { delta: -1, nota: '' };
  if (/em cima da hora/i.test(oque)) {
    if (mesmaSemana) return { delta: 0, nota: 'remarcada na mesma semana: não gasta sessão' };
    if (faltasAvisadasMes >= 1) return { delta: -1, nota: '2ª falta avisada do mês: gasta sessão' };
    return { delta: 0, nota: '1ª falta avisada do mês: não gasta sessão' };
  }
  if (/antecedência/i.test(oque)) return { delta: 0, nota: 'desmarcou com antecedência: não gasta sessão' };
  return { delta: 0, nota: 'cancelado pela clínica: não gasta sessão' };
}
// linha-resumo da cobrança (Registrar e painel da Agenda): [cor, texto]
// ex.: "Pacote de 4 sessões · R$ 280 · 2 sessões disponíveis · válidas até 30/11 · Pagamento: Antecipado"
function resumoCob(p, prof) {
  if (!p) return ['cinza', '—'];
  var cob = cobDe(p), pg = pagDe(p), partes = [], cor = 'cinza';
  if (!cob) partes.push('Tabela (cadastro sem cobrança definida)');
  else if (ehPacoteCob(p)) {
    var k = pacoteDe(p), e = estPacote(p);
    partes.push((cob === 'Pacote social' ? 'Pacote social de ' : 'Pacote de ') + sessoesTxt(k.n) + (k.valor ? ' · ' + brlCurto(k.valor) : ''));
    if (pg === 'Antecipado') {
      partes.push(disponiveisTxt(e.disponiveis));
      if (e.validade && e.disponiveis > 0) partes.push((e.vencido ? 'venceram em ' : 'válidas até ') + diaMes(e.validade));
      cor = e.disponiveis <= 0 || e.vencido ? 'vermelha' : e.disponiveis === 1 ? 'amarela' : 'verde';
    } else if (valorSessaoPacote(p) != null) partes.push('R$ ' + brl(valorSessaoPacote(p)) + ' por sessão');
  }
  else if (cob === 'Por sessão (combinado)') partes.push('Por sessão (combinado) · ' + (valorComb(p) != null ? brlCurto(valorComb(p)) : 'valor não informado'));
  else if (cob === 'Convênio') partes.push('Convênio ' + (p.convenio && p.convenio !== 'Particular' ? p.convenio : '(escolher)'));
  else if (cob === 'Pro bono' || cob === 'Permuta') partes.push(cob + ' · sem cobrança');
  else partes.push('Tabela' + (prof ? ' · ' + valorTabelaTxt(p, prof) : ''));
  partes.push('Pagamento: ' + pg);
  return [cor, partes.join(' · ')];
}
function valorTabelaTxt(p, prof) {
  if (!AT || !prof) return 'valor da tabela';
  var base = tiposDe(espsDoProf(prof)).filter(function (x) { return /^(Sessão|Consulta)/.test(x.nome); })[0], pr = base ? procObj(derivarProc(base.nome, p)) : null;
  return pr && pr.valor != null ? 'R$ ' + brl(pr.valor) : 'valor da tabela';
}
function espsDoProf(nome) { var pr = (BOOT.profissionais || []).filter(function (x) { return x.nome === nome; })[0]; if (!pr) return []; var e = pr.especialidade.toLowerCase(), out = []; ESP_KEYS.forEach(function (k) { if (e.indexOf(k[0]) >= 0 && out.indexOf(k[1]) < 0) out.push(k[1]); }); return out; }
function procsDe(esps) { return AT.procedimentos.filter(function (p) { return !esps.length || esps.indexOf(p.especialidade) >= 0; }); }
function ehVariante(p, lista) { var i = p.nome.indexOf(' – '); if (i < 0) return false; var base = p.nome.slice(0, i); return lista.some(function (q) { return q.nome === base; }); }
function tiposDe(esps) { var l = procsDe(esps); return l.filter(function (p) { return !ehVariante(p, l) && !/\(compra\)/.test(p.nome) && !/^Mensalidade|^Renovação/.test(p.nome); }); }
function procObj(nome) { return AT.procedimentos.filter(function (p) { return p.nome === nome; })[0] || null; }
// valor da sessão pra mostrar junto da cobrança (painel da Agenda e cartão do Registrar)
function valorSessaoTxt(p, prof) {
  if (!p) return '—';
  if (ehProBono(p)) return 'sem cobrança';
  if (cobConvenio(p)) return 'convênio (R$ 0)';
  var pg = pagDe(p), quando = pg === 'Posterior' ? ' · paga no fim do mês' : pg === 'Antecipado' ? ' · pago adiantado' : '';
  if (ehPacoteCob(p)) { var vp = valorSessaoPacote(p); return pg === 'Antecipado' ? 'já paga no pacote' + (vp != null ? ' (R$ ' + brl(vp) + ')' : '') : (vp != null ? 'R$ ' + brl(vp) + ' (pacote ÷ sessões)' : 'pacote sem valor no cadastro') + quando; }
  if (cobDe(p) === 'Por sessão (combinado)' && valorComb(p) != null) return 'R$ ' + brl(valorComb(p)) + ' (combinado)' + quando;
  return valorTabelaTxt(p, prof) + (prof && AT ? ' (tabela)' : '') + quando;
}
// sessões de pacote/convênio não entram nas pendências de pagamento; as de pacote no Posterior entram (Pago? = Não)
function pendentePagamento(r) { return (r.pago === '' || r.pago === 'Não' || r.pago === 'Parcial') && (!/^Mensalidade|plano|mensal|convênio|AAPI/i.test(r.procedimento) || /\(compra\)/i.test(r.procedimento)); }
// procedimento pela cobrança: convênio usa a variante "– convênio"; pacote e o resto usam o procedimento base
function derivarProc(base, p) {
  var l = AT.procedimentos, cands = l.filter(function (q) { return q.nome.indexOf(base + ' – ') === 0; });
  if (!cands.length || !p) return base;
  var chave = cobConvenio(p) ? 'convênio' : /cartão/i.test(p.modalidade || '') ? 'cartão' : '';
  var c = chave ? cands.filter(function (q) { return q.nome.toLowerCase().indexOf(chave) >= 0; })[0] : null;
  return c ? c.nome : base;
}
// tags da linha (Agenda) e do cartão do paciente
function tagsDe(p) {
  var t = [];
  if (!p) return t;
  var cob = cobDe(p), pg = pagDe(p);
  if (p.obsCobranca && !ehProBono(p) && !cobConvenio(p)) t.push({ cor: 'laranja', ic: 'alerta', txt: 'ver observação de cobrança' });
  if (ehProBono(p)) t.push({ cor: 'lilas', txt: cob });
  if (ehPacoteCob(p)) {
    if (pg === 'Antecipado') { var e = estPacote(p); t.push({ cor: e.disponiveis <= 0 || e.vencido ? 'vermelha' : e.disponiveis === 1 ? 'amarela' : 'verde', txt: e.disponiveis <= 0 ? 'pacote esgotado' : e.vencido ? 'pacote vencido' : 'pacote · ' + disponiveisTxt(e.disponiveis) }); }
    else t.push({ cor: 'cinza', txt: (cob === 'Pacote social' ? 'pacote social' : 'pacote') + ' · paga no fim do mês' });
  } else if (cob === 'Por sessão (combinado)') t.push({ cor: 'cinza', txt: (valorComb(p) != null ? 'R$ ' + brl(valorComb(p)) + '/sessão' : 'por sessão') + (pg === 'Posterior' ? ' · paga no fim do mês' : pg === 'Antecipado' ? ' · antecipado' : '') });
  else if (cob === 'Tabela' && pg === 'Posterior') t.push({ cor: 'cinza', txt: 'paga no fim do mês' });
  if (ehConvenio(p)) t.push({ cor: 'lilas', txt: 'Convênio ' + p.convenio });
  if (cadastroIncompleto(p)) t.push({ cor: 'laranja', ic: 'alerta', txt: 'cobrança em branco · completar cadastro' });
  if (faltasDoc(p).length) t.push({ cor: 'laranja', ic: 'alerta', txt: 'sem ' + faltasDocTxt(p) + ' · completar cadastro' });
  return t;
}
function tagHtml(t, p) { return '<span class="tag ' + (p ? 'p ' : '') + t.cor + '">' + (t.ic ? ic(t.ic, 13, 2.5) : '') + esc(t.txt) + '</span>'; }

/* ---------- navegação ---------- */
/* ---------- correção de um lançamento já gravado na aba do mês (gestão e recepção usam o mesmo formulário) ---------- */
// reg: { id, oque, pago, forma, nf, nfN, guia, quem, valor, convenio, dataPag } · foco: 'pag' | 'nf' | 'guia' | 'obs' | 'todos'
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
      var prOpts = (AT && AT.procedimentos || []).map(function (x) { return x.nome; }); if (reg.procedimento && prOpts.indexOf(reg.procedimento) < 0) prOpts.unshift(reg.procedimento);
      var oqOpts = (BOOT.listas.oque || []).slice(); if (reg.oque && oqOpts.indexOf(reg.oque) < 0) oqOpts.unshift(reg.oque);
      var sel = function (k, opts, atual) { return '<select data-c="' + k + '">' + opts.map(function (o) { return '<option' + (o === atual ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>'; };
      html += '<div class="c2 faixa nota">Lançou por engano (duplicado, paciente errado)? <button type="button" class="btn link" data-engano>Marcar como lançado por engano</button> A linha vira "Cancelado pela clínica" (nada é apagado) e, se for sessão de plano, a consulta volta pro plano.</div>';
      html += '<label class="campo">Data<input data-c="data" inputmode="numeric" maxlength="10" value="' + esc(reg.data || '') + '"></label><label class="campo">Hora<input data-c="hora" inputmode="numeric" maxlength="5" value="' + esc(reg.hora || '') + '"></label>' +
        '<label class="campo c2">Paciente<input data-c="paciente" list="dl-pacientes" autocomplete="off" value="' + esc(reg.paciente || '') + '"></label>' +
        '<label class="campo">Profissional' + sel('profissional', (BOOT.profissionais || []).map(function (x) { return x.nome; }).concat(reg.profissional && !(BOOT.profissionais || []).some(function (x) { return x.nome === reg.profissional; }) ? [reg.profissional] : []), reg.profissional) + '</label>' +
        '<label class="campo">O que aconteceu' + sel('oque', oqOpts, reg.oque) + '</label>' +
        '<label class="campo c2">Procedimento' + sel('procedimento', prOpts, reg.procedimento) + '</label>' +
        '<label class="campo">Valor da sessão<div class="campo-wrap"><span class="prefixo">R$</span><input data-c="valor" class="dinheiro" inputmode="decimal" value="' + (reg.valor !== '' && reg.valor != null ? brl(reg.valor) : '') + '"></div></label>';
    }
    var mostraPago = foco === 'amplo' || (atendido && (foco === 'nf' || foco === 'todos')), mostraGuia = foco === 'guia' || ((foco === 'todos' || foco === 'amplo') && conv);
    var pagoOpts = (BOOT.listas.pago || []).slice(); if (pagoOpts.indexOf('Parcial') < 0) pagoOpts.push('Parcial'); if (reg.pago && pagoOpts.indexOf(reg.pago) < 0) pagoOpts.unshift(reg.pago); if (!reg.pago) pagoOpts.unshift('');
    var pagoIni = foco === 'nf' && (!reg.pago || reg.pago === 'Não') ? 'Sim' : (reg.pago || '');
    if (mostraPago) html += '<label class="campo">Pago?<select data-c="pago">' + pagoOpts.map(function (o) { return '<option value="' + esc(o) + '"' + (o === pagoIni ? ' selected' : '') + '>' + esc(o || '(em branco)') + '</option>'; }).join('') + '</select></label>' +
      '<label class="campo" data-parcial>Valor já recebido<div class="campo-wrap"><span class="prefixo">R$</span><input data-c="valorRecebido" class="dinheiro" inputmode="decimal" value="' + (reg.recebido ? brl(reg.recebido) : '') + '"></div></label>' +
      '<label class="campo" data-sim>Data do pagamento<input data-c="dataPagamento" inputmode="numeric" maxlength="10" value="' + esc(reg.dataPag || hojeStr()) + '"></label>' + forma + quem + nf;
    if (mostraGuia) html += '<label class="check forte c2"><input type="checkbox" data-c="guia"' + (reg.guia === 'Sim' ? ' checked' : '') + '> Guia assinada</label>';
    if (foco === 'amplo') html += '<label class="campo c2">Quem informou / motivo <span class="leg">(obrigatório se mudar data, paciente, profissional, procedimento ou valores)</span><input data-c="quemInformou" autocomplete="off" placeholder="ex.: extrato do Pix de 12/09 mostra R$ 80"></label>';
  }
  html += '<label class="campo c2">Acrescentar à observação' + (foco === 'obs' ? '' : ' <span class="leg">(opcional)</span>') + '<input data-c="observacao" autocomplete="off" placeholder="' + (foco === 'obs' ? 'ex.: taxa de falta — cobrar no próximo atendimento (gestão)' : 'ex.: pagou depois, por Pix') + '"></label></div>';
  var box = el('<div>' + html + '</div>');
  var fSel = $('[data-c=forma]', box); if (fSel) { preencherSelect(fSel, BOOT.listas.formas || [], '—'); setSel(fSel, foco === 'pag' ? '' : (reg.forma || '')); }
  var nfSel = $('[data-c=nf]', box); if (nfSel) setSel(nfSel, foco === 'nf' ? 'Sim' : foco === 'pag' ? 'Não' : (reg.nf || 'Não'));
  var pSel = $('[data-c=pago]', box), soSim = function () { var v = pSel ? pSel.value : 'Sim', sim = v === 'Sim' || v === 'Parcial'; $$('[data-sim]', box).forEach(function (l) { l.hidden = !sim; }); $$('[data-parcial]', box).forEach(function (l) { l.hidden = v !== 'Parcial'; }); };
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
  var val = v('valor'); if (val) { var nv = num(val.value); if (nv !== (reg.valor === '' || reg.valor == null ? null : Number(reg.valor))) c.valor = val.value.trim(); }
  var pago = v('pago');
  if (pago) {
    if (pago.value !== (reg.pago || '') || v('valor') == null) c.pago = pago.value;
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
  if (c.pago === 'Parcial') { var vr = num(c.valorRecebido != null ? c.valorRecebido : reg.recebido); if (!(vr > 0 && vr < valor)) e.push('Pago? = Parcial: o "valor já recebido" tem de ser maior que zero e menor que o valor da sessão.'); }
  if (c.dataPagamento && !dataValida(c.dataPagamento)) e.push('Data do pagamento inválida (dd/mm/aaaa).');
  if (c.data && !dataObj(c.data)) e.push('Data da sessão inválida (dd/mm/aaaa).');
  var amplo = ['data', 'hora', 'paciente', 'profissional', 'procedimento', 'oque', 'valor', 'valorRecebido'].some(function (k) { return c[k] != null; });
  if (amplo && !c.quemInformou) e.push('Mudou dados da sessão ou valores: preencha "Quem informou / motivo".');
  if (!Object.keys(c).filter(function (k) { return k !== 'quemInformou'; }).length) e.push('Nada pra corrigir: mude algum campo ou escreva na observação.');
  return e;
}

var TELAS = { hoje: 's-hoje', registrar: 's-registrar', pacientes: 's-pacientes', pacotes: 's-pacotes', gestao: 's-gestao' };
var TITULOS = { hoje: 'Agenda', registrar: 'Registrar atendimento', pacientes: 'Pacientes', pacotes: 'Pacotes', gestao: 'Pendências' };
var telaAtual = 'hoje';
var INICIAR = {};
function go(id, extra) {
  if (!TELAS[id]) id = 'hoje';
  telaAtual = id;
  Object.keys(TELAS).forEach(function (k) { $("#" + TELAS[k]).hidden = id !== k; });
  $("#a-rodape").hidden = id !== 'registrar' || !AT;
  $("#p-rodape").hidden = id !== 'pacientes' || !BOOT;
  $$("[data-go]").forEach(function (b) { if (b.dataset.go === id) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  $("#titulo-cel").textContent = TITULOS[id];
  document.title = TITULOS[id] + ' · Recepção Nascente';
  if (INICIAR[id]) INICIAR[id](extra);
  window.scrollTo(0, 0);
}
$$("[data-go]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); go(b.dataset.go); }); });
$$("#logo-link, #logo-link-cel").forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); go('hoje'); }); });
$$(".imprimir").forEach(function (b) { b.addEventListener('click', function () { window.print(); }); }); // Imprimir de cada tela, como nos mockups
document.addEventListener('click', function (e) { if (!e.target.closest('.mais')) $$('.mais-menu').forEach(function (m) { m.remove(); }); });

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
