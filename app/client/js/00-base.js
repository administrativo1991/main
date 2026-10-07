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
var mockPacientes = [{ linha: 2, nome: 'Beatriz Almeida Rocha', nasc: '03/05/1994', modalidade: 'Consulta individual', regra: 'Tabela', obsCobranca: '', pagador: 'Beatriz Almeida Rocha', convenio: 'Particular', valorCombinado: '' },
  { linha: 3, nome: 'Carlos Henrique Dias', nasc: '21/09/1979', modalidade: 'Por sessão', regra: 'Paga o que consegue', obsCobranca: 'Paga o que consegue — o que pagar quita a sessão. Referência: R$ 70/sessão.', pagador: 'Carlos Henrique Dias', convenio: 'Particular', valorCombinado: '' },
  { linha: 4, nome: 'Theo Barreto Lima', nasc: '12/07/2015', modalidade: 'Mensal (valor especial)', regra: 'Mensalidade fixa (independe do nº de sessões)', obsCobranca: 'R$ 150/mês fixo, independente do nº de sessões.', pagador: 'Daniela Barreto Lima', convenio: 'Particular', valorCombinado: 'R$ 150/mês' },
  { linha: 5, nome: 'Lívia Fontes Pereira', nasc: '26/01/2010', modalidade: 'Pro bono', regra: 'Pro bono', obsCobranca: 'Não cobrar. Só registrar o atendimento.', pagador: '', convenio: 'Particular', valorCombinado: '' },
  { linha: 6, nome: 'Pedro Augusto Neves', nasc: '31/07/1980', modalidade: 'Convênio', regra: 'Convênio', obsCobranca: 'Cedplan — guia assinada antes da sessão.', pagador: '', convenio: 'Cedplan', valorCombinado: '' },
  { linha: 7, nome: 'Sofia Ramos Teixeira', nasc: '16/06/1999', modalidade: 'Mensalidade fixa', regra: '', obsCobranca: '', pagador: 'Associação Boa Esperança', convenio: 'Particular', valorCombinado: '' },
  { linha: 8, nome: 'Ana Luísa Fontes Braga', nasc: '14/02/1996', modalidade: 'Plano de 4 consultas', regra: 'Tabela', obsCobranca: '', pagador: 'Ana Luísa Fontes Braga', convenio: 'Particular', valorCombinado: 'Plano de 4 consultas: R$ 280 por plano' },
  { linha: 9, nome: 'Luana Castro Figueiredo', nasc: '30/10/1988', modalidade: 'Plano de 4 consultas', regra: 'Tabela', obsCobranca: '', pagador: 'Luana Castro Figueiredo', convenio: 'Particular', valorCombinado: 'Plano de 4 consultas: R$ 320 por plano' },
  { linha: 10, nome: 'Helena Vasconcelos Prado', nasc: '02/02/2024', modalidade: '', regra: '', obsCobranca: '', pagador: 'Renata Vasconcelos Prado', convenio: 'Particular', valorCombinado: '' },
  { linha: 11, nome: 'Marcos Vinícius Tavares', nasc: '08/12/1989', modalidade: 'Consulta individual', regra: 'Valor fixo combinado', obsCobranca: 'Sessão R$ 100 combinado com a Juliana.', pagador: 'Marcos Vinícius Tavares', convenio: 'Particular', valorCombinado: 'Sessão R$ 100' }];
