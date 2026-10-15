/* ================= REGISTRAR ATENDIMENTO (Fase 1, 15/10) =================
   Quem → bloco "O que fazer agora" (calculado pela linha de Cobrança por profissional do paciente × profissional escolhido)
   → O que aconteceu (+ Detalhe quando não é Atendido) → Recebeu? Sim · Não · Parcial (só quando o bloco pede) → Guia → Observação.
   A recepção nunca escolhe o "Pago?": o app grava pelo bloco. */
var cur = null, BL = null, atIniciado = false, atPrefill = null, decisaoPagador = null, salvandoAt = false, ultimoPacRender = null, recebeuEscolhido = null;
var CAMPOS_AT = ["a-pac", "a-prof", "a-data", "a-hora", "a-tipo", "a-oque", "a-valor", "a-forma", "a-recebido", "a-datapag", "a-quem", "a-nfn", "a-obs", "a-detalhe"];
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
    preencherSelect($("#a-forma"), BOOT.listas.formas || []);
    var segO = $("#a-oque-seg"); segO.innerHTML = '';
    (BOOT.listas.oque || []).forEach(function (o) { var b = el('<button type="button" data-v="' + esc(o) + '" aria-pressed="false">' + esc(OQUE_CURTO(o)) + '</button>'); b.addEventListener('click', function () { $("#a-oque").value = o; seg(segO, o); aplicarBloco(); salvarRascunhoAt(); }); segO.appendChild(b); });
    $("#a-data").value = hojeStr(); $("#a-hora").value = agoraHora(); $("#a-datapag").value = hojeStr();
    comboPacientes($("#a-pac"), function () { onPacAt(true); });
    $("#a-carregando").hidden = true; ["a-passo1", "a-passo-obs", "a-lateral", "a-rodape"].forEach(function (id) { $("#" + id).hidden = false; });
    if (!atPrefill && lerRascunhoAt()) toast('Rascunho recuperado');
    onPacAt(true);
  }
  if (atPrefill) {
    var p = atPrefill; atPrefill = null;
    limparAt(true, true);
    $("#a-pac").value = p.paciente; if (p.profissional) $("#a-prof").value = p.profissional; if (p.data) $("#a-data").value = p.data; if (p.hora) $("#a-hora").value = p.hora;
    onPacAt(true);
    if (p.tipo) { var t = $("#a-tipo"), alvo = Array.prototype.slice.call(t.options).filter(function (o) { return semAcento(o.value).indexOf(semAcento(p.tipo).split(' ')[0]) === 0; })[0]; if (alvo) { t.value = alvo.value; aplicarTipo(); } }
  }
}
// rascunho: guardado a cada tecla; descartado depois de rascunho_horas (parâmetro, 2 h)
function salvarRascunhoAt() { try { var o = {}; CAMPOS_AT.forEach(function (id) { o[id] = $("#" + id).value; }); o._hora = agoraHora(); o._t = Date.now(); localStorage.setItem('rn-atend', JSON.stringify(o)); $("#a-rascunho").hidden = !o['a-pac']; $("#a-rascunho").textContent = 'rascunho guardado ' + o._hora; } catch (e) { } }
function lerRascunhoAt() { try { var o = JSON.parse(localStorage.getItem('rn-atend') || 'null'); if (!o || !o['a-pac']) return false; var h = (BOOT.params && BOOT.params.rascunho_horas) || 2; if (o._t && Date.now() - o._t > h * 3600 * 1000) { limparRascunhoAt(); return false; } ["a-pac", "a-prof", "a-obs", "a-nfn", "a-quem", "a-detalhe"].forEach(function (id) { if (o[id]) $("#" + id).value = o[id]; }); $("#a-rascunho").hidden = false; $("#a-rascunho").textContent = 'rascunho guardado ' + (o._hora || ''); return true; } catch (e) { return false; } }
function limparRascunhoAt() { try { localStorage.removeItem('rn-atend'); } catch (e) { } $("#a-rascunho").hidden = true; }

