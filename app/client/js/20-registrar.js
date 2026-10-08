/* ================= REGISTRAR ATENDIMENTO ================= */
var cur = null, ultimoPacCur = null, baseValor = null, atIniciado = false, ultimoPacRender = null, atPrefill = null, decisaoPagador = null, salvandoAt = false;
var CAMPOS_AT = ["a-pac", "a-prof", "a-data", "a-hora", "a-tipo", "a-oque", "a-pago", "a-valor", "a-forma", "a-recebido", "a-datapag", "a-quem", "a-nf", "a-nfn", "a-guia", "a-obs"];
var OQUE_CURTO = function (x) { return String(x).split(' (')[0]; };

INICIAR.registrar = function (extra) {
  if (extra && extra.paciente) atPrefill = extra;
  quandoAT(iniciarAtend);
};
function iniciarAtend() {
  if (!atIniciado) {
    atIniciado = true;
    $("#a-aba-nome").textContent = 'Grava na aba ' + AT.abaMes + (AT.abaMesExiste ? '' : ' (ainda não existe!)');
    preencherSelect($("#a-prof"), BOOT.profissionais, '—');
    preencherSelect($("#a-oque"), BOOT.listas.oque || []);
    preencherSelect($("#a-pago"), (BOOT.listas.pago || []).concat((BOOT.listas.pago || []).indexOf('Parcial') < 0 ? ['Parcial'] : []), '—');
    preencherSelect($("#a-forma"), BOOT.listas.formas || []);
    preencherSelect($("#a-ant-forma"), BOOT.listas.formas || []);
    var segO = $("#a-oque-seg"); segO.innerHTML = '';
    (BOOT.listas.oque || []).forEach(function (o) { var b = el('<button type="button" data-v="' + esc(o) + '" aria-pressed="false">' + esc(OQUE_CURTO(o)) + '</button>'); b.addEventListener('click', function () { $("#a-oque").value = o; seg(segO, o); aplicarRegra(); salvarRascunhoAt(); }); segO.appendChild(b); });
    segO.appendChild(el('<span class="muted" id="a-oque-hint" style="flex-basis:100%"></span>'));
    $("#a-data").value = hojeStr(); $("#a-hora").value = agoraHora(); $("#a-datapag").value = hojeStr();
    $("#a-carregando").hidden = true; ["a-passo1", "a-passo2", "a-passo-obs", "a-lateral", "a-rodape"].forEach(function (id) { $("#" + id).hidden = false; });
    if (!atPrefill && lerRascunhoAt()) toast('Rascunho recuperado');
    onPacAt(true);
  }
  if (atPrefill) {
    var p = atPrefill; atPrefill = null;
    limparAt(true, true);
    $("#a-pac").value = p.paciente; if (p.profissional) $("#a-prof").value = p.profissional; if (p.data) $("#a-data").value = p.data; if (p.hora) $("#a-hora").value = p.hora;
    onPacAt(true);
  }
}
function salvarRascunhoAt() { try { var o = {}; CAMPOS_AT.forEach(function (id) { o[id] = $("#" + id).value; }); o._hora = agoraHora(); localStorage.setItem('rn-atend', JSON.stringify(o)); $("#a-rascunho").hidden = !o['a-pac']; $("#a-rascunho").textContent = 'rascunho guardado ' + o._hora; } catch (e) { } }
function lerRascunhoAt() { try { var o = JSON.parse(localStorage.getItem('rn-atend') || 'null'); if (!o || !o['a-pac']) return false; ["a-pac", "a-prof", "a-obs", "a-nfn", "a-quem"].forEach(function (id) { if (o[id]) $("#" + id).value = o[id]; }); $("#a-rascunho").hidden = false; $("#a-rascunho").textContent = 'rascunho guardado ' + (o._hora || ''); return true; } catch (e) { return false; } }
function limparRascunhoAt() { try { localStorage.removeItem('rn-atend'); } catch (e) { } $("#a-rascunho").hidden = true; }

function fillTipos() {
  var esps = espsDoProf($("#a-prof").value), tipos = tiposDe(esps), t = $("#a-tipo"), atual = t.value; t.innerHTML = '';
  tipos.forEach(function (p) { var o = document.createElement('option'); o.value = p.nome; o.textContent = p.nome; t.appendChild(o); });
  if (atual && tipos.some(function (p) { return p.nome === atual; })) t.value = atual;
  else { var pad = tipos.filter(function (p) { return /^(Sessão|Consulta)/.test(p.nome); })[0]; if (pad) t.value = pad.nome; }
  var sel = $("#a-proc"); sel.innerHTML = ''; procsDe(esps).forEach(function (p) { var o = document.createElement('option'); o.value = p.nome; o.textContent = p.nome + (p.valor == null ? ' (valor à mão)' : ' · R$ ' + brl(p.valor)); sel.appendChild(o); });
}
function aplicarTipo() { var base = $("#a-tipo").value; if (!base) { $("#a-proc-view").textContent = '—'; return; } var nome = derivarProc(base, cur); $("#a-proc").value = nome; if ($("#a-proc").value !== nome) { var o = document.createElement('option'); o.value = nome; o.textContent = nome; $("#a-proc").appendChild(o); $("#a-proc").value = nome; } mostrarProc(); aplicarRegra(); }
function mostrarProc() { var p = procObj($("#a-proc").value); $("#a-proc-view").textContent = p ? p.nome + (p.valor == null ? ' (valor à mão)' : ' · R$ ' + brl(p.valor)) : ($("#a-proc").value || '—'); }

