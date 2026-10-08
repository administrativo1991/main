/* ================= REGISTRAR ATENDIMENTO ================= */
var cur = null, baseValor = null, atIniciado = false, ultimoPacRender = null, atPrefill = null, decisaoPagador = null, salvandoAt = false;
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
    preencherSelect($("#a-pk-forma"), BOOT.listas.formas || []);
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
  var box = $("#a-avisos"); box.innerHTML = ''; $("#a-pacotebox").hidden = true; $("#a-extrabox").hidden = true; $("#a-antbox").hidden = true; $("#a-pagador-novo").hidden = true; decisaoPagador = null; $("#a-tornar").checked = false;
  if (cur) { cur._extra = false; cur._avulsa = false; cur._cobrar = false; }
  $("#a-guia").value = 'Não'; $("#a-guia-chk").checked = false; // guia começa como não assinada: a recepção marca quando conferir
  fillTipos();
  cartaoPaciente();
  if (!cur) { $("#a-pac-hint").textContent = nome ? 'Não está em Pacientes. Cadastre antes em "+ Novo paciente".' : 'Só quem está em Pacientes.'; aplicarTipo(); return; }
  $("#a-pac-hint").textContent = '';
  if (regraRelevante(cur) || (cur.obsCobranca && !ehMensal(cur))) {
    box.innerHTML += aviso('laranja', 'Atenção na cobrança' + (cur.regra ? ' · ' + esc(cur.regra) : ''), esc(cur.obsCobranca || 'Siga a regra acima. Se o paciente disser algo diferente, anote na Observação e avise a gestão.') + (cur.valorCombinado ? '<div class="muted">Cadastro: ' + esc(cur.valorCombinado) + '</div>' : ''));
  }
  if (cadastroIncompleto(cur)) {
    box.innerHTML += aviso('laranja', 'Cadastro incompleto · sem modalidade nem convênio', 'Pergunte como este paciente paga (consulta individual pela tabela, convênio, plano, mensalidade…). Por enquanto o app cobra pela tabela.', '<button class="btn sec" type="button" id="a-btn-cad">Completar cadastro</button>');
  }
  if (ehMensal(cur)) {
    var s = situacaoMensal(cur);
    if (s[0] === 'vermelha') box.innerHTML += aviso('vermelha', s[2], 'Não atender — chamar a gestão. Sessões já feitas no mês ficam devidas.', '<button class="btn vermelho" type="button" id="a-btn-mens">Registrar pagamento da mensalidade</button>');
    else if (s[0] === 'verde') box.innerHTML += aviso('verde', '', '<strong>Mensalista em dia</strong> · ' + esc(s[2].replace(/^Mensalista em dia · /, '')) + ' Pago? fica como “Plano já pago”.' + (cur.obsCobranca ? '<div class="muted">' + esc(cur.obsCobranca) + '</div>' : ''));
    else box.innerHTML += aviso(s[0] === 'amarela' ? 'amarela' : 'cinza', s[1].charAt(0).toUpperCase() + s[1].slice(1), esc(s[2]) + ' Pago? fica como “Plano já pago”.', s[0] === 'amarela' ? '<button class="btn ter roxo" type="button" id="a-btn-mens">Registrar pagamento da mensalidade</button>' : '');
  }
  if (ehPacote(cur)) {
    var pk = AT.pacotes[cur.nome], r = pk ? pk.n - pk.usadas : 0, vencido = pk && pk.validade && venceu(pk.validade);
    if (pk && pk.status === 'ativo' && r > 0 && !vencido) box.innerHTML += aviso(planoAPagar(pk) ? 'amarela' : 'verde', 'Plano de ' + pk.n + ' consultas · ' + pk.usadas + ' de ' + pk.n + ' usadas · esta é a ' + (pk.usadas + 1) + 'ª' + (planoAPagar(pk) ? ' · ainda não pago' : ''), 'Comprado em ' + esc(pk.compra) + ', válido até ' + esc(pk.validade) + '. ' + (r === 1 ? '<b>Última consulta do plano:</b> avise que o próximo é pago na chegada.' : 'Faltam ' + r + ' depois desta.') + ' Pago? fica como “Plano já pago”.' + (planoAPagar(pk) ? ' <b>O plano está a receber' + (pk.valor ? ' (R$ ' + brl(pk.valor) + ')' : '') + ':</b> quando pagar, registre em Pendências ou na Agenda → Receber.' : ''));
    else {
      var pim = pacoteInfoMod(cur.modalidade, cur, $("#a-prof").value);
      box.innerHTML += aviso('laranja', (pk ? (vencido && r > 0 ? 'Plano vencido em ' + esc(pk.validade) + ' · ' + r + ' consulta(s) não usada(s)' : 'Plano encerrado · ' + pk.usadas + ' de ' + pk.n + ' usadas') : 'Sem plano ativo'), 'Esta consulta não está paga. Lançar o plano e receber agora?', '<div class="acoes" style="flex-basis:100%"><button class="btn" type="button" id="a-btn-pacote">Lançar plano de ' + pim.n + ' consultas' + (pim.valor ? ' (R$ ' + brl(pim.valor) + ')' : '') + ' e receber</button><button class="btn ter" type="button" id="a-btn-avulsa">Cobrar consulta individual</button><button class="btn ter" type="button" id="a-btn-extra">Liberar sessão extra</button></div>');
    }
  }
  if (ehPosterior(cur) || ehAntecipado(cur)) {
    var vs = valorSessaoCad(cur), vsTxt = vs != null ? 'R$ ' + brl(vs) + ' por sessão' : 'valor por sessão não está no cadastro (Valor combinado, ex.: "R$ 70 por sessão"): o app usa a tabela';
    if (ehPosterior(cur)) box.innerHTML += aviso('cinza', 'Pagamento posterior · ' + esc(vsTxt), 'A sessão fica lançada com Pago? = Não. No fim do mês o total aparece em Pendências e é recebido por lá.');
    else box.innerHTML += aviso('cinza', 'Pagamento antecipado · ' + esc(vsTxt), 'Quando a pessoa pagar adiantado, lance as sessões já pagas de uma vez, nas datas da agenda.', '<div class="acoes" style="flex-basis:100%"><button class="btn sec" type="button" id="a-btn-ant">Recebeu adiantado: lançar sessões pagas</button></div>');
  }
  var bant = $("#a-btn-ant"); if (bant) bant.addEventListener('click', abrirAntecipado);
  var bc = $("#a-btn-cad"); if (bc) bc.addEventListener('click', function () { go('pacientes', { editar: cur.nome, voltar: 'registrar' }); });
  var bm = $("#a-btn-mens"); if (bm) bm.addEventListener('click', function () { go('mensalistas', { buscar: cur.nome }); });
  var bp = $("#a-btn-pacote"); if (bp) bp.addEventListener('click', function () { var pim = pacoteInfoMod(cur.modalidade, cur, $("#a-prof").value); $("#a-pk-titulo").textContent = 'Lançar plano de ' + pim.n + ' consultas'; $("#a-pk-n").value = pim.n; $("#a-pk-valor").value = brl(pim.valor || ''); $("#a-pk-quem").value = cur.pagador || cur.nome; $("#a-pacotebox").hidden = false; $("#a-pacotebox").scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  var ba = $("#a-btn-avulsa"); if (ba) ba.addEventListener('click', function () { cur._avulsa = true; aplicarTipo(); toast('Cobrando como consulta individual'); });
  var be = $("#a-btn-extra"); if (be) be.addEventListener('click', function () { $("#a-extrabox").hidden = false; $("#a-extrabox").scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  $("#a-quem").value = cur.pagador || cur.nome;
  aplicarTipo();
}
function cartaoPaciente() {
  var p = cur;
  $("#a-pc-ini").textContent = p ? p.nome.charAt(0).toUpperCase() : '?';
  $("#a-pc-nome").textContent = p ? p.nome : 'Escolha o paciente';
  $("#a-pc-nasc").textContent = p && p.nasc ? (idade(p.nasc) ? idade(p.nasc) + ' · ' : '') + 'nasc. ' + p.nasc : '';
  $("#a-pc-mod").textContent = p ? (p.modalidade || '—') : '—';
  $("#a-pc-conv").textContent = p ? (p.convenio || '—') : '—';
  $("#a-pc-pag").textContent = p ? (p.pagador || p.nome) : '—';
  $("#a-pc-prof").textContent = $("#a-prof").value || '—';
  $("#a-pc-valor").textContent = p ? valorSessaoTxt(p, $("#a-prof").value) : '—';
  $("#a-editcad").hidden = !p; $("#a-hist").hidden = !(p && ehMensal(p));
}
// Regras de cobrança: idênticas ao app anterior. Só muda o que aparece na tela (layoutCobranca).
function aplicarRegra() {
  var v = $("#a-valor"), h = $("#a-valor-hint"), pago = $("#a-pago"), forma = $("#a-forma"), nf = $("#a-nf"), desc = $("#a-desc-sel"), opts = BOOT.listas.pago || [];
  var p = procObj($("#a-proc").value), procV = p ? p.valor : null;
  [v, forma, nf].forEach(function (x) { x.disabled = false; }); desc.disabled = false; v.readOnly = true; v.value = ''; v.placeholder = ''; h.textContent = '';
  var modo = 'tabela';
  if (!cur) { if (p && procV != null) { v.value = brl(procV); h.textContent = 'vem do procedimento'; } baseValor = procV; layoutCobranca('tabela', false); return; }
  var regra = cur.regra || '', oque = $("#a-oque").value;
  var falta = !/^Atendido/.test(oque);
  var pacoteOk = ehPacote(cur) && planoAtivo(cur) && !cur._avulsa;
  if (cur._extra) { v.disabled = true; forma.disabled = true; desc.disabled = true; pago.value = pick(opts, 'Plano') || pick(opts, 'Pacote'); nf.value = 'Não se aplica'; h.textContent = 'sessão extra liberada'; modo = 'extra'; }
  else if (/^Paga o que/.test(regra)) { v.readOnly = false; v.placeholder = 'valor que pagou'; h.textContent = 'livre — o que pagar quita'; pago.value = pick(opts, 'Sim'); nf.value = 'Não'; modo = 'paga'; }
  else if (/^Valor fixo/.test(regra)) { var vc = num((cur.valorCombinado || '').match(/[\d.]+,?\d*/) || ''); if (vc != null) { v.value = brl(vc); h.textContent = 'valor combinado do cadastro'; } else { v.readOnly = false; h.textContent = 'combinado: preencher à mão (não achei o número no cadastro)'; } pago.value = pick(opts, 'Sim'); nf.value = 'Não'; modo = 'fixo'; }
  else if (/^Pro bono|^Permuta/.test(regra) && !cur._cobrar) { v.disabled = true; forma.disabled = true; desc.disabled = true; pago.value = pick(opts, 'Não se aplica'); nf.value = 'Não se aplica'; h.textContent = 'sem cobrança'; modo = 'probono'; }
  else if ((regra === 'Convênio' || (ehConvenio(cur) && (!cur.modalidade || cur.modalidade === 'Convênio'))) && !cur._cobrar) { v.value = brl(0); v.disabled = true; forma.disabled = true; desc.disabled = true; pago.value = pick(opts, 'Convênio'); nf.value = 'Não se aplica'; h.textContent = 'faturado no convênio'; modo = 'convenio'; }
  else if (ehMensal(cur) || /^Mensalidade/.test(regra)) { v.disabled = true; forma.disabled = true; desc.disabled = true; pago.value = pick(opts, 'Plano') || pick(opts, 'Pacote'); nf.value = 'Não se aplica'; h.textContent = 'já pago na mensalidade'; modo = 'mensal'; }
  else if (pacoteOk) { v.disabled = true; forma.disabled = true; desc.disabled = true; pago.value = pick(opts, 'Plano') || pick(opts, 'Pacote'); nf.value = 'Não se aplica'; h.textContent = 'já pago no plano'; modo = 'plano'; }
  else {
    // procedimento R$ 0 na tabela (aplicação de teste, retorno): sem cobrança, mesmo com valor por sessão no cadastro
    var semCobranca = procV === 0 && !cur._cobrar, sessao = p && /^(Sessão|Consulta|Terapia)/.test(p.nome);
    if (semCobranca) { v.value = brl(0); h.textContent = 'procedimento sem cobrança (R$ 0 na tabela)'; }
    else if (usaValorSessao(cur) && sessao) { v.value = brl(valorSessaoCad(cur)); h.textContent = 'valor por sessão do cadastro'; }
    else if (procV == null || (cur._cobrar && procV === 0)) { v.readOnly = false; v.placeholder = 'preencher à mão'; h.textContent = cur._cobrar ? 'exceção: cobrado à parte, valor à mão' : 'procedimento sem valor na tabela'; }
    else { v.value = brl(procV); h.textContent = 'vem do procedimento (travado)'; }
    pago.value = semCobranca ? pick(opts, 'Não se aplica') : ehPosterior(cur) ? pick(opts, 'Não') : pick(opts, 'Sim'); nf.value = semCobranca ? 'Não se aplica' : 'Não';
    if (ehPosterior(cur) && !semCobranca) h.textContent += ' · paga no fim do mês';
  }
  baseValor = procV;
  var hintFalta = '';
  if (falta) { v.value = ''; v.disabled = true; forma.disabled = true; desc.disabled = true; pago.value = ''; nf.value = 'Não se aplica'; hintFalta = (/sem aviso|em cima da hora/.test(oque) && !ehMensal(cur) && !ehConvenio(cur) && !/^Pro bono|^Permuta/.test(regra)) ? (pacoteOk ? 'Consome 1 consulta do plano.' : 'Falta: vira pendência de taxa pra gestão decidir.') : 'Sem cobrança nesta linha.'; }
  $("#a-oque-hint").textContent = hintFalta;
  mostrarPagParcial();
  layoutCobranca(modo, falta);
}
// avaliação neuropsicológica (avaliação e aplicação de teste): o valor varia e pode ser cobrado à parte mesmo de paciente de convênio (gestão, 08/10)
function excecaoConv() { return /neuropsicol/i.test($("#a-proc").value || ''); }
// o que aparece no passo 3, pelo modo da regra
function layoutCobranca(modo, falta) {
  var p3 = $("#a-passo3"), pb = $("#a-probono");
  pb.hidden = true; p3.hidden = true; $("#a-convbox").hidden = true; $("#a-pagbox").hidden = false; $("#a-cob-aviso").innerHTML = '';
  if (!cur || falta) { if (cur && !falta) p3.hidden = false; atualizarPreview(); return; }
  if (modo === 'probono') { pb.hidden = false; $("#a-probono-txt").innerHTML = '<strong>Sem cobrança</strong> · ' + esc(cur.regra || cur.modalidade) + (cur.obsCobranca ? ' (' + esc(cur.obsCobranca) + ')' : '') + '. “Pago?” fica como <em>Não se aplica</em>. Nenhuma NF.'; }
  else if (modo === 'mensal' || modo === 'plano' || modo === 'extra') { /* a faixa de aviso já explica; nada de dinheiro na tela */ }
  else {
    p3.hidden = false;
    if (modo === 'convenio') { $("#a-convbox").hidden = false; $("#a-pagbox").hidden = true; $("#a-conv-txt").innerHTML = '<strong>' + esc(cur.convenio || 'Convênio') + '</strong> · vai para a fatura do convênio, valor R$ 0. Nenhuma cobrança ao paciente.' + (excecaoConv() ? ' <button type="button" class="btn link" id="a-conv-cobrar">Cobrar à parte como particular</button>' : '');
      var bcv = $("#a-conv-cobrar"); if (bcv) bcv.addEventListener('click', function () { cur._cobrar = true; aplicarTipo(); toast('Exceção: cobrando à parte. Preencha o valor e anote o motivo na Observação'); }); $("#a-guia-chk").checked = $("#a-guia").value === 'Sim'; }
    else if (modo === 'paga') { var ref = refValor(cur); $("#a-cob-aviso").innerHTML = '<div class="faixa nota">Valor livre. <strong>O que for pago quita a sessão</strong> — nada fica em aberto.' + (ref ? ' Referência: R$ ' + esc(ref % 1 ? brl(ref) : ref) + '.' : '') + '</div>'; }
    else if (cur._cobrar && ehConvenio(cur) && excecaoConv()) { $("#a-cob-aviso").innerHTML = '<div class="faixa nota">Exceção ao convênio: este atendimento é cobrado à parte, como particular, com o valor combinado. <button type="button" class="btn link" id="a-conv-voltar">Voltar para o convênio</button></div>'; $("#a-conv-voltar").addEventListener('click', function () { cur._cobrar = false; aplicarTipo(); }); }
    else if (modo === 'fixo') $("#a-cob-aviso").innerHTML = '<div class="faixa nota">Valor combinado com a gestão' + (cur.valorCombinado ? ': <strong>' + esc(cur.valorCombinado) + '</strong>' : '') + '. Não negociar na recepção.</div>';
  }
  seg($("#a-pago-seg"), $("#a-pago").value); seg($("#a-nf-seg"), $("#a-nf").value === 'Sim' ? 'Sim' : 'Não');
  var pagoVal = $("#a-pago").value; $("#a-pago-outro").hidden = false; if (pagoVal && pagoVal !== 'Sim' && pagoVal !== 'Não' && pagoVal !== 'Parcial') { $("#a-pago").classList.remove('sr'); } else $("#a-pago").classList.add('sr');
  $("#a-quem-tag").hidden = !(cur && $("#a-quem").value.trim() === (cur.pagador || cur.nome));
  atualizarPreview();
}
function resumoCobranca() {
  if (!cur) return '—';
  var oque = $("#a-oque").value; if (!/^Atendido/.test(oque)) return 'sem cobrança (' + OQUE_CURTO(oque).toLowerCase() + ')';
  if (cur._extra) return 'sessão extra liberada · sem cobrança';
  var pago = $("#a-pago").value, v = $("#a-valor").value, forma = $("#a-forma").value;
  if (/^Não se aplica/.test(pago)) return 'não se aplica (' + modCurta(cur.regra || cur.modalidade).toLowerCase() + ')';
  if (/^Convênio/.test(pago)) return 'convênio ' + (cur.convenio || '') + ' · R$ 0 · guia ' + ($("#a-guia").value === 'Sim' ? 'assinada' : 'não assinada');
  if (/^Plano|^Pacote|^Mensalista/.test(pago)) return ehMensal(cur) ? 'mensalidade (já paga) · sem cobrança' : 'plano · sem cobrança';
  if (pago === 'Sim') return 'pago · R$ ' + (v || '…') + ' · ' + forma + ($("#a-nf").value === 'Sim' ? ' · NF ' + ($("#a-nfn").value || 'emitida') : ' · NF depois');
  if (pago === 'Não') return 'não pago · ' + (v ? 'R$ ' + v + ' em aberto' : 'valor em aberto');
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
  if (cur && cur._extra) obs = ('Sessão extra liberada por ' + cur._extraQuem + ' — ' + cur._extraMotivo + '. ' + obs).trim();
  var pk = cur ? AT.pacotes[cur.nome] : null, usaPacote = cur && ehPacote(cur) && pk && (cur._extra || (pk.status === 'ativo' && (pk.n - pk.usadas) > 0 && !cur._avulsa));
  return { paciente: $("#a-pac").value.trim(), profissional: $("#a-prof").value, data: $("#a-data").value, hora: $("#a-hora").value, procedimento: $("#a-proc").value,
    oque: $("#a-oque").value, pago: $("#a-pago").value, valorRecebido: $("#a-pago").value === 'Parcial' ? $("#a-recebido").value : '', valor: $("#a-valor").disabled ? '' : $("#a-valor").value, forma: $("#a-forma").value, dataPagamento: $("#a-datapag").value,
    quemPagou: $("#a-quem").value.trim(), nf: $("#a-nf").value, nfNumero: $("#a-nfn").value.trim(), guia: $("#a-convbox").hidden && !(cur && ehConvenio(cur)) ? '' : $("#a-guia").value, observacao: obs,
    pacoteId: usaPacote ? pk.id : '', sessaoExtra: !!(cur && cur._extra), tornarPagadorHabitual: $("#a-tornar").checked };
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
    if (r.pacote && AT.pacotes[d.paciente]) { AT.pacotes[d.paciente].usadas = r.pacote.usadas; if (r.pacote.usadas >= r.pacote.n) AT.pacotes[d.paciente].status = 'encerrado'; }
    if (d.tornarPagadorHabitual && cur) { cur.pagador = d.quemPagou; }
    if (typeof invalidarResumo === 'function') invalidarResumo();
    var msg = d.paciente + ' · ' + OQUE_CURTO(d.oque) + ' · gravado na aba ' + r.aba + ', linha ' + r.linha;
    limparAt(false);
    if (voltar) { go('hoje'); toast('Atendimento gravado: ' + d.paciente); }
    else {
      // linha verde "Registrado!" + atalho pra lista do dia do atendimento (Roberta, 06/10)
      var dataReg = d.data, ehHoje = dataReg === hojeStr();
      $("#a-sucesso").innerHTML = aviso('verde', 'Registrado! ' + esc(msg), esc(d.procedimento) + (d.valor ? ' · R$ ' + esc(d.valor) : '') + (d.pago ? ' · Pago? ' + esc(d.pago) : '') + (r.pacote ? ' · plano ' + r.pacote.usadas + '/' + r.pacote.n + ' usadas' : '') + '. <a href="#" id="a-ver-lista">' + (ehHoje ? 'ver na lista de hoje' : 'ver na lista de ' + esc(dataReg.slice(0, 5))) + '</a>');
      $("#a-ver-lista").addEventListener('click', function (e) { e.preventDefault(); var dt = dataObj(dataReg); if (dt) $("#d-data").value = dataParaISO(dt); go('hoje'); });
      toast('Registrado!'); $("#a-pac").focus();
    }
  }).catch(function (e) { banner('Não consegui gravar na planilha (' + e.message + '). Seus dados estão guardados aqui: tente de novo em instantes.'); })
    .finally(function () { salvandoAt = false; $("#a-salvar").disabled = false; $("#a-salvar-outro").disabled = false; });
}
function limparAt(apagaSucesso, semFoco) {
  $("#a-pac").value = ''; cur = null; $("#a-oque").selectedIndex = 0; seg($("#a-oque-seg"), $("#a-oque").value); $("#a-obs").value = ''; $("#a-nfn").value = ''; $("#a-desc-val").value = ''; $("#a-desc-motivo").value = ''; $("#a-desc-sel").value = ''; $("#a-descbox").hidden = true; $("#a-extra-motivo").value = ''; $("#a-tornar").checked = false; $("#a-pagador-novo").hidden = true; $("#l-proc").hidden = true; decisaoPagador = null;
  $("#a-data").value = hojeStr(); $("#a-hora").value = agoraHora(); $("#a-datapag").value = hojeStr(); $("#a-erros").innerHTML = ''; $("#a-aba-nome").textContent = 'Grava na aba ' + AT.abaMes;
  if (apagaSucesso !== false) $("#a-sucesso").innerHTML = '';
  limparRascunhoAt(); ultimoPacRender = null; onPacAt(true); if (!semFoco) $("#a-pac").focus();
}
function lancarPacoteAt() {
  if (!cur) return;
  var n = parseInt($("#a-pk-n").value, 10) || 4, compra = procCompra(n, $("#a-prof").value);
  var d = { paciente: cur.nome, sessoes: n, valor: $("#a-pk-valor").value, data: $("#a-data").value, hora: $("#a-hora").value, profissional: $("#a-prof").value, modalidade: cur.modalidade,
    validadeMeses: n >= 12 ? 6 : (n >= 6 ? 3 : 2), pago: $("#a-pk-pago").value === 'Não' ? 'Não' : 'Sim', forma: $("#a-pk-forma").value, quemPagou: $("#a-pk-quem").value.trim(), nf: $("#a-pk-nf").value, nfNumero: $("#a-pk-nfn").value.trim(), procedimentoCompra: compra ? compra.nome : ('Plano de ' + n + ' consultas (compra)') };
  if (d.pago === 'Não') { d.forma = ''; d.nf = 'Não'; d.nfNumero = ''; } // a receber: forma e NF entram quando pagar (correção da linha)
  if (!(num(d.valor) > 0)) return toast('Informe o valor do plano');
  $("#a-pk-salvar").disabled = true;
  call('lancarPacote', d).then(function (r) {
    if (!r.ok) { toast((r.erros || ['Não gravou']).join(' ')); return; }
    AT.pacotes[cur.nome] = { id: r.id, n: n, usadas: 0, compra: d.data, validade: r.validade, status: 'ativo', pago: d.pago }; cur._avulsa = false;
    $("#a-pacotebox").hidden = true; toast(d.pago === 'Não' ? 'Plano lançado · R$ ' + brl(num(d.valor)) + ' a receber (linha na aba ' + r.aba + ')' : 'Plano lançado · recebimento de R$ ' + brl(num(d.valor)) + ' gravado na aba ' + r.aba); if (typeof invalidarResumo === 'function') invalidarResumo(); onPacAt(true);
  }).catch(function (e) { toast('Erro: ' + e.message); }).finally(function () { $("#a-pk-salvar").disabled = false; });
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
$("#a-extra-cancel").addEventListener('click', function () { $("#a-extrabox").hidden = true; });
$("#a-extra-ok").addEventListener('click', function () { if (!$("#a-extra-motivo").value.trim()) return toast('Informe o motivo'); cur._extra = true; cur._extraQuem = $("#a-extra-quem").value; cur._extraMotivo = $("#a-extra-motivo").value.trim(); $("#a-extrabox").hidden = true; aplicarTipo(); toast('Sessão extra liberada · não consome nem cobra'); });
$("#a-pk-cancel").addEventListener('click', function () { $("#a-pacotebox").hidden = true; });
$("#a-pk-pago").addEventListener('change', function () { var depois = this.value === 'Não'; $$('[data-pk-pago]').forEach(function (l) { l.hidden = depois; }); $("#a-pk-depois").hidden = !depois; $("#a-pk-salvar").textContent = depois ? 'Salvar plano a receber' : 'Salvar plano e recebimento'; });
$("#a-pk-salvar").addEventListener('click', lancarPacoteAt);
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
$("#a-hist").addEventListener('click', function () { if (!cur) return; go('mensalistas', { buscar: cur.nome }); });
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
  $("#a-ant-valor").value = valorSessaoCad(cur) != null ? brl(valorSessaoCad(cur)) : ''; $("#a-ant-datapag").value = hojeStr(); $("#a-ant-quem").value = cur.pagador || cur.nome; $("#a-ant-nfn").value = ''; $("#a-ant-datas").value = '';
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