function fillTipos() {
  var esps = espsDoProf($("#a-prof").value), tipos = tiposDe(esps), t = $("#a-tipo"), atual = t.value; t.innerHTML = '';
  tipos.forEach(function (p) { var o = document.createElement('option'); o.value = p.nome; o.textContent = p.nome; t.appendChild(o); });
  if (atual && tipos.some(function (p) { return p.nome === atual; })) t.value = atual;
  else { var pad = tipos.filter(function (p) { return /^(Sessão|Consulta)/.test(p.nome); })[0]; if (pad) t.value = pad.nome; }
  var sel = $("#a-proc"); sel.innerHTML = ''; procsDe(esps).forEach(function (p) { var o = document.createElement('option'); o.value = p.nome; o.textContent = p.nome + (p.valor == null ? ' (valor à mão)' : ' · R$ ' + brl(p.valor)); sel.appendChild(o); });
}
function aplicarTipo() { var base = $("#a-tipo").value; if (!base) { $("#a-proc-hint").textContent = ''; aplicarBloco(); return; } var nome = derivarProc(base, cur, $("#a-prof").value); $("#a-proc").value = nome; if ($("#a-proc").value !== nome) { var o = document.createElement('option'); o.value = nome; o.textContent = nome; $("#a-proc").appendChild(o); $("#a-proc").value = nome; } $("#a-proc-hint").innerHTML = (nome !== base ? 'grava "' + esc(nome) + '" · ' : '') + '<button type="button" class="btn link" id="a-proc-alterar" style="padding:0;min-height:0;font-size:12px">outro procedimento</button>'; $("#a-proc-alterar").addEventListener('click', function () { $("#l-proc").hidden = !$("#l-proc").hidden; }); aplicarBloco(); }

