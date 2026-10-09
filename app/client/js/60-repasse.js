/* ================= REPASSE (só gestão, 10/10) =================
   O servidor calcula linha a linha (API.repasseMes) com as regras da aba "Regras de repasse"; esta tela mostra o resumo
   por profissional, as linhas do mês e edita as regras (API.salvarRegrasRepasse). Nada de percentual fica no código. */
var REP = null, repMes = null, repProf = '', repRegrasAbertas = false;
INICIAR.repasse = function () {
  if (!ehGestao()) { go('hoje'); return toast('Só a gestão vê o repasse'); }
  if (!repMes) repMes = MESES_PT[new Date().getMonth()];
  carregarRepasse();
};
function carregarRepasse() {
  $("#r2-mes").textContent = repMes; $("#r2-carregando").hidden = false; $("#r2-carregando").textContent = 'Carregando…';
  call('repasseMes', { mes: repMes }).then(function (r) {
    $("#r2-carregando").hidden = true;
    if (!r.ok) { $("#r2-aviso").innerHTML = erroBox(r.erros || [], 'Não consegui calcular'); return; }
    REP = r; renderRepasse(); if (repRegrasAbertas) renderRegras();
  }).catch(function (e) { $("#r2-carregando").textContent = 'Não consegui carregar: ' + e.message; });
}
function mudarMesRep(n) { var i = MESES_PT.indexOf(repMes); repMes = MESES_PT[(i + n + 12) % 12]; repProf = ''; carregarRepasse(); }
$("#r2-ant").addEventListener('click', function () { mudarMesRep(-1); });
$("#r2-prox").addEventListener('click', function () { mudarMesRep(1); });
$("#r2-regras-btn").addEventListener('click', function () { repRegrasAbertas = !repRegrasAbertas; if (repRegrasAbertas) renderRegras(); else $("#r2-regras").hidden = true; });
function pctTxt(p) { return p == null ? 'sem regra' : p === 'vários' ? 'vários %' : String(p).replace('.', ',') + '%'; }
function renderRepasse() {
  var r = REP, R = function (n) { return 'R$ ' + brl(n || 0); }, tot = { pago: 0, prev: 0, perdido: 0 };
  r.porProfissional.forEach(function (p) { tot.pago += p.repassePago; tot.prev += p.repassePrev; tot.perdido += p.perdido; });
  $("#r2-aviso").innerHTML = !r.abaExiste ? aviso('cinza', 'A aba "' + esc(r.mes) + '" não existe', '') :
    !r.regras.length ? aviso('laranja', 'Nenhuma regra de repasse ainda', 'Abra <b>Regras de repasse</b> e cadastre o % de cada profissional (por convênio, se for diferente).') :
    r.semRegra ? aviso('laranja', r.semRegra + (r.semRegra === 1 ? ' linha com valor sem regra' : ' linhas com valor sem regra'), 'Essas linhas ficam fora do total. Cadastre a regra (profissional + convênio) em <b>Regras de repasse</b>.') : '';
  $("#r2-kpis").innerHTML = '<div class="kpi roxo"><b>' + esc(R(tot.pago)) + '</b><span>repasse sobre o que já entrou</span></div><div class="kpi amarela"><b>' + esc(R(tot.prev)) + '</b><span>repasse previsto (inclui em aberto e convênio a receber)</span></div><div class="kpi"><b>' + esc(R(tot.perdido)) + '</b><span>perdido / glosa (repasse 0)</span></div>';
  var card = el('<div class="tabela-card"><div class="tabela-wrap"><table><thead><tr><th>Profissional</th><th>Sessões</th><th>Por convênio</th><th>Base já recebida</th><th>Repasse já recebido</th><th>Repasse previsto</th><th></th></tr></thead><tbody></tbody></table></div><div class="tabela-rodape"><span>Clique num profissional pra ver as linhas</span><span>Atualizado ' + esc(r.atualizado || '') + '</span></div></div>');
  var tb = $('tbody', card);
  r.porProfissional.forEach(function (p) {
    var conv = p.porConvenio.map(function (c) { return esc(c.convenio) + ' <span class="muted">' + c.sessoes + '× · ' + esc(pctTxt(c.pct)) + '</span>'; }).join('<br>');
    var tr = el('<tr class="clicavel' + (repProf === p.profissional ? ' sel' : '') + '" tabindex="0"><td><b>' + esc(p.profissional) + '</b>' + (p.semRegra ? '<div><span class="tag laranja">' + p.semRegra + ' sem regra</span></div>' : '') + '</td><td>' + p.sessoes + '</td><td>' + conv + '</td><td>' + esc(R(p.basePago)) + '</td><td><b>' + esc(R(p.repassePago)) + '</b></td><td>' + esc(R(p.repassePrev)) + '</td><td class="muted">ver linhas</td></tr>');
    var abrir = function () { repProf = repProf === p.profissional ? '' : p.profissional; renderRepasse(); if (repProf) $("#r2-linhas").scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    tr.addEventListener('click', abrir); tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') abrir(); });
    tb.appendChild(tr);
  });
  if (!r.porProfissional.length) tb.innerHTML = '<tr><td colspan="7" class="vazio">Nenhum atendimento no mês.</td></tr>';
  $("#r2-resumo").innerHTML = ''; $("#r2-resumo").appendChild(card);
  var box = $("#r2-linhas"); box.innerHTML = '';
  if (!repProf) return;
  var ls = r.linhas.filter(function (l) { return l.profissional === repProf; });
  box.appendChild(tabelaG('Linhas de ' + repProf + ' · ' + r.mes, [['Data', 'data'], ['Paciente', 'paciente'], ['Procedimento', 'procedimento'], ['Convênio', 'convenio'], ['Pago?', 'pago'], ['Situação', 'situacao'], ['Valor', function (l) { return l.valor ? 'R$ ' + brl(l.valor) : ''; }], ['%', function (l) { return pctTxt(l.pct); }], ['Repasse já recebido', function (l) { return 'R$ ' + brl(l.repassePago); }], ['Repasse previsto', function (l) { return 'R$ ' + brl(l.repassePrev); }]], ls, 'Nenhuma linha.'));
}
/* ---------- editor das regras ---------- */
function renderRegras() {
  var box = $("#r2-regras"), regras = (REP && REP.regras || []).map(function (g) { return Object.assign({}, g); });
  var profs = ['Todos'].concat((BOOT.profissionais || []).map(function (p) { return p.nome; }));
  var convs = ['Qualquer', 'Particular'].concat((BOOT.listas.convenios || []).filter(function (c) { return c !== 'Particular'; }));
  var opt = function (lista, v) { if (v && lista.indexOf(v) < 0) lista = lista.concat([v]); return lista.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join(''); };
  var linha = function (g, i) {
    return '<tr data-i="' + i + '"' + (g.ativa === false ? ' class="desligada"' : '') + '><td><select data-k="profissional">' + opt(profs, g.profissional || '') + '</select></td><td><select data-k="convenio">' + opt(convs, g.convenio || 'Qualquer') + '</select></td>' +
      '<td><input data-k="procedimento" value="' + esc(g.procedimento || '') + '" placeholder="(qualquer)" autocomplete="off"></td><td><div class="campo-wrap"><input data-k="pct" inputmode="decimal" value="' + esc(g.pct == null ? '' : String(g.pct).replace('.', ',')) + '" style="width:70px"><span class="prefixo">%</span></div></td>' +
      '<td><div class="campo-wrap"><span class="prefixo">R$</span><input data-k="valorRef" class="dinheiro" inputmode="decimal" value="' + (g.valorRef ? brl(g.valorRef) : '') + '" placeholder="—" style="width:90px"></div></td><td><input data-k="obs" value="' + esc(g.obs || '') + '" autocomplete="off"></td>' +
      '<td><label class="check"><input type="checkbox" data-k="ativa"' + (g.ativa === false ? '' : ' checked') + '> ativa</label></td></tr>';
  };
  box.innerHTML = '<div class="cab"><h2>Regras de repasse</h2><span class="esp"></span><button type="button" class="btn icone p" data-fechar aria-label="Fechar">' + ic('fechar', 16) + '</button></div>' +
    '<p class="muted" style="margin:0">Vale a regra mais específica: uma regra com procedimento (ex.: avaliação neuropsicológica 0%) ganha de todas; depois, a do profissional (com o convênio certo antes de "Qualquer"); "Todos" serve de regra geral. Desmarcar "ativa" desliga a regra sem apagar. ' +
    '"Valor da sessão" é usado quando a linha do convênio está sem valor na aba do mês (ex.: Sabin R$ 40); uma regra pode ter só o valor, sem %. As regras ficam na aba <b>Regras de repasse</b> da planilha.</p>' +
    '<div class="tabela-wrap"><table class="regras"><thead><tr><th>Profissional</th><th>Convênio</th><th>Procedimento contém</th><th>% repasse</th><th>Valor da sessão (convênio)</th><th>Observação</th><th></th></tr></thead><tbody></tbody></table></div>' +
    '<div data-erros></div><div class="acoes"><button type="button" class="btn ter" data-nova>+ Nova regra</button><button type="button" class="btn" data-salvar>Salvar regras</button></div>';
  box.hidden = false;
  var tb = $('tbody', box), desenhar = function () { tb.innerHTML = regras.map(linha).join('') || '<tr><td colspan="7" class="vazio">Nenhuma regra ainda. Clique em "+ Nova regra".</td></tr>'; };
  var ler = function () { $$('tr[data-i]', tb).forEach(function (tr) { var g = regras[+tr.dataset.i]; $$('[data-k]', tr).forEach(function (x) { g[x.dataset.k] = x.type === 'checkbox' ? x.checked : x.value.trim(); }); }); };
  desenhar();
  $('[data-nova]', box).addEventListener('click', function () { ler(); regras.push({ ativa: true, profissional: repProf || '', convenio: 'Qualquer', procedimento: '', pct: '', valorRef: '', obs: '' }); desenhar(); var u = $$('tr[data-i]', tb).pop(); if (u) $('[data-k=pct]', u).focus(); });
  $('[data-fechar]', box).addEventListener('click', function () { repRegrasAbertas = false; box.hidden = true; });
  $('[data-salvar]', box).addEventListener('click', function () {
    ler(); var b = this, er = [];
    regras.forEach(function (g, i) { var n = num(String(g.pct).replace('%', '')); if (!g.profissional) er.push('Regra ' + (i + 1) + ': escolha o profissional (ou "Todos").'); if (n == null ? !(num(g.valorRef) > 0) : (n < 0 || n > 100)) er.push('Regra ' + (i + 1) + ': % entre 0 e 100 (ou deixe o % em branco e informe só o valor da sessão do convênio).'); });
    $('[data-erros]', box).innerHTML = erroBox(er); if (er.length) return;
    b.disabled = true;
    call('salvarRegrasRepasse', { regras: regras }).then(function (r) {
      if (!r.ok) { $('[data-erros]', box).innerHTML = erroBox(r.erros || [], 'Não gravou'); return; }
      toast(r.alteradas ? r.alteradas + (r.alteradas === 1 ? ' regra gravada' : ' regras gravadas') : 'Nada mudou'); carregarRepasse();
    }).catch(function (e) { toast('Erro: ' + e.message); }).finally(function () { b.disabled = false; });
  });
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