function onPacAt(force) {
  var nome = $("#a-pac").value.trim();
  if (force !== true && nome === ultimoPacRender) return; // o 'change' que dispara ao sair do campo não pode refazer a tela (perderia o clique no botão)
  ultimoPacRender = nome;
  cur = AT ? AT.pacientes.filter(function (p) { return p.nome === nome; })[0] || null : null;
  var box = $("#a-avisos"); box.innerHTML = ''; $("#a-renbox").hidden = true; $("#a-antbox").hidden = true; $("#a-pagador-novo").hidden = true; decisaoPagador = null; $("#a-tornar").checked = false;
  if (cur && cur.nome !== ultimoPacCur) { cur._avulsa = false; cur._cobrar = false; } ultimoPacCur = cur ? cur.nome : null;
  $("#a-guia").value = 'Não'; $("#a-guia-chk").checked = false; // guia começa como não assinada: a recepção marca quando conferir
  fillTipos();
  cartaoPaciente();
  if (!cur) { $("#a-pac-hint").textContent = nome ? 'Não está em Pacientes. Cadastre antes em "+ Novo paciente".' : 'Só quem está em Pacientes.'; aplicarTipo(); return; }
  $("#a-pac-hint").textContent = '';
  // linha-resumo da cobrança + Observação (gestão, 07-08/10)
  var rc = resumoCob(cur, $("#a-prof").value), ep = estPacote(cur), pg = pagDe(cur), pacAnt = ehPacoteCob(cur) && pg === 'Antecipado';
  var obsHtml = cur.obsCobranca ? '<div>Observação: ' + esc(cur.obsCobranca) + '</div>' : '';
  var btRen = '<button class="btn sec" type="button" id="a-btn-renovar">Registrar renovação</button>';
  if (cadastroIncompleto(cur)) {
    box.innerHTML += aviso('laranja', 'Cadastro incompleto · cobrança em branco', 'Pergunte como este paciente paga. Por enquanto o app cobra pela Tabela.' + obsHtml, '<button class="btn sec" type="button" id="a-btn-cad">Completar cadastro</button>');
  } else if (pacAnt && cur._avulsa) {
    box.innerHTML += aviso('laranja', 'Cobrando avulsa pela Tabela', 'Pacote esgotado: esta sessão não mexe nas sessões do pacote e é cobrada pela Tabela.' + obsHtml, '<div class="acoes" style="flex-basis:100%"><button class="btn ter" type="button" id="a-btn-voltapac">Voltar para o pacote</button>' + btRen + '</div>');
  } else if (pacAnt && ep.disponiveis <= 0) {
    box.innerHTML += aviso('vermelha', 'Pacote esgotado — renovar antes de atender', esc('Cobrança: ' + rc[1]) + obsHtml + '<div>Se atender mesmo assim, a sessão fica devendo e sai da próxima renovação.</div>', '<div class="acoes" style="flex-basis:100%">' + btRen.replace('btn sec', 'btn') + '<button class="btn ter" type="button" id="a-btn-avulsa">Cobrar avulsa pela Tabela</button></div>');
  } else if (pacAnt) {
    var ult = ep.disponiveis === 1 ? '<div><b>Última sessão do pacote:</b> avise que a próxima precisa de renovação.</div>' : '';
    var venc = ep.vencido ? '<div><b>Validade vencida em ' + esc(ep.validade) + '.</b> Confira com a gestão.</div>' : '';
    box.innerHTML += aviso(ep.vencido ? 'vermelha' : ep.disponiveis === 1 ? 'amarela' : 'verde', 'Cobrança: ' + esc(rc[1]), ult + venc + obsHtml, '<div class="acoes" style="flex-basis:100%">' + btRen + '</div>');
  } else {
    var extra = '';
    if (ehPacoteCob(cur) && pg === 'Posterior') extra = '<div>Cada sessão fica lançada com Pago? = Não. No fim do mês o total aparece em Pendências. Este mês: ' + sessoesTxt(ep.sessoesMes || 0) + (ep.aPagarMes ? ', R$ ' + brl(ep.aPagarMes) + ' a pagar' : '') + '.</div>';
    else if (pg === 'Posterior' && !cobConvenio(cur)) extra = '<div>A sessão fica lançada com Pago? = Não. No fim do mês o total aparece em Pendências e é recebido por lá.</div>';
    box.innerHTML += aviso(cobConvenio(cur) || ehProBono(cur) ? 'lilas' : 'cinza', 'Cobrança: ' + esc(rc[1]), extra + obsHtml,
      pg === 'Antecipado' && !ehPacoteCob(cur) ? '<div class="acoes" style="flex-basis:100%"><button class="btn sec" type="button" id="a-btn-ant">Recebeu adiantado: lançar sessões pagas</button></div>' : '');
  }
  var bant = $("#a-btn-ant"); if (bant) bant.addEventListener('click', abrirAntecipado);
  var bc = $("#a-btn-cad"); if (bc) bc.addEventListener('click', function () { go('pacientes', { editar: cur.nome, voltar: 'registrar' }); });
  var br = $("#a-btn-renovar"); if (br) br.addEventListener('click', function () { abrirRenovacao($("#a-renbox"), cur, function () { cur._avulsa = false; onPacAt(true); }); });
  var ba = $("#a-btn-avulsa"); if (ba) ba.addEventListener('click', function () { cur._avulsa = true; onPacAt(true); cur._avulsa = true; aplicarTipo(); toast('Cobrando avulsa pela Tabela'); });
  var bv = $("#a-btn-voltapac"); if (bv) bv.addEventListener('click', function () { cur._avulsa = false; onPacAt(true); });
  $("#a-quem").value = cur.pagador || cur.nome;
  aplicarTipo();
}
function cartaoPaciente() {
  var p = cur;
  $("#a-pc-ini").textContent = p ? p.nome.charAt(0).toUpperCase() : '?';
  $("#a-pc-nome").textContent = p ? p.nome : 'Escolha o paciente';
  $("#a-pc-nasc").textContent = p && p.nasc ? (idade(p.nasc) ? idade(p.nasc) + ' · ' : '') + 'nasc. ' + p.nasc : '';
  $("#a-pc-mod").textContent = p ? (cobDe(p) || 'em branco (Tabela)') : '—';
  $("#a-pc-quando").textContent = p ? pagDe(p) : '—';
  $("#a-pc-conv").textContent = p ? (p.convenio || '—') : '—';
  $("#a-pc-pag").textContent = p ? (p.pagador || p.nome) : '—';
  $("#a-pc-prof").textContent = $("#a-prof").value || '—';
  $("#a-pc-valor").textContent = p ? valorSessaoTxt(p, $("#a-prof").value) : '—';
  $("#a-editcad").hidden = !p; $("#a-hist").hidden = !(p && ehPacoteCob(p));
}
// pacote: decide se esta linha gasta sessão (mesma regra do servidor)
function pacoteNoAt() { return !!(cur && ehPacoteCob(cur) && !cur._avulsa); }
function consumoAtual() { return consumoPacote($("#a-oque").value, $("#a-proc").value, !$("#l-mesma-semana").hidden && $("#a-mesma-semana").checked, estPacote(cur).faltasAvisadasMes || 0); }
function consumoTxt(c) {
  if (!c) return '';
  var e = estPacote(cur), ant = pagDe(cur) === 'Antecipado', motivo = c.nota ? c.nota.split(':')[0] : '';
  if (c.delta < 0) return 'Gasta 1 sessão do pacote' + (motivo ? ' (' + motivo + ')' : '') + (ant ? (e.disponiveis > 0 ? (e.disponiveis - 1 === 1 ? ' · fica ' : ' · ficam ') + disponiveisTxt(e.disponiveis - 1) : ' · pacote esgotado: fica devendo para a próxima renovação') : ' · R$ ' + brl(valorSessaoPacote(cur) || 0) + ' a pagar no fim do mês') + '.';
  return 'Não gasta sessão do pacote' + (motivo ? ': ' + motivo : '') + '.';
}
// Regras de cobrança pela Cobrança + Pagamento do cadastro. Só muda o que aparece na tela (layoutCobranca).
function aplicarRegra() {
  var v = $("#a-valor"), h = $("#a-valor-hint"), pago = $("#a-pago"), forma = $("#a-forma"), nf = $("#a-nf"), desc = $("#a-desc-sel"), opts = BOOT.listas.pago || [];
  var p = procObj($("#a-proc").value), procV = p ? p.valor : null;
  [v, forma, nf].forEach(function (x) { x.disabled = false; }); desc.disabled = false; v.readOnly = true; v.value = ''; v.placeholder = ''; h.textContent = '';
  var modo = 'tabela';
  $("#l-mesma-semana").hidden = true;
  if (!cur) { if (p && procV != null) { v.value = brl(procV); h.textContent = 'vem do procedimento'; } baseValor = procV; layoutCobranca('tabela', false); return; }
  var oque = $("#a-oque").value, falta = !/^Atendido/.test(oque), cob = cobDe(cur), pg = pagDe(cur), pacote = pacoteNoAt();
  $("#l-mesma-semana").hidden = !(pacote && /em cima da hora/i.test(oque));
  var cons = pacote ? consumoAtual() : null, pagoPacote = pick(opts, 'Pacote') || pick(opts, 'Plano');
  var semCobranca = procV === 0 && (!cur._cobrar || ehAplicacaoTeste());
  if (ehProBono(cur) && !cur._cobrar) { v.disabled = true; forma.disabled = true; desc.disabled = true; pago.value = pick(opts, 'Não se aplica'); nf.value = 'Não se aplica'; h.textContent = 'sem cobrança'; modo = 'probono'; }
  else if (cobConvenio(cur) && !cur._cobrar) { v.value = brl(0); v.disabled = true; forma.disabled = true; desc.disabled = true; pago.value = pick(opts, 'Convênio'); nf.value = 'Não se aplica'; h.textContent = 'faturado no convênio'; modo = 'convenio'; }
  else if (pacote && semCobranca) { v.value = brl(0); pago.value = pick(opts, 'Não se aplica'); nf.value = 'Não se aplica'; h.textContent = ehAplicacaoTeste() ? 'já paga na avaliação neuropsicológica · só controle das sessões de teste' : 'procedimento sem cobrança (R$ 0 na tabela)'; }
  else if (pacote && pg === 'Antecipado') { v.disabled = true; forma.disabled = true; desc.disabled = true; pago.value = pagoPacote; nf.value = 'Não se aplica'; h.textContent = 'já paga no pacote'; modo = 'pacote'; }
  else if (pacote) {
    var vs = valorSessaoPacote(cur);
    if (vs != null) { v.value = brl(vs); h.textContent = 'valor do pacote ÷ sessões'; } else { v.readOnly = false; v.placeholder = 'preencher à mão'; h.textContent = 'pacote sem valor no cadastro'; }
    pago.value = pg === 'Posterior' ? pick(opts, 'Não') : pick(opts, 'Sim'); nf.value = 'Não';
    if (pg === 'Posterior') h.textContent += ' · paga no fim do mês';
  }
  else {
    // procedimento R$ 0 na tabela (aplicação de teste, retorno): sem cobrança, mesmo com valor combinado no cadastro
    var sessao = p && /^(Sessão|Consulta|Terapia)/.test(p.nome), vc = cob === 'Por sessão (combinado)' ? valorComb(cur) : null;
    if (semCobranca) { v.value = brl(0); h.textContent = ehAplicacaoTeste() ? 'já paga na avaliação neuropsicológica · só controle das sessões de teste' : 'procedimento sem cobrança (R$ 0 na tabela)'; }
    else if (vc != null && sessao) { v.value = brl(vc); h.textContent = 'valor combinado do cadastro'; }
    else if (procV == null || (cur._cobrar && procV === 0)) { v.readOnly = false; v.placeholder = 'preencher à mão'; h.textContent = cur._cobrar ? 'exceção: cobrado à parte, valor à mão' : 'procedimento sem valor na tabela'; }
    else { v.value = brl(procV); h.textContent = cur._avulsa ? 'avulsa pela Tabela (travado)' : 'vem do procedimento (travado)'; }
    pago.value = semCobranca ? pick(opts, 'Não se aplica') : (pg === 'Posterior' && !cur._avulsa) ? pick(opts, 'Não') : pick(opts, 'Sim'); nf.value = semCobranca ? 'Não se aplica' : 'Não';
    if (pg === 'Posterior' && !semCobranca && !cur._avulsa) h.textContent += ' · paga no fim do mês';
  }
  baseValor = procV;
  var hintFalta = pacote && !semCobranca ? consumoTxt(cons) : '';
  if (falta) {
    if (pacote && cons.delta < 0 && pg !== 'Antecipado' && v.value) { forma.disabled = true; desc.disabled = true; pago.value = pick(opts, 'Não'); nf.value = 'Não se aplica'; }
    else { v.value = ''; v.disabled = true; forma.disabled = true; desc.disabled = true; pago.value = pacote && cons.delta < 0 ? pagoPacote : ''; nf.value = 'Não se aplica'; }
    if (!pacote) hintFalta = (/sem aviso|em cima da hora/.test(oque) && !cobConvenio(cur) && !ehProBono(cur)) ? 'Falta: vira pendência de taxa pra gestão decidir.' : 'Sem cobrança nesta linha.';
  }
  $("#a-oque-hint").textContent = hintFalta;
  mostrarPagParcial();
  layoutCobranca(modo, falta);
}
// avaliação neuropsicológica: o valor varia e pode ser cobrado à parte mesmo de paciente de convênio (gestão, 08/10).
// A aplicação de teste nunca é cobrada: já está paga na avaliação e serve só pra contar as sessões de teste.
function excecaoConv() { return /^Avaliação neuropsicol/i.test($("#a-proc").value || ''); }
function ehAplicacaoTeste() { return /^Aplicação de teste/i.test($("#a-proc").value || ''); }
// o que aparece no passo 3, pelo modo da regra
function layoutCobranca(modo, falta) {
  var p3 = $("#a-passo3"), pb = $("#a-probono");
  pb.hidden = true; p3.hidden = true; $("#a-convbox").hidden = true; $("#a-pagbox").hidden = false; $("#a-cob-aviso").innerHTML = '';
  if (!cur || falta) { if (cur && !falta) p3.hidden = false; atualizarPreview(); return; }
  if (modo === 'probono') { pb.hidden = false; $("#a-probono-txt").innerHTML = '<strong>Sem cobrança</strong> · ' + esc(cur.regra || cur.modalidade) + (cur.obsCobranca ? ' (' + esc(cur.obsCobranca) + ')' : '') + '. “Pago?” fica como <em>Não se aplica</em>. Nenhuma NF.'; }
  else if (modo === 'pacote') { /* a faixa de aviso já explica; nada de dinheiro na tela */ }
  else {
    p3.hidden = false;
    if (modo === 'convenio') { $("#a-convbox").hidden = false; $("#a-pagbox").hidden = true; $("#a-conv-txt").innerHTML = '<strong>' + esc(cur.convenio || 'Convênio') + '</strong> · vai para a fatura do convênio, valor R$ 0. Nenhuma cobrança ao paciente.' + (excecaoConv() ? ' <button type="button" class="btn link" id="a-conv-cobrar">Cobrar à parte como particular</button>' : '');
      var bcv = $("#a-conv-cobrar"); if (bcv) bcv.addEventListener('click', function () { cur._cobrar = true; aplicarTipo(); toast('Exceção: cobrando à parte. Preencha o valor e anote o motivo na Observação'); }); $("#a-guia-chk").checked = $("#a-guia").value === 'Sim'; }
    else if (cur._cobrar && ehConvenio(cur) && excecaoConv()) { $("#a-cob-aviso").innerHTML = '<div class="faixa nota">Exceção ao convênio: este atendimento é cobrado à parte, como particular, com o valor combinado. <button type="button" class="btn link" id="a-conv-voltar">Voltar para o convênio</button></div>'; $("#a-conv-voltar").addEventListener('click', function () { cur._cobrar = false; aplicarTipo(); }); }
  }
  seg($("#a-pago-seg"), $("#a-pago").value); seg($("#a-nf-seg"), $("#a-nf").value === 'Sim' ? 'Sim' : 'Não');
  var pagoVal = $("#a-pago").value; $("#a-pago-outro").hidden = false; if (pagoVal && pagoVal !== 'Sim' && pagoVal !== 'Não' && pagoVal !== 'Parcial') { $("#a-pago").classList.remove('sr'); } else $("#a-pago").classList.add('sr');
  $("#a-quem-tag").hidden = !(cur && $("#a-quem").value.trim() === (cur.pagador || cur.nome));
  atualizarPreview();
}
function resumoCobranca() {
  if (!cur) return '—';
  var oque = $("#a-oque").value, pac = pacoteNoAt(), cons = pac ? consumoAtual() : null, suf = pac ? ' · ' + (cons.delta < 0 ? 'gasta 1 sessão do pacote' : 'não gasta sessão do pacote') : '';
  var pago = $("#a-pago").value, v = $("#a-valor").value, forma = $("#a-forma").value;
  if (!/^Atendido/.test(oque)) return (pago === 'Não' && v ? OQUE_CURTO(oque).toLowerCase() + ' · R$ ' + v + ' a pagar no fim do mês' : 'sem cobrança (' + OQUE_CURTO(oque).toLowerCase() + ')') + suf;
  if (/^Não se aplica/.test(pago)) return 'não se aplica (' + (ehProBono(cur) ? cobDe(cur).toLowerCase() : 'sem cobrança') + ')' + suf;
  if (/^Convênio/.test(pago)) return 'convênio ' + (cur.convenio || '') + ' · R$ 0 · guia ' + ($("#a-guia").value === 'Sim' ? 'assinada' : 'não assinada');
  if (/^Pacote|^Plano/.test(pago)) return 'pacote · sessão já paga' + suf;
  if (pago === 'Sim') return 'pago · R$ ' + (v || '…') + ' · ' + forma + ($("#a-nf").value === 'Sim' ? ' · NF ' + ($("#a-nfn").value || 'emitida') : ' · NF depois') + suf;
  if (pago === 'Não') return 'não pago · ' + (v ? 'R$ ' + v + ' em aberto' : 'valor em aberto') + suf;
  if (pago === 'Parcial') { var rc = num($("#a-recebido").value) || 0, vt = num(v) || 0; return 'pago em parte · R$ ' + brl(rc) + ' de R$ ' + (v || '…') + ' · ' + forma + ' · em aberto R$ ' + brl(Math.max(0, vt - rc)) + ($("#a-nf").value === 'Sim' ? ' · NF ' + ($("#a-nfn").value || 'emitida') + ' sobre o recebido' : ' · NF depois'); }
  return pago || 'Pago? em branco';
}
function atualizarPreview() {
  var d = $("#a-data").value, h = $("#a-hora").value;
  $("#a-preview").innerHTML = '<div><span class="muted">Aba</span> ' + esc(dataObj($("#a-data").value) ? MESES_PT[dataObj($("#a-data").value).getMonth()] : (AT ? AT.abaMes : '')) + ' · linha nova</div>' +
    '<div><span class="muted">Paciente</span> ' + esc($("#a-pac").value || '—') + '</div>' +
    '<div><span class="muted">Profissional</span> ' + esc($("#a-prof").value || '—') + ' · ' + esc(d.slice(0, 5)) + (h ? ' ' + esc(h) : '') + '</div>' +
    '<div><span class="muted">Aconteceu</span> ' + esc(OQUE_CURTO($("#a-oque").value)) + '</div>' +
    '<div><span class="muted">Procedimento</span> ' + esc($("#a-proc").value || '—') + '</div>' +
    '<div><span class="muted">Cobrança</span> ' + esc(resumoCobranca()) + '</div>' +
    '<div><span class="muted">Por</span> ' + esc(quemSou()) + ' · ' + agoraHora() + '</div>';
}
function calcDescAt() { var raw = $("#a-desc-val").value.trim(), fin = baseValor; if (fin == null) return; if (raw.endsWith('%')) fin = baseValor * (1 - parseFloat(raw.replace(',', '.')) / 100); else if (raw) fin = baseValor - (num(raw) || 0); if (isNaN(fin) || fin < 0) fin = baseValor; $("#a-desc-final").value = brl(fin); if (!$("#a-descbox").hidden && raw) $("#a-valor").value = brl(fin); atualizarPreview(); }
function dadosAt() {
  var obs = $("#a-obs").value.trim();
  if (!$("#a-descbox").hidden && $("#a-desc-val").value.trim()) obs = ('Desconto: R$ ' + $("#a-desc-final").value + ' (tabela R$ ' + brl(baseValor) + ') — ' + $("#a-desc-motivo").value.trim() + '. ' + obs).trim();
  if (cur && cur._avulsa && ehPacoteCob(cur)) obs = ('Pacote esgotado: sessão cobrada avulsa pela Tabela. ' + obs).trim();
  return { paciente: $("#a-pac").value.trim(), profissional: $("#a-prof").value, data: $("#a-data").value, hora: $("#a-hora").value, procedimento: $("#a-proc").value,
    oque: $("#a-oque").value, pago: $("#a-pago").value, valorRecebido: $("#a-pago").value === 'Parcial' ? $("#a-recebido").value : '', valor: $("#a-valor").disabled ? '' : $("#a-valor").value, forma: $("#a-forma").value, dataPagamento: $("#a-datapag").value,
    quemPagou: $("#a-quem").value.trim(), nf: $("#a-nf").value, nfNumero: $("#a-nfn").value.trim(), guia: $("#a-convbox").hidden && !(cur && ehConvenio(cur)) ? '' : $("#a-guia").value, observacao: obs,
    mesmaSemana: !$("#l-mesma-semana").hidden && $("#a-mesma-semana").checked, cobrarAvulsa: !!(cur && cur._avulsa && ehPacoteCob(cur)), tornarPagadorHabitual: $("#a-tornar").checked };
}
function pagadorDiferente() { var q = $("#a-quem").value.trim(); return !!(cur && q && q !== (cur.pagador || cur.nome)); }
function validarAt() {
  var e = [];
  if (!cur) e.push('Escolha um paciente da lista (só quem está em Pacientes).');
  if (!$("#a-prof").value) e.push('Escolha o profissional.');
  if (!$("#a-proc").value) e.push('Escolha o tipo de atendimento.');
  if (!dataValida($("#a-data").value)) e.push('Data inválida.');
  if ($("#a-hora").value && !/^\d{1,2}:\d{2}$/.test($("#a-hora").value)) e.push('Hora inválida (hh:mm).');
  if (!$("#a-descbox").hidden && $("#a-desc-val").value.trim() && !$("#a-desc-motivo").value.trim()) e.push('Desconto: informe quem autorizou.');
  if ($("#a-pago").value === 'Sim' && !(num($("#a-valor").value) > 0)) e.push('Pago? = Sim exige um valor maior que zero.');
  if ($("#a-pago").value === 'Parcial') { var vt = num($("#a-valor").value), rc = num($("#a-recebido").value); if (!(vt > 0)) e.push('Pago parcial: falta o valor da sessão.'); else if (!(rc > 0 && rc < vt)) e.push('Pago parcial: o recebido agora tem de ser maior que zero e menor que R$ ' + brl(vt) + '.'); }
  return e;
}
function salvarAt(voltar) {
  if (salvandoAt) return;
  var erros = validarAt(); $("#a-erros").innerHTML = erroBox(erros);
  if (erros.length) { $("#a-erros").scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  if (pagadorDiferente() && decisaoPagador === null) { $("#a-pagador-nome").textContent = $("#a-quem").value.trim(); $("#a-pagador-novo").hidden = false; $("#a-pagador-novo").scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('Pagou outra pessoa: decida se vira o pagador habitual'); return; }
  salvandoAt = true; $("#a-salvar").disabled = true; $("#a-salvar-outro").disabled = true;
  var d = dadosAt();
  call('registrarAtendimento', d).then(function (r) {
    if (!r.ok) { $("#a-erros").innerHTML = erroBox(r.erros || [], 'Não gravou'); return; }
    if (r.consumo) { var ps = AT.pacotesSessoes = AT.pacotesSessoes || {}, ep = ps[d.paciente] = ps[d.paciente] || estPacote({ nome: d.paciente }); if (r.disponiveis != null) ep.disponiveis = r.disponiveis; if (/^1ª falta/.test(r.consumo.nota || '')) ep.faltasAvisadasMes = (ep.faltasAvisadasMes || 0) + 1; }
    if (d.tornarPagadorHabitual && cur) { cur.pagador = d.quemPagou; }
    if (typeof invalidarResumo === 'function') invalidarResumo();
    var msg = d.paciente + ' · ' + OQUE_CURTO(d.oque) + ' · gravado na aba ' + r.aba + ', linha ' + r.linha;
    limparAt(false);
    if (voltar) { go('hoje'); toast('Atendimento gravado: ' + d.paciente); }
    else {
      // linha verde "Registrado!" + atalho pra lista do dia do atendimento (Roberta, 06/10)
      var dataReg = d.data, ehHoje = dataReg === hojeStr();
      $("#a-sucesso").innerHTML = aviso('verde', 'Registrado! ' + esc(msg), esc(d.procedimento) + (d.valor ? ' · R$ ' + esc(d.valor) : '') + (d.pago ? ' · Pago? ' + esc(d.pago) : '') + (r.consumo ? ' · ' + (r.consumo.delta < 0 ? 'gastou 1 sessão do pacote' : 'não gastou sessão do pacote') + (r.disponiveis != null ? ' (' + disponiveisTxt(r.disponiveis) + ')' : '') : '') + '. <a href="#" id="a-ver-lista">' + (ehHoje ? 'ver na lista de hoje' : 'ver na lista de ' + esc(dataReg.slice(0, 5))) + '</a>');
      $("#a-ver-lista").addEventListener('click', function (e) { e.preventDefault(); var dt = dataObj(dataReg); if (dt) $("#d-data").value = dataParaISO(dt); go('hoje'); });
      toast('Registrado!'); $("#a-pac").focus();
    }
  }).catch(function (e) { banner('Não consegui gravar na planilha (' + e.message + '). Seus dados estão guardados aqui: tente de novo em instantes.'); })
    .finally(function () { salvandoAt = false; $("#a-salvar").disabled = false; $("#a-salvar-outro").disabled = false; });
}
function limparAt(apagaSucesso, semFoco) {
  $("#a-pac").value = ''; cur = null; $("#a-oque").selectedIndex = 0; seg($("#a-oque-seg"), $("#a-oque").value); $("#a-obs").value = ''; $("#a-nfn").value = ''; $("#a-desc-val").value = ''; $("#a-desc-motivo").value = ''; $("#a-desc-sel").value = ''; $("#a-descbox").hidden = true; $("#a-mesma-semana").checked = false; $("#a-tornar").checked = false; $("#a-pagador-novo").hidden = true; $("#l-proc").hidden = true; decisaoPagador = null;
  $("#a-data").value = hojeStr(); $("#a-hora").value = agoraHora(); $("#a-datapag").value = hojeStr(); $("#a-erros").innerHTML = ''; $("#a-aba-nome").textContent = 'Grava na aba ' + AT.abaMes;
  if (apagaSucesso !== false) $("#a-sucesso").innerHTML = '';
  limparRascunhoAt(); ultimoPacRender = null; onPacAt(true); if (!semFoco) $("#a-pac").focus();
}
/* eventos */
$("#a-pac").addEventListener('change', function () { onPacAt(); });
$("#a-pac").addEventListener('input', function () { if (AT && AT.pacientes.some(function (p) { return p.nome === $("#a-pac").value; })) onPacAt(); atualizarPreview(); });
$("#a-prof").addEventListener('change', function () { fillTipos(); aplicarTipo(); cartaoPaciente(); });
$("#a-tipo").addEventListener('change', aplicarTipo);
$("#a-proc").addEventListener('change', function () { mostrarProc(); aplicarRegra(); });
$("#a-proc-alterar").addEventListener('click', function () { $("#l-proc").hidden = !$("#l-proc").hidden; });
$$("#a-pago-seg button").forEach(function (b) { b.addEventListener('click', function () { $("#a-pago").value = b.dataset.v; seg($("#a-pago-seg"), b.dataset.v); mostrarPagParcial(); $("#a-pago").classList.add('sr'); atualizarPreview(); salvarRascunhoAt(); }); });
$("#a-pago-mais").addEventListener('click', function () { $("#a-pago").classList.toggle('sr'); });
$("#a-pago").addEventListener('change', function () { seg($("#a-pago-seg"), this.value); mostrarPagParcial(); atualizarPreview(); });
$$("#a-nf-seg button").forEach(function (b) { b.addEventListener('click', function () { $("#a-nf").value = b.dataset.v; seg($("#a-nf-seg"), b.dataset.v); atualizarPreview(); salvarRascunhoAt(); }); });
$("#a-guia-chk").addEventListener('change', function () { $("#a-guia").value = this.checked ? 'Sim' : 'Não'; atualizarPreview(); });
$("#a-desc-sel").addEventListener('change', function () { $("#a-descbox").hidden = this.value !== 'sim'; if ($("#a-descbox").hidden) aplicarRegra(); else { calcDescAt(); $("#a-desc-val").focus(); } });
$("#a-desc-val").addEventListener('input', calcDescAt);
$("#a-cobrar-assim").addEventListener('click', function () { if (!cur) return; cur._cobrar = true; aplicarTipo(); toast('Cobrando mesmo assim: anote o motivo na Observação'); });
$("#a-quem").addEventListener('change', function () { decisaoPagador = null; $("#a-tornar").checked = false; var dif = pagadorDiferente(); $("#a-pagador-novo").hidden = !dif; if (dif) $("#a-pagador-nome").textContent = this.value.trim(); $("#a-quem-tag").hidden = dif || !cur; });
$("#a-tornar-sim").addEventListener('click', function () { decisaoPagador = true; $("#a-tornar").checked = true; $("#a-pagador-novo").hidden = true; toast('Vai virar o pagador habitual ao salvar'); });
$("#a-tornar-nao").addEventListener('click', function () { decisaoPagador = false; $("#a-tornar").checked = false; $("#a-pagador-novo").hidden = true; });
$("#a-data").addEventListener('input', function () { this.value = mascaraData(this.value); atualizarPreview(); });
$("#a-datapag").addEventListener('input', function () { this.value = mascaraData(this.value); });
// pago parcial (gestão, 07/10): recebe uma parte agora; a linha fica "Parcial" e o resto aparece como pendência até completar
function mostrarPagParcial() { var v = $("#a-pago").value; $("#l-datapag").hidden = !(v === 'Sim' || v === 'Parcial'); $("#l-recebido").hidden = v !== 'Parcial'; }
$("#a-recebido").addEventListener('input', atualizarPreview);
// a sessão vai pra aba do mês da data (lançar sessão de setembro que faltou: é só pôr a data de setembro)
$("#a-data").addEventListener('input', function () { var d = dataObj(this.value); if (d && AT) $("#a-aba-nome").textContent = 'Grava na aba ' + MESES_PT[d.getMonth()]; });
$("#a-hora").addEventListener('input', function () { this.value = mascaraHora(this.value); atualizarPreview(); });
$("#f-atend").addEventListener('submit', function (e) { e.preventDefault(); salvarAt(true); });
$("#a-salvar").addEventListener('click', function () { salvarAt(true); });
$("#a-salvar-outro").addEventListener('click', function () { salvarAt(false); });
$("#a-novo").addEventListener('click', function () { go('pacientes', { novo: true, voltar: 'registrar', nome: pacInfo($("#a-pac").value.trim()) ? '' : $("#a-pac").value.trim() }); });
$("#a-editcad").addEventListener('click', function () { if (!cur) return; go('pacientes', { editar: cur.nome, voltar: 'registrar' }); });
$("#a-hist").addEventListener('click', function () { if (!cur) return; go('pacotes', { buscar: cur.nome }); });
$("#a-mesma-semana").addEventListener('change', function () { aplicarRegra(); });
["a-valor", "a-forma", "a-nfn", "a-obs", "a-quem"].forEach(function (id) { $("#" + id).addEventListener('input', atualizarPreview); });
CAMPOS_AT.forEach(function (id) { $("#" + id).addEventListener('input', salvarRascunhoAt); $("#" + id).addEventListener('change', salvarRascunhoAt); });

/* ---------- pagamento antecipado: lança as N sessões pagas de uma vez (gestão, 07/10) ---------- */
function linhasAnt() { return $("#a-ant-datas").value.split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) { var m = l.match(/^(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{1,2}:\d{2}))?/); return m ? { data: m[1], hora: m[2] || '' } : { data: l, hora: '', ruim: true }; }); }
function totalAnt() { var l = linhasAnt(), v = num($("#a-ant-valor").value) || 0; $("#a-ant-total").innerHTML = l.length + ' sessão(ões) × R$ ' + brl(v) + ' = <b>R$ ' + brl(l.length * v) + '</b> recebidos em ' + esc($("#a-ant-datapag").value || '—'); }
function buscarDatasAnt() {
  if (!cur) return; var prof = $("#a-prof").value; if (!prof) return toast('Escolha o profissional primeiro');
  var b = $("#a-ant-buscar"); b.disabled = true;
  call('proximasSessoes', { paciente: cur.nome, profissional: prof, de: $("#a-data").value, n: parseInt($("#a-ant-n").value, 10) || 4 }).then(function (r) {
    b.disabled = false; var l = (r.sessoes || []).map(function (x) { return x.data + (x.hora ? ' ' + x.hora : ''); });
    $("#a-ant-datas").value = l.join('\n'); totalAnt();
    if (!l.length) toast('Não achei horários na agenda: escreva as datas à mão'); else if (l.length < (parseInt($("#a-ant-n").value, 10) || 4)) toast('A agenda só tem ' + l.length + ' data(s): complete à mão');
  }).catch(function (e) { b.disabled = false; toast('Erro: ' + e.message); });
}
function abrirAntecipado() {
  if (!cur) return;
  $("#a-ant-valor").value = valorComb(cur) != null ? brl(valorComb(cur)) : ''; $("#a-ant-datapag").value = hojeStr(); $("#a-ant-quem").value = cur.pagador || cur.nome; $("#a-ant-nfn").value = ''; $("#a-ant-datas").value = '';
  $("#a-antbox").hidden = false; $("#a-antbox").scrollIntoView({ behavior: 'smooth', block: 'center' }); totalAnt(); buscarDatasAnt();
}
$("#a-ant-cancel").addEventListener('click', function () { $("#a-antbox").hidden = true; });
$("#a-ant-buscar").addEventListener('click', buscarDatasAnt);
["a-ant-datas", "a-ant-valor", "a-ant-datapag"].forEach(function (id) { $("#" + id).addEventListener('input', totalAnt); });
$("#a-ant-datapag").addEventListener('input', function () { this.value = mascaraData(this.value); });
$("#a-ant-salvar").addEventListener('click', function () {
  if (!cur) return;
  var l = linhasAnt(), e = [], prof = $("#a-prof").value;
  if (!prof) e.push('Escolha o profissional.');
  if (!$("#a-proc").value) e.push('Escolha o tipo de atendimento.');
  if (!l.length) e.push('Informe as datas das sessões (uma por linha).');
  l.forEach(function (x) { if (x.ruim || !dataObj(x.data)) e.push('Data inválida: ' + x.data); });
  if (!(num($("#a-ant-valor").value) > 0)) e.push('Informe o valor por sessão.');
  if (!dataValida($("#a-ant-datapag").value)) e.push('Data do pagamento inválida.');
  if (!$("#a-ant-forma").value) e.push('Escolha a forma de pagamento.');
  if (e.length) { $("#a-erros").innerHTML = erroBox(e); $("#a-erros").scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  var b = this; b.disabled = true; $("#a-erros").innerHTML = '';
  call('lancarAntecipado', { paciente: cur.nome, profissional: prof, procedimento: $("#a-proc").value, valorSessao: $("#a-ant-valor").value, dataPagamento: $("#a-ant-datapag").value, forma: $("#a-ant-forma").value,
    quemPagou: $("#a-ant-quem").value.trim(), nf: $("#a-ant-nf").value, nfNumero: $("#a-ant-nfn").value.trim(), sessoes: l.map(function (x) { return { data: x.data, hora: x.hora, profissional: prof }; }) }).then(function (r) {
    b.disabled = false;
    if (!r.ok) { $("#a-erros").innerHTML = erroBox(r.erros || [], 'Não gravou'); $("#a-erros").scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    $("#a-antbox").hidden = true; if (typeof invalidarResumo === 'function') invalidarResumo();
    $("#a-sucesso").innerHTML = aviso('verde', 'Lançado! ' + r.lancadas.length + ' sessões pagas de ' + esc(cur.nome), 'R$ ' + brl(r.total) + ' · ' + r.lancadas.map(function (x) { return x.data; }).join(', ') + '. Nessas datas a sessão já aparece registrada na Agenda.');
    $("#a-sucesso").hidden = false; $("#a-sucesso").scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('Sessões pagas lançadas');
  }).catch(function (er) { b.disabled = false; toast('Erro: ' + er.message); });
});