function onPacAt(force) {
  var nome = $("#a-pac").value.trim();
  if (force !== true && nome === ultimoPacRender) return;
  ultimoPacRender = nome;
  cur = pacInfo(nome);
  $("#a-pagador-novo").hidden = true; decisaoPagador = null; $("#a-tornar").checked = false; recebeuEscolhido = null;
  $("#a-guia").value = 'Não'; $("#a-guia-chk").checked = false; $("#a-nf-chk").checked = false; $("#a-nf").value = 'Não';
  fillTipos();
  cartaoPaciente();
  if (!cur) { $("#a-pac-hint").textContent = nome ? 'Não está em Pacientes. Cadastre em "+ Novo paciente".' : 'Só quem está em Pacientes.'; aplicarTipo(); return; }
  $("#a-pac-hint").textContent = '';
  $("#a-quem").value = cur.pagador || cur.nome;
  aplicarTipo();
}
function cartaoPaciente() {
  var p = cur;
  $("#a-pc-ini").textContent = p ? p.nome.charAt(0).toUpperCase() : '?';
  $("#a-pc-nome").textContent = p ? p.nome : 'Escolha o paciente';
  $("#a-pc-nasc").textContent = p && p.nasc ? (idade(p.nasc) ? idade(p.nasc) + ' · ' : '') + 'nasc. ' + p.nasc : '';
  $("#a-pc-conv").textContent = p ? (p.convenio || 'Particular') : '—';
  $("#a-pc-pag").textContent = p ? (p.pagador || p.nome) : '—';
  $("#a-pc-linhas").innerHTML = p ? (linhasDe(p.nome).map(function (l) { return '<div>' + esc(Cobranca.resumoLinha(l)) + '</div>'; }).join('') || '<div class="muted">sem cobrança cadastrada · cobra pela tabela</div>') : '';
  $("#a-editcad").hidden = !p; $("#a-hist").hidden = !p;
}
// o bloco: tudo o que a recepção precisa saber antes de qualquer campo de dinheiro
function aplicarBloco() {
  var box = $("#a-bloco"), p2 = $("#a-passo2"), p3 = $("#a-passo3"), pg = $("#a-passo-guia"), ac = $("#a-bloco-acoes");
  if (!cur) { BL = null; box.innerHTML = ''; p2.hidden = true; p3.hidden = true; pg.hidden = true; ac.hidden = true; $("#l-detalhe").hidden = true; atualizarPreview(); return; }
  var dt = dataObj($("#a-data").value) || new Date(), prof = $("#a-prof").value;
  BL = prof ? blocoDe(cur.nome, prof, dt, $("#a-proc").value, $("#a-oque").value) : null;
  if (!BL) { box.innerHTML = '<div class="faixa cinza">Escolha o profissional pra ver o que cobrar.</div>'; p2.hidden = false; p3.hidden = true; pg.hidden = true; ac.hidden = true; $("#l-detalhe").hidden = true; atualizarPreview(); return; }
  box.innerHTML = blocoHtml(BL);
  var temAtalho = BL.botaoPagarMes || BL.situacao === 'sem-linha'; ac.hidden = !temAtalho; $("#a-btn-pagmes").hidden = !BL.botaoPagarMes; $("#a-btn-cad").hidden = BL.situacao !== 'sem-linha';
  $("#a-pagmes").hidden = true;
  p2.hidden = false;
  var det = $("#l-detalhe"); det.hidden = !BL.detalhe; $("#a-detalhe-leg").textContent = BL.detalheObrigatorio ? '— obrigatório: o que o paciente ou o responsável disse, a que horas avisou, como avisou' : '— opcional: o que o paciente ou o responsável disse, a que horas avisou, como avisou';
  // Recebeu? só quando o bloco pede; o padrão vem do bloco (na hora = Sim; fim do mês = Não)
  p3.hidden = !BL.recebeu; pg.hidden = !BL.guia;
  if (BL.recebeu) {
    $$('#a-recebeu-seg button').forEach(function (b) { b.hidden = b.dataset.v === 'Parcial' && BL.recebeu !== 'sim-nao-parcial'; });
    if (recebeuEscolhido == null) recebeuEscolhido = BL.padraoRecebeu;
    seg($("#a-recebeu-seg"), recebeuEscolhido);
    $("#a-recebeu-leg").textContent = BL.situacao === 'fim-do-mes' ? 'padrão: Não (paga no fim do mês)' : BL.situacao === 'sem-linha' ? 'cobrar pela tabela e avisar a gestão' : '';
    var v = $("#a-valor"); if (!v.dataset.mexido) v.value = BL.valor != null ? brl(BL.valor) : ''; $("#a-valor-hint").textContent = BL.situacao === 'sem-linha' ? 'valor cheio da tabela (editável)' : 'valor da linha de cobrança (editável)';
    mostrarRecebeu();
  }
  atualizarPreview();
}
function mostrarRecebeu() { var r = recebeuEscolhido; $("#a-pagbox").hidden = !(r === 'Sim' || r === 'Parcial'); $("#a-nao-txt").hidden = r !== 'Não'; $("#l-recebido").hidden = r !== 'Parcial'; }
function resumoCobranca() {
  if (!cur || !BL) return '—';
  var oque = $("#a-oque").value;
  if (!/^Atendido/.test(oque)) return 'sem cobrança (' + OQUE_CURTO(oque).toLowerCase() + ') · a gestão decide';
  var pago = Cobranca.pagoK(BL, recebeuEscolhido), v = $("#a-valor").value, forma = $("#a-forma").value;
  if (!BL.recebeu) return BL.frase + ' · Pago? = ' + pago + (BL.guia ? ' · guia ' + ($("#a-guia").value === 'Sim' ? 'assinada' : 'não assinada') : '');
  if (pago === 'Sim') return 'pago · R$ ' + (v || '…') + ' · ' + (forma || 'forma?') + ($("#a-nf").value === 'Sim' ? ' · NF ' + ($("#a-nfn").value || 'emitida') : ' · NF depois');
  if (pago === 'Parcial') { var rc = num($("#a-recebido").value) || 0, vt = num(v) || 0; return 'pago em parte · R$ ' + brl(rc) + ' de R$ ' + (v || '…') + ' · ' + forma + ' · em aberto R$ ' + brl(Math.max(0, vt - rc)); }
  return 'não pago · R$ ' + (v || '…') + ' em aberto' + (BL.situacao === 'fim-do-mes' ? ' (fim do mês)' : '');
}
function atualizarPreview() {
  var d = $("#a-data").value, h = $("#a-hora").value;
  $("#a-preview").innerHTML = '<div><span class="muted">Aba</span> ' + esc(dataObj(d) ? MESES_PT[dataObj(d).getMonth()] : (AT ? AT.abaMes : '')) + ' · linha nova</div>' +
    '<div><span class="muted">Paciente</span> ' + esc($("#a-pac").value || '—') + '</div>' +
    '<div><span class="muted">Profissional</span> ' + esc($("#a-prof").value || '—') + ' · ' + esc(d.slice(0, 5)) + (h ? ' ' + esc(h) : '') + '</div>' +
    '<div><span class="muted">Aconteceu</span> ' + esc(OQUE_CURTO($("#a-oque").value)) + '</div>' +
    '<div><span class="muted">Procedimento</span> ' + esc($("#a-proc").value || '—') + '</div>' +
    '<div><span class="muted">Cobrança</span> ' + esc(resumoCobranca()) + '</div>' +
    '<div><span class="muted">Por</span> ' + esc(quemSou()) + ' · ' + agoraHora() + '</div>';
}
function dadosAt() {
  var pergunta = !!(BL && BL.recebeu), r = pergunta ? recebeuEscolhido : null, pagou = r === 'Sim' || r === 'Parcial';
  return { paciente: $("#a-pac").value.trim(), profissional: $("#a-prof").value, data: $("#a-data").value, hora: $("#a-hora").value, procedimento: $("#a-proc").value,
    oque: $("#a-oque").value, recebeu: r || '', valor: pergunta ? $("#a-valor").value : '', valorRecebido: r === 'Parcial' ? $("#a-recebido").value : '', forma: pagou ? $("#a-forma").value : '', dataPagamento: $("#a-datapag").value,
    quemPagou: pagou ? $("#a-quem").value.trim() : '', nf: pagou ? $("#a-nf").value : '', nfNumero: pagou ? $("#a-nfn").value.trim() : '', guia: BL && BL.guia ? $("#a-guia").value : '', observacao: $("#a-obs").value.trim(), detalhe: $("#a-detalhe").value.trim(),
    tornarPagadorHabitual: $("#a-tornar").checked };
}
function pagadorDiferente() { var q = $("#a-quem").value.trim(); return !!(cur && BL && BL.recebeu && (recebeuEscolhido === 'Sim' || recebeuEscolhido === 'Parcial') && q && q !== (cur.pagador || cur.nome)); }
function validarAt() {
  var e = [];
  if (!cur) e.push('Escolha um paciente da lista (só quem está em Pacientes).');
  if (!$("#a-prof").value) e.push('Escolha o profissional.');
  if (!$("#a-proc").value) e.push('Escolha o tipo de atendimento.');
  if (!dataValida($("#a-data").value)) e.push('Data inválida.');
  if ($("#a-hora").value && !/^\d{1,2}:\d{2}$/.test($("#a-hora").value)) e.push('Hora inválida (hh:mm).');
  if (BL && BL.detalheObrigatorio && !$("#a-detalhe").value.trim()) e.push('Escreva no Detalhe o que aconteceu: é obrigatório em falta sem aviso e em cima da hora.');
  if (BL && BL.recebeu) {
    if (!recebeuEscolhido) e.push('Responda: recebeu?');
    if (recebeuEscolhido === 'Sim' && !(num($("#a-valor").value) > 0)) e.push('Recebeu = Sim exige um valor maior que zero.');
    if ((recebeuEscolhido === 'Sim' || recebeuEscolhido === 'Parcial') && !$("#a-forma").value) e.push('Escolha a forma de pagamento.');
    if (recebeuEscolhido === 'Parcial') { var vt = num($("#a-valor").value), rc = num($("#a-recebido").value); if (!(vt > 0)) e.push('Pago parcial: falta o valor da sessão.'); else if (!(rc > 0 && rc < vt)) e.push('Pago parcial: o recebido agora tem de ser maior que zero e menor que R$ ' + brl(vt) + '.'); }
  }
  return e;
}
var confirmouRepetido = false; // "É outro atendimento: gravar mesmo assim" depois do aviso de já registrado
function salvarAt(voltar) {
  if (salvandoAt) return;
  var erros = validarAt(); $("#a-erros").innerHTML = erroBox(erros);
  if (erros.length) { $("#a-erros").scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  if (pagadorDiferente() && decisaoPagador === null) { $("#a-pagador-nome").textContent = $("#a-quem").value.trim(); $("#a-pagador-novo").hidden = false; $("#a-pagador-novo").scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('Pagou outra pessoa: decida se vira o pagador habitual'); return; }
  salvandoAt = true; $("#a-salvar").disabled = true; $("#a-salvar-outro").disabled = true;
  var d = dadosAt(); if (confirmouRepetido) { d.confirmouRepetido = true; confirmouRepetido = false; }
  call('registrarAtendimento', d).then(function (r) {
    if (!r.ok) {
      $("#a-erros").innerHTML = erroBox(r.erros || [], r.repetido ? 'Já registrado' : 'Não gravou');
      if (r.repetido) { var b = el('<div class="acoes"><button type="button" class="btn sec">É outro atendimento: gravar mesmo assim</button></div>'); $("#a-erros").appendChild(b); b.querySelector('button').addEventListener('click', function () { confirmouRepetido = true; salvarAt(voltar); }); }
      return;
    }
    if (d.tornarPagadorHabitual && cur) { cur.pagador = d.quemPagou; }
    if (typeof invalidarResumo === 'function') invalidarResumo();
    recarregarAT().catch(function () { }); // competências e cobranças atualizadas pro próximo registro
    var msg = d.paciente + ' · ' + OQUE_CURTO(d.oque) + ' · gravado na aba ' + r.aba + ', linha ' + r.linha;
    limparAt(false);
    if (voltar) { go('hoje'); toast('Atendimento gravado: ' + d.paciente); }
    else {
      var dataReg = d.data, ehHoje = dataReg === hojeStr();
      $("#a-sucesso").innerHTML = aviso('verde', 'Registrado! ' + esc(msg), esc(d.procedimento) + (r.valor ? ' · R$ ' + esc(brl(r.valor)) : '') + ' · Pago? ' + esc(r.pago || '(vazio)') + (r.pendenteDecisao ? ' · entra em "Faltas → Decidir" pra gestão' : '') + '. <a href="#" id="a-ver-lista">' + (ehHoje ? 'ver na lista de hoje' : 'ver na lista de ' + esc(dataReg.slice(0, 5))) + '</a>');
      $("#a-ver-lista").addEventListener('click', function (e) { e.preventDefault(); var dt = dataObj(dataReg); if (dt) $("#d-data").value = dataParaISO(dt); go('hoje'); });
      toast('Registrado!'); $("#a-pac").focus();
    }
  }).catch(function (e) { banner('Não consegui gravar na planilha (' + e.message + '). Seus dados estão guardados aqui: tente de novo em instantes.'); })
    .finally(function () { salvandoAt = false; $("#a-salvar").disabled = false; $("#a-salvar-outro").disabled = false; });
}
function limparAt(apagaSucesso, semFoco) {
  $("#a-pac").value = ''; cur = null; BL = null; recebeuEscolhido = null; $("#a-oque").selectedIndex = 0; seg($("#a-oque-seg"), $("#a-oque").value); $("#a-obs").value = ''; $("#a-detalhe").value = ''; $("#a-nfn").value = ''; $("#a-recebido").value = ''; $("#a-valor").value = ''; delete $("#a-valor").dataset.mexido; $("#a-tornar").checked = false; $("#a-pagador-novo").hidden = true; $("#l-proc").hidden = true; decisaoPagador = null;
  $("#a-data").value = hojeStr(); $("#a-hora").value = agoraHora(); $("#a-datapag").value = hojeStr(); $("#a-erros").innerHTML = ''; $("#a-aba-nome").textContent = 'Grava na aba ' + AT.abaMes;
  if (apagaSucesso !== false) $("#a-sucesso").innerHTML = '';
  limparRascunhoAt(); ultimoPacRender = null; onPacAt(true); if (!semFoco) $("#a-pac").focus();
}
/* eventos */
$("#a-pac").addEventListener('change', function () { onPacAt(); });
$("#a-prof").addEventListener('change', function () { fillTipos(); recebeuEscolhido = null; delete $("#a-valor").dataset.mexido; aplicarTipo(); cartaoPaciente(); });
$("#a-tipo").addEventListener('change', function () { delete $("#a-valor").dataset.mexido; aplicarTipo(); });
$("#a-proc").addEventListener('change', function () { delete $("#a-valor").dataset.mexido; aplicarBloco(); });
$$("#a-recebeu-seg button").forEach(function (b) { b.addEventListener('click', function () { recebeuEscolhido = b.dataset.v; seg($("#a-recebeu-seg"), recebeuEscolhido); mostrarRecebeu(); atualizarPreview(); salvarRascunhoAt(); }); });
$("#a-nf-chk").addEventListener('change', function () { $("#a-nf").value = this.checked ? 'Sim' : 'Não'; if (this.checked) $("#a-nfn").focus(); atualizarPreview(); });
$("#a-nfn").addEventListener('input', function () { if (this.value.trim()) { $("#a-nf-chk").checked = true; $("#a-nf").value = 'Sim'; } atualizarPreview(); });
$("#a-guia-chk").addEventListener('change', function () { $("#a-guia").value = this.checked ? 'Sim' : 'Não'; atualizarPreview(); });
$("#a-valor").addEventListener('input', function () { this.dataset.mexido = '1'; atualizarPreview(); });
$("#a-quem").addEventListener('change', function () { decisaoPagador = null; $("#a-tornar").checked = false; var dif = pagadorDiferente(); $("#a-pagador-novo").hidden = !dif; if (dif) $("#a-pagador-nome").textContent = this.value.trim(); $("#a-quem-tag").hidden = dif || !cur; });
$("#a-tornar-sim").addEventListener('click', function () { decisaoPagador = true; $("#a-tornar").checked = true; $("#a-pagador-novo").hidden = true; toast('Vai virar o pagador habitual ao salvar'); });
$("#a-tornar-nao").addEventListener('click', function () { decisaoPagador = false; $("#a-tornar").checked = false; $("#a-pagador-novo").hidden = true; });
$("#a-data").addEventListener('input', function () { this.value = mascaraData(this.value); var d = dataObj(this.value); if (d && AT) $("#a-aba-nome").textContent = 'Grava na aba ' + MESES_PT[d.getMonth()]; if (d) aplicarBloco(); else atualizarPreview(); });
$("#a-datapag").addEventListener('input', function () { this.value = mascaraData(this.value); });
$("#a-hora").addEventListener('input', function () { this.value = mascaraHora(this.value); atualizarPreview(); });
$("#a-recebido").addEventListener('input', atualizarPreview);
$("#a-btn-pagmes").addEventListener('click', function () { if (!cur || !BL || !BL.linha) return; abrirPagamentoMes($("#a-pagmes"), { paciente: cur.nome, profissional: $("#a-prof").value, cobranca: BL.linha.cobranca, pagamento: BL.linha.pagamento, valor: BL.linha.cobranca === 'Mensalidade fixa' ? BL.linha.valorMensal : BL.linha.valorSessao, valorMes: BL.valorMes, chave: BL.competencia, pagador: cur.pagador }, function () { recarregarAT().then(function () { onPacAt(true); }); }); });
$("#a-btn-cad").addEventListener('click', function () { if (cur) go('pacientes', { editar: cur.nome, voltar: 'registrar' }); });
$("#f-atend").addEventListener('submit', function (e) { e.preventDefault(); salvarAt(true); });
$("#a-salvar").addEventListener('click', function () { salvarAt(true); });
$("#a-salvar-outro").addEventListener('click', function () { salvarAt(false); });
$("#a-novo").addEventListener('click', function () { go('pacientes', { novo: true, voltar: 'registrar', nome: pacInfo($("#a-pac").value.trim()) ? '' : $("#a-pac").value.trim() }); });
$("#a-editcad").addEventListener('click', function () { if (!cur) return; go('pacientes', { editar: cur.nome, voltar: 'registrar' }); });
$("#a-hist").addEventListener('click', function () { if (!cur) return; go('cobranca', { buscar: cur.nome }); });
["a-forma", "a-nfn", "a-obs", "a-quem", "a-detalhe"].forEach(function (id) { $("#" + id).addEventListener('input', atualizarPreview); });
CAMPOS_AT.forEach(function (id) { $("#" + id).addEventListener('input', salvarRascunhoAt); $("#" + id).addEventListener('change', salvarRascunhoAt); });
