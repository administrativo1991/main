/* ================= PENDÊNCIAS (antiga Gestão; recepção também usa desde 07/10) ================= */
var GES = null, gesAberto = null, gesHora = null, gesCorr = null, LANC = null;
INICIAR.gestao = function () {
  if (!BOOT) { setTimeout(INICIAR.gestao, 300); return; }
  // 16/10: a recepção corrige linhas e cadastro como a gestão; exportar, virada, lembrete, decidir faltas, perdido/glosa e a IA ficam com a gestão
  ['g-virada-card', 'g-lemb', 'g-ia-card'].forEach(function (id) { $("#" + id).hidden = !ehGestao(); });
  if (ehGestao()) carregarIA();
  if (!$("#g-mes").options.length) { MESES_PT.forEach(function (m) { var o = document.createElement('option'); o.value = m; o.textContent = m; $("#g-mes").appendChild(o); }); $("#g-mes").value = MESES_PT[new Date().getMonth()]; }
  $("#g-nav").hidden = false; $("#g-atualizar").hidden = false; $("#g-print").hidden = false; $("#g-planilha").textContent = BOOT.planilha || 'Controle da Recepção 2026';
  renderLembrete();
  carregarGestao();
};
function carregarGestao() {
  var mes = $("#g-mes").value; $("#g-titulo").textContent = 'Pendências · ' + mes + ' ' + new Date().getFullYear(); $("#g-carregando").hidden = false; $("#g-list").innerHTML = ''; $("#g-export-hint").textContent = ''; gesCorr = null; renderCorrecao();
  call('gestaoResumo', { mes: mes }).then(function (r) { $("#g-carregando").hidden = true; if (!r.ok) { $("#g-bloqueio").hidden = false; return; } GES = r; gesHora = new Date(); if (typeof resumoMes !== 'undefined') resumoMes[mes] = r; renderGestao(); }).catch(function (e) { $("#g-carregando").textContent = 'Não consegui carregar: ' + e.message; });
}
// foco: quando informado, cada linha ganha o botão "Corrigir" (e o clique na linha) que abre o painel de correção
function tabelaG(titulo, cols, linhas, vazio, foco) {
  var rotulo = { pag: 'Receber', nf: 'NF', guia: 'Guia', obs: 'Anotar', amplo: 'Corrigir' }[foco] || 'Corrigir';
  var card = el('<div class="tabela-card"><div class="passo" style="padding:14px 18px 4px"><h2 style="font-size:15px">' + esc(titulo) + '</h2><span class="tag ' + (linhas.length ? 'amarela' : 'verde') + '">' + linhas.length + '</span>' + (foco && linhas.length ? '<span class="muted" style="font-weight:500">clique na linha pra corrigir sem abrir a planilha</span>' : '') + '</div>' + (linhas.length ? '<div class="tabela-wrap"><table><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c[0]) + '</th>'; }).join('') + (foco ? '<th class="no-print"></th>' : '') + '</tr></thead><tbody>' + linhas.map(function (l, i) { return '<tr' + (foco ? ' class="clicavel" tabindex="0" data-i="' + i + '"' : '') + '>' + cols.map(function (c) { var v = typeof c[1] === 'function' ? c[1](l) : l[c[1]]; return '<td>' + esc(v == null ? '' : v) + '</td>'; }).join('') + (foco ? '<td class="no-print" style="text-align:right"><button type="button" class="btn link mini" data-i="' + i + '">' + (l.id ? rotulo : 'sem ID') + '</button></td>' : '') + '</tr>'; }).join('') + '</tbody></table></div>' : '<p class="muted" style="padding:0 18px 14px;margin:0">' + esc(vazio || 'Nada pendente.') + '</p>') + '</div>');
  if (foco) {
    $$('tr.clicavel', card).forEach(function (tr) { var l = linhas[+tr.dataset.i]; var abrir = function () { abrirCorrecao(l, foco); }; tr.addEventListener('click', abrir); tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') abrir(); }); });
  }
  return card;
}
/* painel de correção: grava pela função corrigirLancamento só nos campos de cobrança; valor não muda por aqui */
function abrirCorrecao(l, foco) { gesCorr = { l: l, foco: foco }; renderCorrecao(); var b = $("#g-corr"); if (b.firstChild) b.firstChild.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function renderCorrecao() {
  var box = $("#g-corr"); box.innerHTML = ''; if (!gesCorr || !GES) return;
  var l = gesCorr.l, foco = gesCorr.foco, p = pacInfo(l.paciente), semId = !l.id;
  var tit = { pag: 'Receber (total ou parte)', nf: 'Registrar a nota fiscal', guia: 'Guia do convênio', obs: 'Anotar a decisão' }[foco] || 'Corrigir lançamento', abaL = l.aba || GES.mes;
  var pn = el('<div class="painel"><div class="cab"><h2>' + esc(tit) + ' · ' + esc(l.paciente) + '</h2><span class="esp"></span><button type="button" class="btn icone p" data-fechar aria-label="Fechar">' + ic('fechar', 16, 2.4) + '</button></div>' +
    '<div class="muted" style="margin:0">' + esc([l.data + (l.hora ? ' ' + l.hora : ''), l.profissional, l.procedimento, l.valor ? 'R$ ' + brl(l.valor) : '', l.oque, l.id ? 'ID ' + l.id : ''].filter(Boolean).join(' · ')) + '</div>' +
    (semId ? '<div class="faixa nota">Esta linha não tem ID (foi digitada direto na planilha): corrija lá mesmo.</div>' : '<div data-form></div><div data-erros></div>') +
    '<div class="acoes">' + (semId ? '' : '<button type="button" class="btn" data-salvar>Gravar correção</button>') + '<button type="button" class="btn ter" data-fechar>Cancelar</button>' + (p ? '<button type="button" class="btn link" data-cad>Ver cadastro</button>' : '') + '</div>' +
    (semId ? '' : '<span class="muted">Grava na linha ' + esc(String(l.linha || '')) + ' da aba ' + esc(abaL) + ', com o carimbo da correção em "Registrado por (app)".' + (foco === 'amplo' ? ' Mudança de data, paciente, profissional, procedimento ou valores fica registrada em "Alterações de lançamento", com quem informou.' : '') + (foco === 'pag' ? ' Recebeu só uma parte? O resto continua em aberto e aparece como pendência.' : '') + '</span>') + '</div>');
  $$('[data-fechar]', pn).forEach(function (b) { b.addEventListener('click', function () { gesCorr = null; renderCorrecao(); }); });
  var bc = $('[data-cad]', pn); if (bc) bc.addEventListener('click', function () { go('pacientes', { editar: l.paciente, voltar: 'gestao' }); });
  if (!semId) {
    var fbox = corrigirForm(l, foco, p); $('[data-form]', pn).appendChild(fbox);
    $('[data-salvar]', pn).addEventListener('click', function () {
      var c = corrigirCampos(fbox, l), erros = corrigirValidar(c, l); $('[data-erros]', pn).innerHTML = erroBox(erros); if (erros.length) return;
      var b = this; b.disabled = true;
      call('corrigirLancamento', { aba: abaL, id: l.id, campos: c }).then(function (r) {
        if (!r.ok) { b.disabled = false; $('[data-erros]', pn).innerHTML = erroBox(r.erros || [], 'Não gravou'); return; }
        toast('Corrigido: ' + (r.alterados || []).join(', ') + (r.plano ? ' · plano ' + r.plano.id + (r.plano.n ? ' agora ' + r.plano.usadas + '/' + r.plano.n : '') + ' em Planos' : ''));
        if (typeof invalidarResumo === 'function') invalidarResumo();
        var reLanc = gesAberto === 'lanc'; carregarGestao(); if (reLanc) buscarLanc();
      }).catch(function (e) { b.disabled = false; toast('Erro: ' + e.message); });
    });
  }
  box.appendChild(pn);
}
function renderGestao() {
  var r = GES, soma = function (l) { return (l || []).reduce(function (a, x) { return a + (x.valor || 0); }, 0); };
  var faltas = (r.faltas || []).length, faltasSemDecisao = (r.faltas || []).filter(function (x) { return !x.decisao; }), aReceber = (r.pagamentoPendente || []).reduce(function (a, x) { return a + saldoReg(x); }, 0);
  $("#g-atualizado").textContent = 'atualizado às ' + ('0' + gesHora.getHours()).slice(-2) + ':' + ('0' + gesHora.getMinutes()).slice(-2);
  $("#g-kpis").hidden = false; $("#g-kpis").innerHTML = '<div class="kpi"><b>' + r.total + '</b><span>atendimentos no mês</span></div><div class="kpi"><b>' + r.atendidos + '</b><span>atendidos' + (faltas ? ' · ' + faltas + ' falta' + (faltas === 1 ? '' : 's') : '') + '</span></div><div class="kpi roxo"><b>' + esc(brlCurto(r.recebido)) + '</b><span>recebido</span></div><div class="kpi amarela cheio"><b>' + esc(brlCurto(aReceber)) + '</b><span>a receber (particular)</span></div><div class="kpi"><b>' + (r.semGuia || []).length + '</b><span>convênio sem guia</span></div>';
  $("#g-export").hidden = !ehGestao(); $("#g-export-txt").textContent = 'Exportar ' + r.mes + ' (.xlsx)'; $("#g-export").disabled = !r.abaExiste;
  $("#g-corpo").hidden = false;
  var V = function (l) { return l.valor ? 'R$ ' + brl(l.valor) : ''; }, D = function (l) { return l.data + (l.hora ? ' ' + l.hora : ''); };
  var nomes = function (l, n) { var x = (l || []).slice(0, n || 3).map(function (i) { return primeiroNome(i.paciente) + ' ' + String(i.data || '').slice(0, 5); }); return x.join(' · ') + ((l || []).length > (n || 3) ? ' · +' + ((l || []).length - (n || 3)) : ''); };
  var PEND = [
    { k: 'pag', cor: 'amarela', n: (r.pagamentoPendente || []).length, t: 'Particulares atendidos sem “Pago?”', s: (r.pagamentoPendente || []).length ? nomes(r.pagamentoPendente) + ' — a recepção cobra; linha amarela na planilha' : 'Todos os particulares atendidos têm Pago? preenchido.', acao: 'Ver lista', tabela: function () { return tabelaG('Particulares atendidos sem pagamento registrado', [['Data', D], ['Paciente', 'paciente'], ['Profissional', 'profissional'], ['Procedimento', 'procedimento'], ['Valor', V], ['Pago?', 'pago'], ['Em aberto', function (l) { return 'R$ ' + brl(saldoReg(l)); }], ['Obs.', 'obs']], r.pagamentoPendente, 'Nada pendente.', 'pag'); } },
    { k: 'nf', cor: 'laranja', n: (r.nfPendente || []).length, t: 'Pagos sem nota fiscal', s: (r.nfPendente || []).length ? brlCurto(soma(r.nfPendente)) + ' · emitir no Portal Nacional com o nome de “quem pagou”' : 'Nenhum pagamento sem NF.', acao: 'Ver lista', tabela: function () { return tabelaG('Pagos sem NF emitida', [['Data', D], ['Paciente', 'paciente'], ['Valor', V], ['Forma', 'forma'], ['Quem pagou', function (l) { return l.quem || '(pagador habitual)'; }], ['NF?', function (l) { return l.nf || '(em branco)'; }]], r.nfPendente, 'Nada pendente.', 'nf'); } },
    { k: 'guia', cor: 'lilas', n: (r.semGuia || []).length, t: 'Convênio sem guia assinada', s: (r.semGuia || []).length ? contarPor(r.semGuia, 'convenio') + ' — glosa certa se faturar assim' : 'Todas as guias de convênio assinadas.', acao: 'Ver lista', tabela: function () { return tabelaG('Convênio sem guia assinada', [['Data', D], ['Paciente', 'paciente'], ['Convênio', 'convenio'], ['Profissional', 'profissional'], ['Guia', function (l) { return l.guia || '(em branco)'; }], ['PDF na pasta?', function (l) { return l.pdfNaPasta === 'sim' ? 'sim' + (l.pdfArquivo ? ' (' + l.pdfArquivo + ')' : '') : l.pdfNaPasta === 'não' ? 'não' : '—'; }]], r.semGuia, 'Nada pendente.', 'guia'); } },
    { k: 'faltas', cor: 'vermelha', n: faltasSemDecisao.length, t: 'Faltas → Decidir', s: faltasSemDecisao.length ? faltasSemDecisao.length + ' sem decisão de ' + faltas + ' no mês — não abate · abate no mês seguinte · cobrar taxa · relevar' : (faltas ? 'Todas as ' + faltas + ' faltas do mês já têm decisão.' : 'Nenhuma falta ou desmarcação no mês.'), acao: ehGestao() ? 'Decidir' : 'Ver lista', tabela: tabelaFaltas },
    { k: 'cadincompleto', cor: 'laranja', n: (r.cadastroIncompleto || []).length, t: 'Atendidos sem cobrança cadastrada', s: (r.cadastroIncompleto || []).length ? (r.cadastroIncompleto || []).slice(0, 3).map(function (x) { return primeiroNome(x.paciente) + ' × ' + profCurto(x.profissional); }).join(' · ') + ((r.cadastroIncompleto || []).length > 3 ? ' · +' + ((r.cadastroIncompleto || []).length - 3) : '') + ' — o app cobrou pela tabela; cadastre em Pacientes → Cobrança por profissional' : 'Todo paciente atendido tem a cobrança cadastrada pro profissional.', acao: 'Ver lista', tabela: tabelaCadIncompleto },
    { k: 'pagador', cor: 'lilas', n: (r.pagadorDiferente || []).length, t: 'Pagou outra pessoa — conferir o nome na NF', s: (r.pagadorDiferente || []).length ? nomes(r.pagadorDiferente) + ' — se for sempre essa pessoa, promover a pagador habitual em Pacientes' : 'Ninguém pagou por outra pessoa.', acao: 'Revisar', tabela: function () { return tabelaG('Pagou outra pessoa (conferir nome na NF)', [['Data', D], ['Paciente', 'paciente'], ['Quem pagou', 'quem'], ['Valor', V], ['NF?', 'nf']], r.pagadorDiferente, 'Nenhum.', 'obs'); } }
  ];
  // O que a recepção fez (gestão, 16/10): a gestão acompanha sem lançar; últimos 7 dias, o que foi gravado por e-mail da recepção
  if (ehGestao()) { var fr = r.feitoRecepcao || []; PEND.unshift({ k: 'feitorecepcao', cor: 'lilas', n: fr.length, t: 'O que a recepção fez · últimos 7 dias', s: fr.length ? contarPor(fr, 'tipo') + ' — cadastro, cobrança por profissional e correções de lançamento' : 'Nada alterado pela recepção nos últimos 7 dias.', acao: 'Ver lista',
    tabela: function () { return tabelaG('O que a recepção fez · últimos 7 dias', [['Quando', 'quando'], ['Por', function (x) { return String(x.por || '').split('@')[0]; }], ['Tipo', 'tipo'], ['Paciente', function (x) { return x.paciente || '—'; }], ['O quê', 'campo'], ['De', 'de'], ['Para', 'para'], ['Quem informou / decidiu', function (x) { return x.quem || '—'; }]], fr, 'Nada alterado pela recepção nos últimos 7 dias.'); } }); }
  // Avaliações em andamento (gestão, 15/10): aplicações de teste sem número fixo; quantas cada paciente já fez
  var av = r.avaliacoes || []; PEND.push({ k: 'avaliacoes', cor: 'lilas', n: av.length, t: 'Avaliações em andamento', s: av.length ? av.slice(0, 3).map(function (x) { return primeiroNome(x.paciente) + ' ' + x.n; }).join(' · ') + (av.length > 3 ? ' · +' + (av.length - 3) : '') + ' aplicações — sem número fixo; parou de vir? confira com a profissional' : 'Nenhuma aplicação de teste nos últimos 60 dias.', acao: 'Ver lista',
    tabela: function () { return tabelaG('Avaliações em andamento (aplicações de teste nos últimos 60 dias)', [['Paciente', 'paciente'], ['Profissional', 'profissional'], ['Aplicações feitas', 'n'], ['Primeira', 'primeira'], ['Última', 'ultima'], ['Dias sem aplicação', 'diasSemVir']], av, 'Nenhuma avaliação em andamento.'); } });
  // Perdidos e glosas (só gestão): quanto se perdeu no mês; o Valor é a referência
  if (ehGestao()) { var perd = r.perdidos || []; PEND.push({ k: 'perdidos', cor: 'lilas', n: perd.length, t: 'Perdidos e glosas', s: perd.length ? brlCurto(soma(perd)) + ' perdidos no mês · ' + contarPor(perd, 'convenio') : 'Nenhum valor dado como perdido no mês.', acao: 'Ver lista',
    tabela: function () { return tabelaG('Perdidos e glosas · ' + brlCurto(soma(perd)), [['Data', D], ['Paciente', 'paciente'], ['Profissional', 'profissional'], ['Convênio', function (l) { return l.convenio || '—'; }], ['Valor de referência', V], ['Observação', 'obs']], perd, 'Nenhum valor dado como perdido no mês.'); } }); }
  // Guias a conferir (gestão, 16/10): guias lidas pela IA sem atendimento registrado, com baixa confiança ou que não pareceram guia
  if (ehGestao()) { var gc = r.guiasAConferir || []; PEND.push({ k: 'guiasconferir', cor: 'laranja', n: gc.length, t: 'Guias a conferir (lidas pela IA)', s: gc.length ? gc.slice(0, 3).map(function (g) { return (g.sugestao && g.sugestao.paciente ? primeiroNome(g.sugestao.paciente) : g.nome) + ' · ' + guiaStatusTxt(g.status); }).join(' · ') + (gc.length > 3 ? ' · +' + (gc.length - 3) : '') + ' — sem sessão registrada ou leitura em dúvida: confirme, escolha a linha ou ignore' : (r.guiasErro ? 'não consegui ler a aba Guias lidas: ' + r.guiasErro : 'Nenhuma guia lida em dúvida.'), acao: 'Conferir',
    tabela: function () { var card = el('<div class="tabela-card"><div class="passo" style="padding:14px 18px 4px"><h2 style="font-size:15px">Guias a conferir</h2><span class="tag ' + (gc.length ? 'laranja' : 'verde') + '">' + gc.length + '</span><span class="muted" style="font-weight:500">"PDF na pasta? = sim" sem linha casada na lista Convênio sem guia = problema de nome ou data; "não" = a guia não foi digitalizada</span></div><div class="gl-lista" style="padding:0 18px 16px"></div></div>'), box = $('.gl-lista', card);
      if (!gc.length) box.innerHTML = '<p class="muted" style="margin:0">Nada a conferir.</p>';
      gc.forEach(function (it) { box.appendChild(guiaItemEl(it, function () { r.guiasAConferir = r.guiasAConferir.filter(function (x) { return x.id !== it.id; }); carregarGestao(); })); });
      return card; } }); }
  // linhas de convênio sem o nome do convênio gravado (gestão, 10/10): o Repasse joga em "Convênio (sem nome)", sem regra
  { var sc = r.semConvenio || []; PEND.push({ k: 'semconv', cor: 'laranja', n: sc.length, t: 'Linhas de convênio sem convênio', s: sc.length ? nomes(sc) + ' — Pago? de convênio (ou perdido) sem o convênio na linha: escolha o convênio' : 'Toda linha de convênio tem o convênio gravado.', acao: 'Corrigir',
    tabela: function () { return tabelaG('Linhas de convênio sem convênio', [['Data', D], ['Paciente', 'paciente'], ['Profissional', 'profissional'], ['Procedimento', 'procedimento'], ['Pago?', 'pago'], ['Valor', V], ['Modalidade', function (l) { return l.modalidade || '—'; }]], sc, 'Nenhuma.', 'amplo'); } }); }
  var root = $("#g-pend"); root.innerHTML = '';
  PEND.forEach(function (p) {
    var b = el('<button type="button" class="pend ' + (p.n ? p.cor : 'verde') + '" aria-expanded="' + (gesAberto === p.k) + '"><span class="n">' + p.n + '</span><div class="corpo"><b>' + esc(p.t) + '</b><span>' + esc(p.s) + '</span></div><span class="ver">' + p.acao + ' ' + ic('direita', 14) + '</span></button>');
    b.addEventListener('click', function () { gesAberto = gesAberto === p.k ? null : p.k; renderGestao(); if (gesAberto) $("#g-list").scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    root.appendChild(b);
  });
  var DISC = [['desc', 'Descontos aplicados: ' + (r.descontos || []).length, function () { return tabelaG('Descontos aplicados', [['Data', D], ['Paciente', 'paciente'], ['Procedimento', 'procedimento'], ['Cobrado', V], ['Motivo / quem autorizou', 'obs'], ['Registrado por', 'log']], r.descontos, 'Nenhum desconto no mês.'); }],
    ['extras', 'Sessões extras: ' + (r.extras || []).length, function () { return tabelaG('Sessões extras liberadas', [['Data', D], ['Paciente', 'paciente'], ['Profissional', 'profissional'], ['Quem liberou / motivo', 'obs'], ['Registrado por', 'log']], r.extras, 'Nenhuma sessão extra.'); }],
    ['alt', 'Alterações de cadastro: ' + (r.alteracoes || []).length, function () { return tabelaG('Alterações de cadastro no mês', [['Quando', 'quando'], ['Paciente', 'paciente'], ['Campo', 'campo'], ['De', 'de'], ['Para', 'para'], ['Quem informou', 'quem'], ['Por', 'por']], r.alteracoes, 'Nenhuma alteração.'); }]];
  var disc = $("#g-discreto"); disc.innerHTML = '';
  DISC.forEach(function (x) { var b = el('<button type="button"' + (gesAberto === x[0] ? ' style="color:var(--roxo);font-weight:700"' : '') + '>' + esc(x[1]) + '</button>'); b.addEventListener('click', function () { gesAberto = gesAberto === x[0] ? null : x[0]; renderGestao(); }); disc.appendChild(b); });
  var lista = $("#g-list"); lista.innerHTML = '';
  if (!r.abaExiste) lista.innerHTML = '<div class="vazio">A aba "' + esc(r.mes) + '" ainda não existe. Crie pela virada do mês, ao lado.</div>';
  else if (gesAberto === 'lanc') { if (LANC) lista.appendChild(tabelaLanc()); }
  else if (gesAberto) { var item = PEND.filter(function (p) { return p.k === gesAberto; })[0] || { tabela: (DISC.filter(function (x) { return x[0] === gesAberto; })[0] || [])[2] }; if (item.tabela) lista.appendChild(item.tabela()); }
  // virada do mês
  var iMes = MESES_PT.indexOf(r.mes), prox = MESES_PT[(iMes + 1) % 12], temAba = (r.mesesExistentes || []).indexOf(prox) >= 0, anoProx = new Date().getFullYear() + (iMes === 11 ? 1 : 0), chaveProx = prox + '/' + anoProx, temCols = (r.competencias || []).indexOf(chaveProx) >= 0;
  var vir = $("#g-virada"); vir.innerHTML = '';
  var li = function (ok, html) { return el('<li><span class="' + (ok ? 'ok' : 'falta') + '">' + (ok ? ic('check', 12, 3.5) : '') + '</span><span>' + html + '</span></li>'); };
  var l1 = li(temAba, 'Aba <strong>' + esc(prox) + '</strong> ' + (temAba ? 'criada' : 'ainda não existe <button type="button" class="btn ter mini" id="g-aba" data-mes="' + esc(prox) + '">criar</button>'));
  var l2 = li(temCols, 'Colunas de <strong>' + esc(chaveProx) + '</strong> na aba Mensalistas ' + (temCols ? 'criadas' : 'ainda não existem <button type="button" class="btn ter mini" id="g-cols" data-chave="' + esc(chaveProx) + '">criar</button>') + ' <small class="muted">(mensalidades e antecipados: tela <a href="#" id="g-ir-cobranca">Cobrança do mês</a>)</small>');
  var l3 = li(false, 'Recorrências renovadas <small class="muted">(conferir na Agenda recorrente)</small>');
  var l4 = li(false, 'Exportar ' + esc(r.mes.toLowerCase()) + ' → pasta do Financeiro <small class="muted">(botão no topo)</small>');
  // aba em modo planilha (fórmula em F/G/H/N lendo o cadastro atual) → virar para o app: o convênio passa a ficar gravado na linha
  var vd = r.virada, l0 = null;
  if (vd) l0 = vd.modo === 'app' ? li(true, 'Aba <strong>' + esc(r.mes) + '</strong> no modo app <small class="muted">(' + esc(vd.viradaEm ? 'já virada em ' + vd.viradaEm : 'sem fórmula em F/G/H/N') + ')</small>')
    : li(false, 'Aba <strong>' + esc(r.mes) + '</strong> ainda em modo planilha <small class="muted">(convênio vem do cadastro atual; o app não grava nela)</small> <button type="button" class="btn sec mini" id="g-virar" data-mes="' + esc(r.mes) + '">Virar aba ' + esc(r.mes) + ' para o app</button>');
  [l0, l1, l2, l3, l4].forEach(function (x) { if (x) vir.appendChild(x); });
  var bv = $("#g-virar"); if (bv) bv.addEventListener('click', function () { var b = this, m = b.dataset.mes; doisCliques(b, 'Confirmar: virar ' + m + '? (as fórmulas viram valor)', function () { b.disabled = true; call('virarAbaMes', { mes: m }).then(function (r2) { if (!r2.ok) { b.disabled = false; return toast((r2.erros || ['Não virou']).join(' ')); } toast(r2.jaVirada ? r2.mensagem : r2.texto + ' · ' + r2.linhas + ' linhas'); carregarGestao(); }).catch(function (e) { b.disabled = false; toast('Erro: ' + e.message); }); }); });
  var ba = $("#g-aba"); if (ba) ba.addEventListener('click', function () { var b = this, m = b.dataset.mes; doisCliques(b, 'Confirmar: criar ' + m + '?', function () { b.disabled = true; call('criarAbaMes', { nome: m }).then(function (r2) { if (!r2.ok) return toast((r2.erros || ['Não criou']).join(' ')); toast('Aba ' + m + ' criada a partir de ' + r2.modelo); carregarGestao(); }).catch(function (e) { toast('Erro: ' + e.message); }); }); });
  var gip = $("#g-ir-cobranca"); if (gip) gip.addEventListener('click', function (e) { e.preventDefault(); go('cobranca'); });
  var bcols = $("#g-cols"); if (bcols) bcols.addEventListener('click', function () { var b = this, ch = b.dataset.chave; doisCliques(b, 'Confirmar: criar colunas de ' + ch + '?', function () { b.disabled = true; call('criarColunasMes', { chave: ch }).then(function (r2) { if (!r2.ok) { b.disabled = false; return toast((r2.erros || ['Não criou']).join(' ')); } toast('Colunas de ' + ch + ' criadas em Mensalistas'); carregarGestao(); }).catch(function (e) { b.disabled = false; toast('Erro: ' + e.message); }); }); });
  var comRegra = (AT ? AT.cobrancas : []).length; $("#g-regras-n").textContent = comRegra || '';
}
/* ---------- Faltas → Decidir (gestão, 15/10): toda falta e desmarcação do mês, com o Detalhe da recepção; a gestão decide ---------- */
var DECISOES = [['não abate', 'Não abate', 'ter'], ['abate no mês seguinte', 'Abate no mês seguinte', 'ter'], ['cobrar taxa de falta', 'Cobrar taxa de falta', 'sec'], ['relevar', 'Relevar', 'ter']];
function tabelaFaltas() {
  var r = GES, l = (r.faltas || []).slice().sort(function (a, b) { return (a.decisao ? 1 : 0) - (b.decisao ? 1 : 0) || String(a.data).localeCompare(String(b.data)); });
  var pct = (BOOT.params && BOOT.params.taxa_falta_pct) || 50;
  var card = el('<div class="tabela-card"><div class="passo" style="padding:14px 18px 4px"><h2 style="font-size:15px">Faltas e desmarcações · ' + esc(r.mes) + '</h2><span class="tag ' + (l.some(function (x) { return !x.decisao; }) ? 'vermelha' : 'verde') + '">' + l.filter(function (x) { return !x.decisao; }).length + ' sem decisão</span><span class="muted" style="font-weight:500">' + (ehGestao() ? 'taxa de falta = ' + pct + '% do valor da sessão (parâmetro) · fica na aba do mês como linha a cobrar' : 'a gestão decide; a decisão aparece aqui e na linha da planilha') + '</span></div>' + (l.length ? '<div class="tabela-wrap"><table><thead><tr><th>Data</th><th>Paciente</th><th>Profissional</th><th>O que aconteceu</th><th>Detalhe (recepção)</th><th>Decisão</th>' + (ehGestao() ? '<th class="no-print"></th>' : '') + '</tr></thead><tbody></tbody></table></div>' : '<p class="muted" style="padding:0 18px 14px;margin:0">Nenhuma falta ou desmarcação no mês.</p>') + '</div>');
  var tb = $('tbody', card);
  l.forEach(function (x) {
    var det = x.detalhe || String(x.obs || '').replace(/^Falta\/desmarcação — /, '').split(' | ')[0];
    var tr = el('<tr' + (x.decisao ? ' class="apagada"' : '') + '><td>' + esc(x.data + (x.hora ? ' ' + x.hora : '')) + '</td><td><b>' + esc(x.paciente) + '</b></td><td>' + esc(profCurto(x.profissional)) + '</td><td>' + esc(x.oque) + '</td><td style="max-width:320px;white-space:normal">' + esc(det || '—') + '</td><td>' + (x.decisao ? '<span class="tag verde">' + esc(x.decisao) + '</span>' : '<span class="tag amarela">a decidir</span>') + '</td>' + (ehGestao() ? '<td class="no-print td-dec" style="text-align:right">' + (x.id ? '<div class="acoes" data-dec></div>' : '<span class="muted">sem ID: decida na planilha</span>') + '</td>' : '') + '</tr>');
    var box = $('[data-dec]', tr);
    if (box) DECISOES.forEach(function (dc) {
      var b = el('<button type="button" class="btn ' + dc[2] + ' mini"' + (x.decisao === dc[0] ? ' disabled' : '') + '>' + dc[1] + '</button>');
      b.addEventListener('click', function () {
        var obs = window.prompt('Decisão: ' + dc[1] + ' — ' + x.paciente + ' (' + x.data + ').\nObservação (opcional, vai pra linha):', '');
        if (obs === null) return;
        var d = { aba: x.aba || r.mes, id: x.id, decisao: dc[0], observacao: obs.trim() };
        if (dc[0] === 'cobrar taxa de falta') { var vt = window.prompt('Valor da taxa (vazio = ' + pct + '% do valor da sessão da linha de cobrança):', ''); if (vt === null) return; d.valorTaxa = vt.trim(); }
        $$('button', box).forEach(function (y) { y.disabled = true; });
        call('decidirFalta', d).then(function (r2) {
          if (!r2.ok) { $$('button', box).forEach(function (y) { y.disabled = false; }); return toast((r2.erros || ['Não gravou']).join(' ')); }
          toast('Decidido: ' + r2.decisao + (r2.taxa ? ' · taxa R$ ' + brl(r2.taxa.valor) + ' lançada (' + r2.taxa.id + ')' : ''));
          if (typeof invalidarResumo === 'function') invalidarResumo(); carregarGestao();
        }).catch(function (e) { $$('button', box).forEach(function (y) { y.disabled = false; }); toast('Erro: ' + e.message); });
      });
      box.appendChild(b);
    });
    tb.appendChild(tr);
  });
  return card;
}
function tabelaCadIncompleto() {
  var r = GES, l = r.cadastroIncompleto || [];
  var card = tabelaG('Atendidos no mês sem cobrança cadastrada pro profissional', [['1ª sessão', 'data'], ['Paciente', 'paciente'], ['Profissional', 'profissional'], ['Convênio', function (x) { return x.convenio || 'Particular'; }], ['Pago?', function (x) { return x.pago || '(vazio)'; }], ['Valor', function (x) { return x.valor ? 'R$ ' + brl(x.valor) : ''; }]], l, 'Nenhum.');
  if (l.length) { var tb = $('tbody', card); $$('tr', tb).forEach(function (tr, i) { var x = l[i]; if (!x) return; var td = el('<td class="no-print" style="text-align:right"><button type="button" class="btn link mini">' + 'Cadastrar cobrança' + '</button></td>'); td.querySelector('button').addEventListener('click', function () { go('pacientes', { editar: x.paciente, voltar: 'gestao' }); }); tr.appendChild(td); }); $('thead tr', card).appendChild(el('<th class="no-print"></th>')); }
  return card;
}
/* ---------- Lançamentos: achar qualquer linha (mês mostrado ou todos) e corrigir tudo ---------- */
function buscarLanc() {
  var pac = $("#g-lanc-pac").value.trim(), escopo = $("#g-lanc-escopo").value, b = $("#g-lanc-buscar");
  if (escopo === 'todos' && !pac) return toast('Pra procurar em todos os meses, digite o paciente');
  b.disabled = true; gesAberto = 'lanc'; gesCorr = null; renderCorrecao(); $("#g-list").innerHTML = '<div class="carregando">Buscando…</div>';
  call('lancamentos', { mes: escopo === 'todos' ? 'todos' : GES.mes, paciente: pac }).then(function (r) {
    if (!r.ok) { $("#g-list").innerHTML = ''; return toast((r.erros || ['Não achei']).join(' ')); }
    LANC = { linhas: r.linhas, total: r.total, titulo: (pac ? pac + ' · ' : '') + (escopo === 'todos' ? 'todos os meses' : GES.mes) };
    renderGestao(); $("#g-list").scrollIntoView({ behavior: 'smooth', block: 'start' });
  }).catch(function (e) { toast('Erro: ' + e.message); }).finally(function () { b.disabled = false; });
}
function tabelaLanc() {
  var V = function (l) { return l.valor ? 'R$ ' + brl(l.valor) : ''; };
  return tabelaG('Lançamentos · ' + LANC.titulo + (LANC.total > LANC.linhas.length ? ' (últimos ' + LANC.linhas.length + ' de ' + LANC.total + ')' : ''), [['Data', function (l) { return l.data + (l.hora ? ' ' + l.hora : ''); }], ['Aba', 'aba'], ['Paciente', 'paciente'], ['Profissional', 'profissional'], ['Procedimento', 'procedimento'], ['O que', 'oque'], ['Valor', V], ['Pago?', 'pago'], ['Recebido', function (l) { return l.pago === 'Parcial' ? 'R$ ' + brl(l.recebido) : l.pago === 'Sim' ? V(l) : ''; }], ['Em aberto', function (l) { return /^(|Não|Parcial)$/.test(l.pago) && l.valor ? 'R$ ' + brl(saldoReg(l)) : ''; }], ['NF', 'nf']], LANC.linhas.slice().reverse(), 'Nenhum lançamento encontrado.', 'amplo');
}
$("#g-lanc-buscar").addEventListener('click', buscarLanc);
$("#g-lanc-pac").addEventListener('keydown', function (e) { if (e.key === 'Enter') buscarLanc(); });
$("#g-lanc-novo").addEventListener('click', function () { go('registrar'); var d = $("#a-data"); if (d) { d.focus(); if (d.select) d.select(); } toast('Ponha a data da sessão: ela vai pra aba do mês dessa data'); });
/* ---------- card "Uso da IA este mês" (gestão, 16/10): gasto × teto, pausa geral/por item, ler guias agora, gatilho ---------- */
var IAE = null, iaMsg = '';
function carregarIA() { $("#g-ia").textContent = 'carregando…'; call('iaEstado', {}).then(function (e) { IAE = e; renderIA(); }).catch(function (err) { $("#g-ia").textContent = 'Não consegui ler o estado da IA: ' + err.message; }); }
function renderIA() {
  var e = IAE, box = $("#g-ia"); if (!e) return;
  var pct = Math.min(100, e.pct || 0), cor = e.pausada ? 'vermelha' : pct >= (e.avisoPct || 80) ? 'amarela' : 'verde', ult = e.ultimaGuias;
  var h = '<div class="ia-gasto"><b>' + esc(usdTxt(e.gastoMes)) + '</b><span class="muted">de ' + esc(usdTxt(e.tetoMes)) + ' no mês · hoje ' + esc(usdTxt(e.gastoDia)) + ' de ' + esc(usdTxt(e.tetoDia)) + ' · ' + (e.chamadasMes || 0) + ' chamada' + (e.chamadasMes === 1 ? '' : 's') + '</span>' + (e.gestao !== false ? '<span class="ia-teto"><button type="button" class="btn ter mini" id="g-ia-teto">Mudar teto</button></span>' : '') + '</div>' +
    '<div class="ia-barra"><div class="ia-barra-in ' + cor + '" style="width:' + pct + '%"></div></div>';
  if (e.pausada) h += '<div class="faixa erro" style="margin-top:8px">' + esc(e.mensagem) + '</div>';
  else if (pct >= (e.avisoPct || 80)) h += '<div class="faixa nota" style="margin-top:8px">' + ic('alerta', 14, 2.6) + ' Já usou ' + pct + '% do teto do mês (aviso enviado por e-mail). Ao chegar em 100% a IA para sozinha.</div>';
  if (e.temChave === false) h += '<div class="faixa nota" style="margin-top:8px">Chave da API não configurada: leitura automática indisponível. Apps Script → Configurações do projeto → Propriedades do script → ANTHROPIC_API_KEY.</div>';
  h += '<div class="ia-itens">' + Object.keys(e.itens || {}).map(function (k) { var nome = { guias: 'Guias', conciliacao: 'Conciliação', perguntar: 'Perguntar' }[k] || k; return '<button type="button" class="tag ' + (e.itens[k] ? 'verde' : 'cinza') + '" data-item="' + k + '" title="' + (e.itens[k] ? 'ativo: clique pra pausar só este item' : 'pausado: clique pra reativar') + '">' + esc(nome) + ' ' + (e.itens[k] ? 'ativa' : 'pausada') + '</button>'; }).join('') + '</div>';
  h += '<div class="muted" style="font-size:12px">modelo ' + esc(e.modelo || '') + (ult ? ' · última leitura de guias ' + esc(ult.quando || '') + ': ' + (ult.lidas || 0) + ' lida' + (ult.lidas === 1 ? '' : 's') + (ult.conferir ? ', ' + ult.conferir + ' a conferir' : '') + (ult.comErro ? ', ' + ult.comErro + ' com erro' : '') + (ult.restantes ? ', ' + ult.restantes + ' ficaram pra próxima' : '') + (ult.parou && ult.parou !== 'limite' ? ' · parou: ' + esc(ult.parou) : '') + (ult.custo ? ' · ' + esc(usdTxt(ult.custo)) : '') : ' · nenhuma leitura ainda') + '</div>';
  h += '<div class="acoes" style="flex-wrap:wrap"><button type="button" class="btn ' + (e.ativa ? 'sec' : '') + ' mini" id="g-ia-pausa">' + (e.ativa ? 'Pausar tudo' : 'Reativar') + '</button>' +
    '<span class="seg mini ia-ler"><select id="g-ia-mes" class="mini">' + MESES_PT.map(function (m, i) { return '<option' + (i === new Date().getMonth() ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select><button type="button" class="btn ter mini" id="g-ia-ler"' + (e.pausada || e.temChave === false ? ' disabled' : '') + '>Ler guias agora</button></span>' +
    '<button type="button" class="btn ter mini" id="g-ia-gatilho" title="Cria ou refaz o gatilho que lê a pasta todo dia">' + (e.gatilho && e.gatilho.instalado ? 'Gatilho diário instalado (' + e.horaGatilho + 'h) · refazer' : 'Instalar gatilho diário (' + e.horaGatilho + 'h)') + '</button></div>' +
    '<div id="g-ia-msg">' + iaMsg + '</div>';
  box.innerHTML = h;
  var bt = $("#g-ia-teto"); if (bt) bt.addEventListener('click', function () {
    var w = bt.parentNode; w.innerHTML = '<input type="number" min="1" max="500" step="1" class="mini" id="g-ia-teto-v" value="' + (e.tetoMes || 10) + '" aria-label="Teto do mês em US$" style="width:90px"> <button type="button" class="btn mini" id="g-ia-teto-ok">Salvar teto</button>';
    $("#g-ia-teto-v").focus();
    $("#g-ia-teto-ok").addEventListener('click', function () { var b = this; b.disabled = true; call('iaDefinir', { chave: 'teto_mes_usd', valor: $("#g-ia-teto-v").value, motivo: 'Mudar teto (tela)' }).then(function (r) { if (!r.ok) { b.disabled = false; return toast((r.erros || ['Não gravou']).join(' ')); } toast('Teto do mês: ' + usdTxt(r.valor)); IAE = r.estado; renderIA(); }).catch(function (err) { b.disabled = false; toast('Erro: ' + err.message); }); });
  });
  $("#g-ia-pausa").addEventListener('click', function () { var b = this; doisCliques(b, e.ativa ? 'Confirmar: pausar toda a IA?' : 'Confirmar: reativar?', function () { b.disabled = true; call('iaPausar', { ativa: !e.ativa }).then(function (r) { if (!r.ok) { b.disabled = false; return toast((r.erros || ['Não gravou']).join(' ')); } toast(e.ativa ? 'IA pausada (aba IA, ia_ativa = Não)' : 'IA reativada'); IAE = r.estado; renderIA(); }).catch(function (err) { b.disabled = false; toast('Erro: ' + err.message); }); }); });
  $$('[data-item]', box).forEach(function (b) { b.addEventListener('click', function () { var k = b.dataset.item, on = !e.itens[k]; call('iaDefinir', { chave: 'ia_' + k, valor: on ? 'Sim' : 'Não' }).then(function (r) { if (!r.ok) return toast((r.erros || ['Não gravou']).join(' ')); IAE = r.estado; renderIA(); }).catch(function (err) { toast('Erro: ' + err.message); }); }); });
  $("#g-ia-ler").addEventListener('click', function () { var b = this, mes = $("#g-ia-mes").value; doisCliques(b, 'Confirmar: ler a pasta de ' + mes + '?', function () { b.disabled = true; b.textContent = 'Lendo… (até 5 min)'; iaMsg = ''; $("#g-ia-msg").innerHTML = '';
    call('lerGuias', { mes: mes }).then(function (r) { if (!r.ok) { iaMsg = erroBox(r.erros || [r.mensagens && r.mensagens[0] || 'Não leu'], 'Leitura parada'); carregarIA(); return; } toast(r.lidas + ' guia' + (r.lidas === 1 ? '' : 's') + ' lida' + (r.lidas === 1 ? '' : 's') + (r.novos ? ' de ' + r.novos + ' arquivo(s) novo(s)' : ': nenhum arquivo novo') + (r.custo ? ' · ' + usdTxt(r.custo) : '')); iaMsg = r.novos ? '<div class="faixa cinza">' + esc(r.lidas + ' lidas · ' + r.confirmar + ' prontas pra confirmar (Meu dia) · ' + r.conferir + ' a conferir · ' + r.ignoradas + ' ignoradas (tipo) · ' + r.duplicadas + ' duplicadas · ' + r.comErro + ' com erro' + (r.restantes ? ' · ' + r.restantes + ' ficaram pra próxima execução' : '') + (r.custoPorGuia ? ' · custo por guia ' + usdTxt(r.custoPorGuia, 4) : '') + (r.recasadas ? ' · ' + r.recasadas + ' sugestão(ões) antiga(s) refeita(s)' : '') + (r.mensagens.length ? ' · ' + r.mensagens.join(' ') : '')) + '</div>' : '<div class="faixa cinza">Nenhum arquivo novo na pasta de ' + esc(mes) + '.' + (r.recasadas ? ' ' + r.recasadas + ' sugestão(ões) pendente(s) refeita(s) com o que já tinha sido lido (sem custo).' : '') + '</div>'; if (typeof invalidarResumo === 'function') invalidarResumo(); carregarIA(); carregarGestao(); }).catch(function (err) { iaMsg = erroBox(['Não consegui ler: ' + err.message + '. Se demorou mais de 5 minutos, parte das guias já pode estar na aba Guias lidas: atualize.']); carregarIA(); }); }); });
  $("#g-ia-gatilho").addEventListener('click', function () { var b = this; b.disabled = true; call('iaInstalarGatilho', {}).then(function (r) { if (!r.ok) { b.disabled = false; return $("#g-ia-msg").innerHTML = erroBox(r.erros || ['Não instalou']); } toast('Gatilho diário às ' + r.hora + 'h'); carregarIA(); }).catch(function (err) { b.disabled = false; toast('Erro: ' + err.message); }); });
}
function usdTxt(n, dec) { n = Number(n || 0); dec = dec || (n > 0 && n < 0.01 ? 4 : 2); return 'US$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
$("#g-ia-atualizar").addEventListener('click', carregarIA);
function contarPor(l, campo) { var c = {}; (l || []).forEach(function (x) { var k = x[campo] || '—'; c[k] = (c[k] || 0) + 1; }); return Object.keys(c).map(function (k) { return k + ' ×' + c[k]; }).join(' · '); }
function doisCliques(btn, texto, acao) { if (btn.dataset.ok !== '1') { btn.dataset.ok = '1'; btn.dataset.antes = btn.textContent; btn.textContent = texto; setTimeout(function () { if (btn.dataset.ok === '1') { btn.dataset.ok = ''; btn.textContent = btn.dataset.antes; } }, 6000); return; } btn.dataset.ok = ''; acao(); }
function mudarMes(n) { var i = MESES_PT.indexOf($("#g-mes").value); i = (i + n + 12) % 12; $("#g-mes").value = MESES_PT[i]; gesAberto = null; carregarGestao(); }
$("#g-ant").addEventListener('click', function () { mudarMes(-1); });
$("#g-prox").addEventListener('click', function () { mudarMes(1); });
$("#g-atualizar").addEventListener('click', carregarGestao);
$("#g-mes").addEventListener('change', carregarGestao);
$("#g-atalho-regras").addEventListener('click', function () { go('pacientes', { editar: '', voltar: 'gestao' }); setModo('editar'); });
$("#g-export").addEventListener('click', function () { var b = this; b.disabled = true; $("#g-export-hint").textContent = 'Gerando…'; call('exportarMes', { mes: GES.mes }).then(function (r) { if (!r.ok) { $("#g-export-hint").textContent = ''; return toast((r.erros || ['Não exportou']).join(' ')); } $("#g-export-hint").innerHTML = '<a href="' + r.xlsx + '" target="_blank" rel="noopener">Baixar ' + esc(GES.mes) + '.xlsx</a> · <a href="' + r.url + '" target="_blank" rel="noopener">abrir no Drive</a> (' + r.linhas + ' linhas)' + (r.pasta ? ' · salvo como <b>' + esc(r.nome) + '</b> em ' + esc(r.pasta) + (r.criadas && r.criadas.length ? ' (pasta criada: ' + esc(r.criadas.join('/')) + ')' : '') : '') + (r.aviso ? '<br><span style="color:var(--vm-tx)">' + esc(r.aviso) + '</span>' : ''); if (r.aviso) toast(r.aviso); }).catch(function (e) { toast('Erro: ' + e.message); }).finally(function () { b.disabled = false; }); });
/* lembrete pra recepção: aba Lembretes, só acrescenta linha; o ativo é o último; os anteriores ficam como histórico */
function renderLembrete() {
  var l = BOOT.lembrete, hist = BOOT.lembretes || [], tem = !!(l && l.texto);
  $("#g-lemb-atual").innerHTML = tem
    ? '<div class="faixa nota" style="display:block"><strong>No ar:</strong> ' + esc(l.texto) + '<div class="muted">' + esc(String(l.data || '').slice(0, 16)) + (l.validoAte ? ' · vale até ' + esc(l.validoAte) : ' · sem prazo') + '</div></div>'
    : 'Nenhum lembrete no ar. O que você escrever aqui aparece no card "Lembrete da gestão" da tela Hoje. Um lembrete novo substitui o anterior; os antigos ficam guardados na aba Lembretes.';
  $("#g-lemb-encerrar").hidden = !tem;
  var ant = hist.filter(function (h) { return h.texto && !(tem && h.linha === l.linha); });
  $("#g-lemb-hist").hidden = !ant.length;
  $("#g-lemb-lista").innerHTML = ant.map(function (h) { return '<li>' + esc(String(h.data || '').slice(0, 10)) + ' — ' + esc(h.texto) + (h.validoAte ? ' <span class="muted">(até ' + esc(h.validoAte) + ')</span>' : '') + '</li>'; }).join('');
}
function salvarLembrete(encerrar) {
  var d = { texto: encerrar ? '' : $("#g-lemb-txt").value.trim(), validoAte: encerrar ? '' : $("#g-lemb-ate").value.trim(), encerrar: !!encerrar };
  if (!encerrar && !d.texto) return toast('Escreva o lembrete');
  if (d.validoAte && !dataObj(d.validoAte)) return toast('"Vale até" inválido: use dd/mm/aaaa');
  $("#g-lemb-salvar").disabled = true; $("#g-lemb-encerrar").disabled = true;
  call('salvarLembrete', d).then(function (r) {
    if (!r.ok) return toast((r.erros || ['Não gravou']).join(' '));
    BOOT.lembrete = r.lembrete; if (r.lembretes) BOOT.lembretes = r.lembretes;
    $("#g-lemb-txt").value = ''; $("#g-lemb-ate").value = '';
    renderLembrete(); mostrarLembrete();
    toast(encerrar ? 'Lembrete encerrado' : 'Lembrete publicado: já aparece na tela Hoje');
  }).catch(function (e) { toast('Erro: ' + e.message); }).finally(function () { $("#g-lemb-salvar").disabled = false; $("#g-lemb-encerrar").disabled = false; });
}
$("#g-lemb-salvar").addEventListener('click', function () { salvarLembrete(false); });
$("#g-lemb-encerrar").addEventListener('click', function () { salvarLembrete(true); });
$("#g-lemb-ate").addEventListener('input', function () { this.value = mascaraData(this.value); });