function mock(nome, d) {
  return new Promise(function (res) { setTimeout(function () {
    if (nome === 'bootstrap') return res({ usuario: { email: 'simulacao@local', perfil: 'gestao' }, planilha: '(simulação, sem planilha)', hora: '',
      lembrete: mockLemb[mockLemb.length - 1], lembretes: mockLemb.slice(-5).reverse(),
      listas: { oque: ["Atendido", "Desmarcou com antecedência (≥ 24h)", "Faltou avisando em cima da hora (< 24h)", "Faltou sem aviso", "Cancelado pela clínica"], pago: ["Sim", "Não", "Convênio (fatura)", "Mensalista (paga no mês seguinte)", "Plano já pago", "Não se aplica (pro bono / permuta)"], formas: ["Pix", "Dinheiro", "Cartão de débito", "Cartão de crédito", "Link de pagamento"], modalidades: ["Consulta individual", "Consulta individual – cartão de parceria", "Plano de 4 consultas", "Plano de 6 consultas", "Plano de 12 consultas", "Mensalidade fixa", "Mensal (valor especial)", "AAPI JF (mensal)", "Convênio", "Por sessão", "Pro bono", "Permuta"],
        modalidadesEsp: [{ nome: 'Plano de 6 consultas', esp: 'Nutrição' }, { nome: 'Por sessão', esp: 'Psicologia' }, { nome: 'Mensalidade fixa', esp: 'Psicologia' }, { nome: 'Mensal (valor especial)', esp: 'Psicologia' }], regras: ["Tabela", "Paga o que consegue", "Valor fixo combinado", "Mensalidade fixa (independe do nº de sessões)", "Pro bono", "Permuta", "Convênio"],
        convenios: ["Particular", "Cedplan", "Sabin Sinai", "Unafisco", "AAPI JF", "Plan Minas", "PLASC", "AMIL", "ASSEFAZ", "FUSEX", "IPSM", "Sulamérica", "18 de Julho", "Aeronáutica"] },
      profissionais: mockProfs, pacientes: mockBase.concat(mockPacientes.map(function (p) { return { linha: p.linha + 10, nome: p.nome, cpf: '', nasc: p.nasc, pagador: p.pagador, modalidade: p.modalidade, convenio: p.convenio, ativo: 'Sim' }; })) });
    if (nome === 'bootstrapAtendimento') return res({ hoje: hojeStr(), abaMes: MESES_PT[new Date().getMonth()], abaMesExiste: true, mensalistasInfo: { modeloNovo: true, mes: MESES_PT[new Date().getMonth()].toUpperCase(), coluna: MESES_PT[new Date().getMonth()].toUpperCase() + ' — pago?' },
      procedimentos: [{ nome: 'Consulta pediátrica', especialidade: 'Pediatria', valor: 200 }, { nome: 'Consulta pediátrica – cartão de parceria ou AAPI JF', especialidade: 'Pediatria', valor: 160 }, { nome: 'Retorno pediátrico (com pedido de exames, até 30 dias)', especialidade: 'Pediatria', valor: 0 },
        { nome: 'Anamnese psicologia', especialidade: 'Psicologia', valor: 140 }, { nome: 'Sessão de psicologia', especialidade: 'Psicologia', valor: 120 }, { nome: 'Sessão de psicologia – cartão de parceria', especialidade: 'Psicologia', valor: 100 }, { nome: 'Sessão de psicologia – plano de 4 consultas', especialidade: 'Psicologia', valor: 0 }, { nome: 'Sessão de psicologia – mensalidade fixa', especialidade: 'Psicologia', valor: 0 }, { nome: 'Sessão de psicologia – mensal valor especial', especialidade: 'Psicologia', valor: 0 }, { nome: 'Sessão de psicologia – convênio', especialidade: 'Psicologia', valor: 0 }, { nome: 'Taxa de falta – psicologia', especialidade: 'Psicologia', valor: 120 }, { nome: 'Aplicação de teste – avaliação neuropsicológica', especialidade: 'Psicologia', valor: 0 }, { nome: 'Avaliação neuropsicológica', especialidade: 'Psicologia', valor: null }, { nome: 'Plano de 4 consultas – psicologia (compra)', especialidade: 'Psicologia', valor: 400 }, { nome: 'Plano de 12 consultas – psicologia (compra)', especialidade: 'Psicologia', valor: 960 }],
      pacotes: { 'Ana Luísa Fontes Braga': { id: 'P-1', n: 4, usadas: 2, compra: '03/11/2026', validade: '29/12/2026', status: 'ativo', pago: 'Não' }, 'Luana Castro Figueiredo': { id: 'P-2', n: 4, usadas: 4, compra: '13/10/2026', validade: '08/12/2026', status: 'encerrado' } },
      mensalistas: { 'Sofia Ramos Teixeira': { modalidade: 'Mensalidade fixa', valor: 200, pagador: 'Associação Boa Esperança', mes: 'NOVEMBRO', pago: '', dataPago: '' }, 'Theo Barreto Lima': { modalidade: 'Mensal (valor especial)', valor: 150, pagador: 'Daniela Barreto Lima', mes: 'NOVEMBRO', pago: 'Sim', dataPago: '06/11/2026' } },
      pacientes: mockPacientes });
    if (nome === 'salvarLembrete') { var nl = { linha: mockLemb.length + 2, data: hojeStr() + ' ' + agoraHora(), texto: d.encerrar ? '' : d.texto, validoAte: d.encerrar ? '' : (d.validoAte || ''), quem: 'simulacao@local' }; mockLemb.push(nl); return res({ ok: true, linha: nl.linha, lembrete: nl.texto ? nl : null, lembretes: mockLemb.slice(-5).reverse() }); }
    if (nome === 'registrarAtendimento') { var mp = mockPacientes.filter(function (p) { return p.nome === d.paciente; })[0]; mockReg.push({ paciente: d.paciente, profissional: d.profissional, oque: d.oque, hora: d.hora, data: d.data, procedimento: d.procedimento, id: 'A-sim-' + (mockReg.length + 1), valor: num(d.valor) || 0, pago: d.pago || '', forma: d.forma || '', nf: d.nf || '', guia: d.guia || '', convenio: mp ? mp.convenio : '' }); return res({ ok: true, id: 'A-sim-' + mockReg.length, linha: 41 + mockReg.length, aba: MESES_PT[new Date().getMonth()], pacote: d.pacoteId && !d.sessaoExtra ? { usadas: 3, n: 4 } : null }); }
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
    if (nome === 'lerCadastro') { var pc = (AT ? AT.pacientes : []).filter(function (p) { return p.nome === d.nome; })[0]; if (!pc) return res({ ok: false, erros: ['Paciente não encontrado em Pacientes.'] }); return res({ ok: true, nome: pc.nome, nasc: pc.nasc, cpfFinal: '4725', indicacao: '', primeira: '', campos: { modalidade: pc.modalidade, convenio: pc.convenio, carteirinha: '', regra: pc.regra, valorCombinado: pc.valorCombinado, obsCobranca: pc.obsCobranca, pagador: pc.pagador, whats: '', profRef: '' } }); }
    if (nome === 'atualizarCadastro') return res({ ok: true, alterados: Object.keys(d.campos || {}).slice(0, 2) });
    if (nome === 'removerDoDia') { mockDia = mockDia.filter(function (x) { return x.id !== d.id; }); return res({ ok: true }); }
    if (nome === 'mensalistasPainel') return res({ itens: [{ linha: 2, paciente: 'Sofia Ramos Teixeira', modalidade: 'Mensalidade fixa', valor: 200, pagador: 'Associação Boa Esperança', pago: '', dataPago: '', obs: '', sessoes: 3 }, { linha: 3, paciente: 'Theo Barreto Lima', modalidade: 'Mensal (valor especial)', valor: 150, pagador: 'Daniela Barreto Lima', pago: 'Sim', dataPago: '06/11/2026 — R$ 150,00 Pix · NF 67 · app', obs: '', sessoes: 5 }, { linha: 4, paciente: 'Adirlene Rufino Rodrigues', modalidade: 'Plano de 4 consultas · mensalista só até outubro', valor: 280, pagador: '', pago: 'Não', dataPago: 'deve R$ 280 (recepção 03/10)', obs: '', sessoes: 2 }], colunas: ['SETEMBRO (paga em outubro) — pago?', 'OUTUBRO — pago?', 'NOVEMBRO — pago?'], coluna: d.coluna || 'NOVEMBRO — pago?', mes: 'NOVEMBRO', anterior: { coluna: 'OUTUBRO — pago?', mes: 'OUTUBRO', pendentes: 26 }, modeloNovo: true, abaMes: MESES_PT[new Date().getMonth()], hoje: hojeStr() });
    if (nome === 'registrarMensalidade') return res({ ok: true, id: 'A-sim-m', linha: 50, aba: MESES_PT[new Date().getMonth()] });
    if (nome === 'criarColunasMes') return res({ ok: true, coluna: d.mes.toUpperCase() + ' — pago?' });
    if (nome === 'criarAbaMes') return res({ ok: true, aba: d.nome, modelo: 'Outubro' });
    if (nome === 'exportarMes') return res({ ok: true, nome: 'OUT 26 - Recepção atendimentos (app)', url: '#drive', xlsx: '#xlsx', linhas: 12, pasta: 'Controle Financeiro/2026/10 Out_26/2_Atendimentos', criadas: [], aviso: '', atualizado: '05/10/2026 12:00' });
    if (nome === 'gestaoResumo') return res({ ok: true, mes: d.mes || MESES_PT[new Date().getMonth()], abaExiste: true, total: 40, atendidos: 35, recebido: 3120, pagamentoPendente: [{ id: 'A-sim-g1', data: hojeStr(), hora: '09:00', paciente: 'Beatriz Almeida Rocha', profissional: 'Juliana Ribeiro', procedimento: 'Sessão de psicologia', valor: 120, pago: '', obs: '' }], nfPendente: [{ id: 'A-sim-g2', data: hojeStr(), hora: '', paciente: 'Marcos Vinícius Tavares', valor: 100, forma: 'Pix', quem: '', nf: 'Não', pago: 'Sim' }], semGuia: [{ id: 'A-sim-g3', data: hojeStr(), hora: '10:00', paciente: 'Pedro Augusto Neves', convenio: 'Cedplan', profissional: 'Juliana Ribeiro', guia: '' }], faltas: [{ id: 'A-sim-g4', data: '05/11/2026', hora: '10:00', paciente: 'Pedro Augusto Neves', profissional: 'Juliana Ribeiro', oque: 'Faltou sem aviso', obs: '' }], descontos: [{ id: 'A-sim-g5', data: '06/11/2026', hora: '', paciente: 'Carlos Henrique Dias', procedimento: 'Sessão de psicologia', valor: 90, obs: 'Desconto: R$ 90,00 (tabela R$ 120,00) — Juliana', log: 'simulacao@local · 06/11/2026 10:00' }], extras: [], pagadorDiferente: [{ id: 'A-sim-g6', data: hojeStr(), hora: '', paciente: 'Helena Vasconcelos Prado', quem: 'Avó', valor: 200, nf: 'Sim' }], alteracoes: [{ quando: '05/11/2026 09:12', paciente: 'Yandra Duarte Pires', campo: 'Convênio', de: '', para: 'Sabin Sinai', quem: 'carteirinha apresentada', por: 'simulacao@local' }], mesesExistentes: ['Setembro', 'Outubro', 'Novembro'], colunasMensalistas: ['SETEMBRO', 'OUTUBRO', 'NOVEMBRO'] });
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
var MOD_RESTRITA = ["Mensalidade fixa", "Mensal (valor especial)", "AAPI JF (mensal)"];
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

/* ---------- cadastro: leitura das regras (iguais ao app anterior) ---------- */
function pacInfo(nome) { return (AT && AT.pacientes.filter(function (p) { return p.nome === nome; })[0]) || null; }
function ehMensal(p) { return /^Mensalidade fixa|^Mensal \(valor especial\)|\(mensal\)|\/mês|^Social|preexistente/.test(p.modalidade || '') || /^Mensalidade fixa/.test(p.regra || ''); }
function ehPacote(p) { return /^(Plano|Pacote) /.test(p.modalidade || '') && !/mensal/.test(p.modalidade || ''); }
function ehConvenio(p) { return !!(p.convenio && p.convenio !== 'Particular'); }
function ehProBono(p) { return /^Pro bono|^Permuta/.test(p.regra || '') || /^Pro bono|^Permuta/.test(p.modalidade || ''); }
function cadastroIncompleto(p) { return !p.modalidade && !p.regra && !ehConvenio(p); }
function modCurta(m) { return String(m || '').replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim(); }
function regraRelevante(p) { return !!(p.regra && !/^Tabela$/i.test(p.regra) && p.regra !== p.modalidade && !(ehConvenio(p) && /^Conv[êe]nio$/i.test(p.regra)) && !(/^Mensalidade fixa/.test(p.regra) && ehMensal(p))); }
function refValor(p) { var m = String((p.obsCobranca || '') + ' ' + (p.valorCombinado || '')).match(/R\$\s?([\d.]+(?:,\d{1,2})?)/); return m ? num(m[1]) : null; }
function espsDoProf(nome) { var pr = (BOOT.profissionais || []).filter(function (x) { return x.nome === nome; })[0]; if (!pr) return []; var e = pr.especialidade.toLowerCase(), out = []; ESP_KEYS.forEach(function (k) { if (e.indexOf(k[0]) >= 0 && out.indexOf(k[1]) < 0) out.push(k[1]); }); return out; }
function procsDe(esps) { return AT.procedimentos.filter(function (p) { return !esps.length || esps.indexOf(p.especialidade) >= 0; }); }
function ehVariante(p, lista) { var i = p.nome.indexOf(' – '); if (i < 0) return false; var base = p.nome.slice(0, i); return lista.some(function (q) { return q.nome === base; }); }
function tiposDe(esps) { var l = procsDe(esps); return l.filter(function (p) { return !ehVariante(p, l) && !/\(compra\)/.test(p.nome) && !/^Mensalidade/.test(p.nome); }); }
function procObj(nome) { return AT.procedimentos.filter(function (p) { return p.nome === nome; })[0] || null; }
function procCompra(n, prof) { var esps = espsDoProf(prof); return (AT ? AT.procedimentos : []).filter(function (p) { return /\(compra\)/.test(p.nome) && new RegExp('\\b' + n + '\\b').test(p.nome) && (!esps.length || esps.concat(['Psicologia']).indexOf(p.especialidade) >= 0); })[0] || null; }
// nº de consultas vem do nome da modalidade; o valor vem do cadastro (primeiro "R$" em Valor combinado), senão da tabela (procedimento de compra), senão fica à mão
function pacoteInfoMod(m, p, prof) { var n = parseInt((String(m || '').match(/(\d+)\s*(sessões|consultas)/) || [])[1], 10) || 4; var vc = (p && p.valorCombinado || '').match(/R\$\s?([\d.]+(?:,\d{1,2})?)/), vm = String(m || '').match(/R\$\s?([\d.]+)/); var v = vc ? num(vc[1]) : (vm ? num(vm[1]) : null); if (v == null) { var pc = procCompra(n, prof); if (pc && pc.valor != null) v = pc.valor; } return { n: n, valor: v }; }
function planoAPagar(pk) { return !!(pk && pk.pago && pk.pago !== 'Sim'); } // plano lançado "vai pagar depois": consultas contam, compra fica a receber
// compra de plano a receber entra nas pendências de pagamento; sessões de plano/mensalidade/convênio não
function pendentePagamento(r) { return (r.pago === '' || r.pago === 'Não') && (!/^Mensalidade|pacote|plano|mensal|convênio|AAPI/i.test(r.procedimento) || /\(compra\)/i.test(r.procedimento)); }
function planoAtivo(p) { var pk = AT && AT.pacotes[p.nome]; return !!(pk && pk.status === 'ativo' && (pk.n - pk.usadas) > 0 && !(pk.validade && venceu(pk.validade))); }
function derivarProc(base, p) {
  var l = AT.procedimentos, cands = l.filter(function (q) { return q.nome.indexOf(base + ' – ') === 0; });
  if (!cands.length || !p) return base;
  var m = (p.modalidade || '').toLowerCase(), regra = (p.regra || '').toLowerCase(), chaves = [];
  if (ehPacote(p)) { var ok = planoAtivo(p); if ((!ok || p._avulsa) && !p._extra) return base; }
  if (regra === 'convênio' || m === 'convênio') chaves.push('convênio');
  else if (m.indexOf('cartão') >= 0) chaves.push('cartão');
  else if (/^(plano de|pacote) 4/.test(m) || /psicopedagogia 4|aba 4/.test(m)) chaves.push('plano de 4');
  else if (/^(plano de|pacote) 12|nutrição 12/.test(m)) chaves.push('plano de 12');
  else if (/^plano de 6|nutrição 6/.test(m)) chaves.push('plano de 6');
  else if (/^mensalidade fixa|^social|preexistente/.test(m)) chaves.push('mensalidade fixa');
  else if (/valor especial/.test(m)) chaves.push('mensal valor especial');
  else if (/aapi jf/.test(m)) chaves.push('aapi jf');
  for (var i = 0; i < chaves.length; i++) { var c = cands.filter(function (q) { return q.nome.toLowerCase().indexOf(chaves[i]) >= 0; })[0]; if (c) return c.nome; }
  return base;
}
// situação da mensalidade do paciente: [classe, texto curto, texto longo]
function situacaoMensal(p) {
  var m = AT.mensalistas[p.nome], info = AT.mensalistasInfo || {}, dia = new Date().getDate(), mes = ((m && m.mes) || info.mes || '').toLowerCase();
  var mesTit = mes ? mes.charAt(0).toUpperCase() + mes.slice(1) : 'Mês';
  if (m && /^sim/i.test(m.pago)) return ['verde', mesTit + ' pago', 'Mensalista em dia · ' + mes + ' pago em ' + (m.dataPago || '—') + (m.valor ? ' · R$ ' + brl(m.valor) : '') + (m.pagador ? ' (' + m.pagador + ')' : '') + '. Não cobra a sessão.'];
  if (!info.modeloNovo) return ['cinza', 'mensalista · modelo antigo', (m ? 'Mensalidade de ' + mes + ' ainda não marcada como paga em Mensalistas.' : 'Não encontrei este paciente na aba Mensalistas.') + ' Registre o atendimento normalmente.'];
  if (dia >= 16) return ['vermelha', mesTit + ' atrasado', 'Mensalidade de ' + mes + ' atrasada desde o dia 16' + (m ? '' : ' (paciente não encontrado na aba Mensalistas)')];
  if (dia >= 11) return ['amarela', mesTit + ' venceu dia 10', 'Mensalidade venceu dia 10 · tolerância até dia 15. Receba hoje, se possível; depois do dia 15 o atendimento pausa.'];
  return ['amarela', mesTit + ' em aberto · vence dia 10', 'Mensalidade de ' + mes + ' ainda não paga. Vence dia 10; lembre o pagador.'];
}
// tags da linha (Hoje) e do cartão do paciente: vêm do cadastro + planos + mensalistas
function tagsDe(p) {
  var t = [];
  if (!p) return t;
  if (regraRelevante(p) || (p.obsCobranca && !ehMensal(p) && !ehConvenio(p) && !ehProBono(p))) {
    var ref = /^Paga o que/i.test(p.regra) ? refValor(p) : null;
    t.push({ cor: 'laranja', ic: 'alerta', txt: modCurta(p.regra || 'Atenção na cobrança') + (ref ? ' · ref. R$ ' + (ref % 1 ? brl(ref) : ref) : '') });
  }
  if (ehProBono(p)) t.push({ cor: 'lilas', txt: /permuta/i.test(p.regra + p.modalidade) ? 'Permuta' : 'Pro bono' });
  if (ehMensal(p)) { var s = situacaoMensal(p); t.push({ cor: s[0], txt: s[1] }); }
  if (ehPacote(p)) { var pk = AT.pacotes[p.nome]; if (pk && pk.status === 'ativo') { var rr = pk.n - pk.usadas, venc = pk.validade && venceu(pk.validade); t.push({ cor: venc ? 'vermelha' : rr <= 0 ? 'vermelha' : (rr === 1 || planoAPagar(pk)) ? 'amarela' : 'verde', txt: 'Plano ' + pk.usadas + '/' + pk.n + (venc ? ' · vencido' : rr === 1 ? ' · última' : '') + (planoAPagar(pk) ? ' · a pagar' : '') }); } else t.push({ cor: 'vermelha', txt: 'sem plano ativo' }); }
  if (ehConvenio(p)) t.push({ cor: 'lilas', txt: 'Convênio ' + p.convenio });
  if (cadastroIncompleto(p)) t.push({ cor: 'laranja', ic: 'alerta', txt: 'sem modalidade · completar cadastro' });
  return t;
}
function tagHtml(t, p) { return '<span class="tag ' + (p ? 'p ' : '') + t.cor + '">' + (t.ic ? ic(t.ic, 13, 2.5) : '') + esc(t.txt) + '</span>'; }

/* ---------- navegação ---------- */
/* ---------- correção de um lançamento já gravado na aba do mês (gestão e recepção usam o mesmo formulário) ---------- */
// reg: { id, oque, pago, forma, nf, nfN, guia, quem, valor, convenio, dataPag } · foco: 'pag' | 'nf' | 'guia' | 'obs' | 'todos'
function ehConvReg(reg, p) { return !!((p && ehConvenio(p)) || (reg.convenio && !/^Particular$/i.test(reg.convenio)) || /^Convênio/.test(reg.pago || '')); }
function corrigirForm(reg, foco, p) {
  var atendido = /^Atendido/.test(reg.oque || 'Atendido'), conv = ehConvReg(reg, p);
  var mostraPago = atendido && (foco === 'pag' || foco === 'nf' || foco === 'todos'), mostraGuia = foco === 'guia' || (foco === 'todos' && conv);
  var pagoOpts = (BOOT.listas.pago || []).slice(); if (reg.pago && pagoOpts.indexOf(reg.pago) < 0) pagoOpts.unshift(reg.pago); if (!reg.pago) pagoOpts.unshift('');
  // pendência de pagamento ou de NF: a tela já abre com o que a gestão quer registrar (Pago? = Sim / NF = Sim); dá pra mudar
  var pagoIni = (foco === 'pag' || foco === 'nf') && (!reg.pago || reg.pago === 'Não') ? 'Sim' : (reg.pago || ''), nfIni = foco === 'nf' ? 'Sim' : (reg.nf || 'Não');
  var html = '<div class="grid g2 corr">';
  if (mostraPago) html += '<label class="campo">Pago?<select data-c="pago">' + pagoOpts.map(function (o) { return '<option value="' + esc(o) + '"' + (o === pagoIni ? ' selected' : '') + '>' + esc(o || '(em branco)') + '</option>'; }).join('') + '</select></label>' +
    '<label class="campo" data-sim>Data do pagamento<input data-c="dataPagamento" inputmode="numeric" maxlength="10" value="' + esc(reg.dataPag || hojeStr()) + '"></label>' +
    '<label class="campo" data-sim>Forma<select data-c="forma"></select></label>' +
    '<label class="campo" data-sim>Quem pagou<input data-c="quemPagou" list="dl-pagadores" autocomplete="off" value="' + esc(reg.quem || (p ? (p.pagador || p.nome) : '')) + '"></label>' +
    '<label class="campo" data-sim>NF emitida?<select data-c="nf"><option>Sim</option><option>Não</option><option>Não se aplica</option></select></label>' +
    '<label class="campo" data-sim>Nº da NF<input data-c="nfNumero" autocomplete="off" value="' + esc(reg.nfN || '') + '"></label>';
  if (mostraGuia) html += '<label class="check forte c2"><input type="checkbox" data-c="guia"' + (reg.guia === 'Sim' ? ' checked' : '') + '> Guia assinada</label>';
  html += '<label class="campo c2">Acrescentar à observação' + (foco === 'obs' ? '' : ' <span class="leg">(opcional)</span>') + '<input data-c="observacao" autocomplete="off" placeholder="' + (foco === 'obs' ? 'ex.: taxa de falta — cobrar no próximo atendimento (gestão)' : 'ex.: pagou depois, por Pix') + '"></label></div>';
  var box = el('<div>' + html + '</div>');
  var fSel = $('[data-c=forma]', box); if (fSel) { preencherSelect(fSel, BOOT.listas.formas || [], '—'); setSel(fSel, reg.forma || ''); }
  var nfSel = $('[data-c=nf]', box); if (nfSel) setSel(nfSel, nfIni);
  var pSel = $('[data-c=pago]', box), soSim = function () { var sim = pSel && pSel.value === 'Sim'; $$('[data-sim]', box).forEach(function (l) { l.hidden = !sim; }); };
  if (pSel) { pSel.addEventListener('change', soSim); soSim(); }
  var dp = $('[data-c=dataPagamento]', box); if (dp) dp.addEventListener('input', function () { this.value = mascaraData(this.value); });
  return box;
}
// lê o formulário: manda o que está na tela; o servidor compara com a linha e grava só o que mudou
function corrigirCampos(box, reg) {
  var c = {}, v = function (k) { return $('[data-c=' + k + ']', box); };
  var pago = v('pago'); if (pago) { c.pago = pago.value; if (pago.value === 'Sim') { c.dataPagamento = v('dataPagamento').value.trim(); c.forma = v('forma').value; c.quemPagou = v('quemPagou').value.trim(); c.nf = v('nf').value; c.nfNumero = v('nfNumero').value.trim(); } }
  var g = v('guia'); if (g) { var gv = g.checked ? 'Sim' : 'Não'; if (gv !== (reg.guia || 'Não')) c.guia = gv; }
  var o = v('observacao'); if (o && o.value.trim()) c.observacao = o.value.trim();
  return c;
}
function corrigirValidar(c, reg) { var e = []; if (c.pago === 'Sim' && !(Number(reg.valor) > 0)) e.push('Pago? = Sim exige um valor na linha; o valor se corrige na planilha.'); if (c.dataPagamento && !dataValida(c.dataPagamento)) e.push('Data do pagamento inválida (dd/mm/aaaa).'); if (!Object.keys(c).length) e.push('Nada pra corrigir: mude algum campo ou escreva na observação.'); return e; }

var TELAS = { hoje: 's-hoje', registrar: 's-registrar', pacientes: 's-pacientes', mensalistas: 's-mensalistas', gestao: 's-gestao' };
var TITULOS = { hoje: 'Agenda', registrar: 'Registrar atendimento', pacientes: 'Pacientes', mensalistas: 'Mensalistas', gestao: 'Gestão' };
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
    if (ehGestao()) { $("#chip-user").classList.add('gestao'); $("#menu-gestao").hidden = false; }
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
