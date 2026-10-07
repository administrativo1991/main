/* ================= PENDÊNCIAS (antiga Gestão; recepção também usa desde 07/10) ================= */
var GES = null, gesAberto = null, gesHora = null, gesCorr = null, LANC = null;
INICIAR.gestao = function () {
  if (!BOOT) { setTimeout(INICIAR.gestao, 300); return; }
  // recepção vê pendências e lançamentos; exportar, virada do mês, lembrete e regras de cobrança continuam só da gestão
  ['g-virada-card', 'g-lemb', 'g-so-gestao'].forEach(function (id) { $("#" + id).hidden = !ehGestao(); });
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
  var faltas = (r.faltas || []).length, aReceber = (r.pagamentoPendente || []).reduce(function (a, x) { return a + saldoReg(x); }, 0);
  $("#g-atualizado").textContent = 'atualizado às ' + ('0' + gesHora.getHours()).slice(-2) + ':' + ('0' + gesHora.getMinutes()).slice(-2);
  $("#g-kpis").hidden = false; $("#g-kpis").innerHTML = '<div class="kpi"><b>' + r.total + '</b><span>atendimentos no mês</span></div><div class="kpi"><b>' + r.atendidos + '</b><span>atendidos' + (faltas ? ' · ' + faltas + ' falta' + (faltas === 1 ? '' : 's') : '') + '</span></div><div class="kpi roxo"><b>' + esc(brlCurto(r.recebido)) + '</b><span>recebido</span></div><div class="kpi amarela cheio"><b>' + esc(brlCurto(aReceber)) + '</b><span>a receber (particular)</span></div><div class="kpi"><b>' + (r.semGuia || []).length + '</b><span>convênio sem guia</span></div>';
  $("#g-export").hidden = !ehGestao(); $("#g-export-txt").textContent = 'Exportar ' + r.mes + ' (.xlsx)'; $("#g-export").disabled = !r.abaExiste;
  $("#g-corpo").hidden = false;
  var V = function (l) { return l.valor ? 'R$ ' + brl(l.valor) : ''; }, D = function (l) { return l.data + (l.hora ? ' ' + l.hora : ''); };
  var nomes = function (l, n) { var x = (l || []).slice(0, n || 3).map(function (i) { return primeiroNome(i.paciente) + ' ' + String(i.data || '').slice(0, 5); }); return x.join(' · ') + ((l || []).length > (n || 3) ? ' · +' + ((l || []).length - (n || 3)) : ''); };
  var PEND = [
    { k: 'pag', cor: 'amarela', n: (r.pagamentoPendente || []).length, t: 'Particulares atendidos sem “Pago?”', s: (r.pagamentoPendente || []).length ? nomes(r.pagamentoPendente) + ' — a recepção cobra; linha amarela na planilha' : 'Todos os particulares atendidos têm Pago? preenchido.', acao: 'Ver lista', tabela: function () { return tabelaG('Particulares atendidos sem pagamento registrado', [['Data', D], ['Paciente', 'paciente'], ['Profissional', 'profissional'], ['Procedimento', 'procedimento'], ['Valor', V], ['Pago?', 'pago'], ['Em aberto', function (l) { return 'R$ ' + brl(saldoReg(l)); }], ['Obs.', 'obs']], r.pagamentoPendente, 'Nada pendente.', 'pag'); } },
    { k: 'nf', cor: 'laranja', n: (r.nfPendente || []).length, t: 'Pagos sem nota fiscal', s: (r.nfPendente || []).length ? brlCurto(soma(r.nfPendente)) + ' · emitir no Portal Nacional com o nome de “quem pagou”' : 'Nenhum pagamento sem NF.', acao: 'Ver lista', tabela: function () { return tabelaG('Pagos sem NF emitida', [['Data', D], ['Paciente', 'paciente'], ['Valor', V], ['Forma', 'forma'], ['Quem pagou', function (l) { return l.quem || '(pagador habitual)'; }], ['NF?', function (l) { return l.nf || '(em branco)'; }]], r.nfPendente, 'Nada pendente.', 'nf'); } },
    { k: 'guia', cor: 'lilas', n: (r.semGuia || []).length, t: 'Convênio sem guia assinada', s: (r.semGuia || []).length ? contarPor(r.semGuia, 'convenio') + ' — glosa certa se faturar assim' : 'Todas as guias de convênio assinadas.', acao: 'Ver lista', tabela: function () { return tabelaG('Convênio sem guia assinada', [['Data', D], ['Paciente', 'paciente'], ['Convênio', 'convenio'], ['Profissional', 'profissional'], ['Guia', function (l) { return l.guia || '(em branco)'; }]], r.semGuia, 'Nada pendente.', 'guia'); } },
    { k: 'faltas', cor: 'vermelha', n: faltas, t: 'Faltas sem aviso de particular — taxa de falta?', s: 'Você decide caso a caso; se cobrar, entra no próximo agendamento', acao: 'Decidir', tabela: function () { return tabelaG('Faltas sem aviso de particular (taxa a decidir)', [['Data', D], ['Paciente', 'paciente'], ['Profissional', 'profissional'], ['O que aconteceu', 'oque'], ['Obs.', 'obs']], r.faltas, 'Nenhuma falta sem aviso.', 'obs'); } },
    { k: 'pagador', cor: 'lilas', n: (r.pagadorDiferente || []).length, t: 'Pagou outra pessoa — conferir o nome na NF', s: (r.pagadorDiferente || []).length ? nomes(r.pagadorDiferente) + ' — se for sempre essa pessoa, promover a pagador habitual em Pacientes' : 'Ninguém pagou por outra pessoa.', acao: 'Revisar', tabela: function () { return tabelaG('Pagou outra pessoa (conferir nome na NF)', [['Data', D], ['Paciente', 'paciente'], ['Quem pagou', 'quem'], ['Valor', V], ['NF?', 'nf']], r.pagadorDiferente, 'Nenhum.', 'obs'); } }
  ];
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
  var prox = MESES_PT[(MESES_PT.indexOf(r.mes) + 1) % 12], temAba = (r.mesesExistentes || []).indexOf(prox) >= 0, temCol = (r.colunasMensalistas || []).indexOf(prox.toUpperCase()) >= 0;
  var vir = $("#g-virada"); vir.innerHTML = '';
  var li = function (ok, html) { return el('<li><span class="' + (ok ? 'ok' : 'falta') + '">' + (ok ? ic('check', 12, 3.5) : '') + '</span><span>' + html + '</span></li>'); };
  var l1 = li(temAba, 'Aba <strong>' + esc(prox) + '</strong> ' + (temAba ? 'criada' : 'ainda não existe <button type="button" class="btn ter mini" id="g-aba" data-mes="' + esc(prox) + '">criar</button>'));
  var l2 = li(temCol, 'Colunas de ' + esc(prox.toLowerCase()) + ' em <strong>Mensalistas</strong>' + (temCol ? '' : ' <button type="button" class="btn ter mini" id="g-cols" data-mes="' + esc(prox) + '">criar</button>'));
  var l3 = li(false, 'Recorrências dos mensalistas renovadas <small class="muted">(conferir na Agenda recorrente)</small>');
  var l4 = li(false, 'Exportar ' + esc(r.mes.toLowerCase()) + ' → pasta do Financeiro <small class="muted">(botão no topo)</small>');
  [l1, l2, l3, l4].forEach(function (x) { vir.appendChild(x); });
  var ba = $("#g-aba"); if (ba) ba.addEventListener('click', function () { var b = this, m = b.dataset.mes; doisCliques(b, 'Confirmar: criar ' + m + '?', function () { b.disabled = true; call('criarAbaMes', { nome: m }).then(function (r2) { if (!r2.ok) return toast((r2.erros || ['Não criou']).join(' ')); toast('Aba ' + m + ' criada a partir de ' + r2.modelo); carregarGestao(); }).catch(function (e) { toast('Erro: ' + e.message); }); }); });
  var bcl = $("#g-cols"); if (bcl) bcl.addEventListener('click', function () { var b = this, m = b.dataset.mes; doisCliques(b, 'Confirmar: criar colunas de ' + m + '?', function () { b.disabled = true; call('criarColunasMes', { mes: m }).then(function (r2) { if (!r2.ok) return toast((r2.erros || ['Não criou']).join(' ')); toast('Colunas criadas: ' + r2.coluna); carregarGestao(); }).catch(function (e) { toast('Erro: ' + e.message); }); }); });
  var comRegra = (AT ? AT.pacientes : []).filter(function (p) { return regraRelevante(p) || p.obsCobranca; }).length; $("#g-regras-n").textContent = comRegra || '';
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
