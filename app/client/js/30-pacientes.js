/* ================= PACIENTES (novo paciente + editar cadastro) ================= */
var pModo = 'novo', pVoltar = null, pacIniciado = false, cadNome = '', cadDados = null, dupConfirmada = false, salvandoP = false;
var CAMPOS_N = ["n-nome", "n-cpf", "n-nasc", "n-tel-pac", "n-pagador", "n-whats", "n-prof", "n-conv", "n-cart", "n-indic", "n-primeira", "n-pag-cpf", "n-resp", "n-resp-par", "n-resp-tel", "n-resp-cpf"];
var RASCUNHO_N = 'rn-novo-paciente';
// Fase 1 (15/10): a cobrança saiu do cadastro do paciente e foi pra "Cobrança por profissional" (seção própria, gestão edita)

INICIAR.pacientes = function (extra) {
  quandoAT(function () {
    iniciarPac();
    pVoltar = (extra && extra.voltar) || null;
    if (extra && extra.editar) { setModo('editar'); $("#c-pac").value = extra.editar; carregarCad(); }
    else if (extra && extra.novo) { setModo('novo'); if (extra.nome) { $("#n-nome").value = extra.nome; checarDup(); } $("#n-nome").focus(); }
    else if (!pacIniciado2) { setModo('novo'); }
    pacIniciado2 = true;
  });
};
var pacIniciado2 = false;
function iniciarPac() {
  if (pacIniciado) return; pacIniciado = true;
  preencherSelect($("#n-conv"), BOOT.listas.convenios || []);
  preencherSelect($("#n-prof"), BOOT.profissionais, '—');
  comboPacientes($("#c-pac"), function () { carregarCad(); });
  $("#p-carregando").hidden = true; $("#p-form").hidden = false; $("#p-rodape").hidden = telaAtual !== 'pacientes';
  $("#p-gestao-campos").hidden = !ehGestao();
  if (lerRascunhoN()) toast('Rascunho do cadastro recuperado');
  mostrarResp();
  $("#l-cart").hidden = $("#n-conv").value === 'Particular' || !$("#n-conv").value;
}
function setModo(m) {
  pModo = m; seg($("#p-modo"), m);
  var edit = m === 'editar';
  $("#p-busca").hidden = !edit; $("#p-form").hidden = edit && !cadDados;
  $("#p-quem-informou").hidden = !edit;
  $("#p-so-salvar").hidden = edit;
  $("#p-salvar").innerHTML = edit ? 'Salvar cadastro' : 'Salvar e registrar atendimento ' + ic('seta', 16);
  $("#p-rodape-nota").textContent = edit ? 'Atualiza a linha em Pacientes · toda alteração fica em “Alterações de cadastro”, com quem informou' : 'Grava uma linha na aba Pacientes · sem CPF ou nascimento agora? Complete depois';
  ["n-nome", "n-cpf", "n-nasc"].forEach(function (id) { $("#" + id).readOnly = edit; }); // no editar, CPF e nascimento em branco destravam ao carregar (completar)
  $("#n-nome-req").hidden = edit; $("#n-cpf-hint").textContent = edit ? 'Só os últimos dígitos, pra conferir. O CPF não muda por aqui.' : 'Da criança também. CPF repetido bloqueia. Sem CPF agora? Complete depois.';
  $("#n-dup").innerHTML = ''; $("#n-erros").innerHTML = ''; $("#n-confirma").innerHTML = ''; $("#n-sucesso").innerHTML = '';
  if (!edit) { cadDados = null; cadNome = ''; limparFormN(false); $("#p-form").hidden = false; }
  else { $("#p-form").hidden = !cadDados; $("#c-pac").focus(); }
  $("#p-cpp-card").hidden = !edit || !cadDados;
}
$$("#p-modo button").forEach(function (b) { b.addEventListener('click', function () { if (b.dataset.v === 'ficha') { seg($("#p-modo"), pModo); go('ficha', { nome: pModo === 'editar' && cadNome ? cadNome : '' }); return; } setModo(b.dataset.v); }); });
$("#n-prof").addEventListener('change', salvarRascunhoN);
$("#n-conv").addEventListener('change', function () { $("#l-cart").hidden = this.value === 'Particular' || !this.value; salvarRascunhoN(); });

/* ---------- Cobrança por profissional (Fase 1, 15/10): gestão e recepção incluem/editam linhas (16/10: a Juliana passa e a recepção já lança) ---------- */
var cppLinhas = [], cppEdit = null;
function renderCPP() {
  var box = $("#p-cpp-lista"), nome = cadNome; box.innerHTML = '';
  var hoje = new Date();
  if (!cppLinhas.length) { box.innerHTML = '<div class="faixa laranja">' + ic('alerta', 22) + '<div class="corpo"><div class="t">Sem cobrança cadastrada</div><div>' + (ehConvenio(pacInfo(nome)) ? 'Convênio no cadastro, mas sem linha por profissional: o app cobra pela tabela até alguém cadastrar aqui.' : 'O app cobra pela tabela (valor cheio) até alguém cadastrar aqui como este paciente paga cada profissional (+ Adicionar profissional).') + '</div></div></div>'; return; }
  cppLinhas.forEach(function (l0) {
    var l = Cobranca.linhaDe(l0), vig = !/^n/i.test(String(l0.ativo || 'Sim')) && (!l.desde || Cobranca.dataObj(l.desde) <= hoje) && (!l.ate || Cobranca.dataObj(l.ate) >= hoje);
    var futura = l.desde && Cobranca.dataObj(l.desde) > hoje, encerrada = (l.ate && Cobranca.dataObj(l.ate) < hoje) || /^n/i.test(String(l0.ativo || 'Sim'));
    var tag = encerrada ? '<span class="tag cinza">encerrada</span>' : futura ? '<span class="tag azul">a partir de ' + esc(l.desde) + '</span>' : '<span class="tag verde">vigente</span>';
    var d = el('<div class="cpp-linha' + (vig ? '' : ' apagada') + '"><b>' + esc(l.profissional) + '</b><span>' + esc((l0.resumo || Cobranca.resumoLinha(l)).replace(/^[^:]+: /, '')) + '</span>' + tag + (l.ate && !encerrada ? '<span class="muted">até ' + esc(l.ate) + '</span>' : '') + (l.obs ? '<span class="muted">' + esc(l.obs) + '</span>' : '') + '<span class="muted">decidido por ' + esc(l.decididoPor || '—') + (l.decididoEm ? ' em ' + esc(l.decididoEm) : '') + '</span><span class="esp"></span>' + '<button type="button" class="btn link mini" data-ed>Editar</button>' + '</div>');
    var be = $('[data-ed]', d); if (be) be.addEventListener('click', function () { abrirFormCPP(l0); });
    box.appendChild(d);
  });
}
function carregarCPP() {
  var nome = cadNome; cppLinhas = []; renderCPP();
  call('cobrancasDoPaciente', { nome: nome }).then(function (r) { if (!r.ok || nome !== cadNome) return; cppLinhas = r.linhas || []; if (r.valores) BOOT.valores = r.valores; renderCPP(); }).catch(function () { });
}
function abrirFormCPP(l0) {
  var box = $("#p-cpp-form"), l = l0 ? Cobranca.linhaDe(l0) : null, cobs = BOOT.listas.cobrancas || Cobranca.COBRANCAS, pags = BOOT.listas.pagamentos || Cobranca.PAGAMENTOS;
  cppEdit = l0 || null;
  box.innerHTML = '<div class="cab"><h2>' + (l ? 'Editar · ' + esc(l.profissional) : 'Adicionar profissional') + '</h2><span class="muted">' + esc(cadNome) + '</span><span class="esp"></span><button type="button" class="btn icone p" data-fechar aria-label="Fechar">' + ic('fechar', 16) + '</button></div>' +
    '<div class="grid g4">' +
    '<label class="campo">Profissional<select data-c="profissional"></select></label>' +
    '<label class="campo">Cobrança<select data-c="cobranca">' + cobs.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select></label>' +
    '<label class="campo" data-l="convenio">Convênio<select data-c="convenio"></select></label>' +
    '<label class="campo" data-l="valorSessao">Valor por sessão<select data-c="valorSessaoSel"></select><span class="hint" data-c-vhint></span></label>' +
    '<label class="campo" data-l="valorOutro">Outro valor<div class="campo-wrap"><span class="prefixo">R$</span><input data-c="valorSessao" class="dinheiro" inputmode="decimal"></div></label>' +
    '<label class="campo" data-l="valorMensal">Valor mensal<div class="campo-wrap"><span class="prefixo">R$</span><input data-c="valorMensal" class="dinheiro" inputmode="decimal"></div></label>' +
    '<label class="campo" data-l="pagamento">Pagamento<select data-c="pagamento">' + pags.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select></label>' +
    '<label class="campo">Vigente desde <span class="leg">(opcional)</span><input data-c="desde" inputmode="numeric" maxlength="10" placeholder="dd/mm/aaaa"></label>' +
    '<label class="campo">Vigente até <span class="leg">(opcional)</span><input data-c="ate" inputmode="numeric" maxlength="10" placeholder="dd/mm/aaaa"></label>' +
    '<label class="campo">Valor decidido por <span class="req">*</span><input data-c="decididoPor" autocomplete="off" placeholder="Juliana · Victor · gestão"></label>' +
    '<label class="campo">Ativo<select data-c="ativo"><option>Sim</option><option>Não</option></select></label>' +
    '<label class="campo c2">Observação de cobrança<input data-c="obs" autocomplete="off" placeholder="ex.: valor social combinado em 10/10 · quinzenal"></label>' +
    '</div><div data-c-erros></div><div class="acoes"><button type="button" class="btn" data-c-ok>' + (l ? 'Salvar linha' : 'Adicionar') + '</button><button type="button" class="btn ter" data-fechar>Cancelar</button><span class="muted">Fica registrado em "Alterações de cadastro" com quem decidiu.</span></div>';
  box.hidden = false;
  var v = function (n) { return $('[data-c=' + n + ']', box); }, L = function (n) { return $('[data-l=' + n + ']', box); };
  preencherSelect(v('profissional'), BOOT.profissionais, '—'); preencherSelect(v('convenio'), (BOOT.listas.convenios || []).filter(function (c) { return c !== 'Particular'; }), '—');
  var valoresSel = function () {
    var esp = espDoProf(v('profissional').value), lista = valoresDaEsp(esp), sel = v('valorSessaoSel'), atual = sel.value;
    sel.innerHTML = lista.map(function (x) { return '<option value="' + x.valor + '">R$ ' + esc(brl(x.valor)) + (x.nome ? ' · ' + esc(x.nome) : '') + '</option>'; }).join('') + '<option value="outro">outro valor…</option>';
    if (atual) sel.value = atual; if (!sel.value) sel.selectedIndex = 0;
    $('[data-c-vhint]', box).textContent = lista.length ? 'lista de ' + esp + ' (aba Valores por sessão)' : 'sem lista pra ' + (esp || 'esta especialidade') + ': informe o valor';
    if (!lista.length) sel.value = 'outro';
    mostrar();
  };
  var mostrar = function () {
    var c = v('cobranca').value, outro = v('valorSessaoSel').value === 'outro';
    L('convenio').hidden = c !== 'Convênio'; L('valorSessao').hidden = c !== 'Por sessão'; L('valorOutro').hidden = !(c === 'Por sessão' && outro); L('valorMensal').hidden = c !== 'Mensalidade fixa'; L('pagamento').hidden = !(c === 'Por sessão' || c === 'Mensalidade fixa');
  };
  v('profissional').addEventListener('change', valoresSel); v('cobranca').addEventListener('change', function () { if (this.value === 'Mensalidade fixa' && v('pagamento').value === 'Na hora') v('pagamento').value = 'Antecipado'; mostrar(); }); v('valorSessaoSel').addEventListener('change', mostrar);
  ['desde', 'ate'].forEach(function (n) { v(n).addEventListener('input', function () { this.value = mascaraData(this.value); }); });
  if (l) { setSel(v('profissional'), l.profissional); valoresSel(); v('cobranca').value = l.cobranca; setSel(v('convenio'), l.convenio || ''); if (l.valorSessao != null) { v('valorSessaoSel').value = String(l.valorSessao); if (v('valorSessaoSel').value !== String(l.valorSessao)) { v('valorSessaoSel').value = 'outro'; v('valorSessao').value = brl(l.valorSessao); } } if (l.valorMensal != null) v('valorMensal').value = brl(l.valorMensal); setSel(v('pagamento'), l.pagamento); v('desde').value = l.desde || ''; v('ate').value = l.ate || ''; v('decididoPor').value = l.decididoPor || ''; v('ativo').value = /^n/i.test(String(l0.ativo || 'Sim')) ? 'Não' : 'Sim'; v('obs').value = l.obs || ''; }
  else { var pr = $("#n-prof").value; if (pr) setSel(v('profissional'), pr); valoresSel(); if (ehConvenio(pacInfo(cadNome))) { v('cobranca').value = 'Convênio'; setSel(v('convenio'), pacInfo(cadNome).convenio); } }
  mostrar();
  $$('[data-fechar]', box).forEach(function (b) { b.addEventListener('click', function () { box.hidden = true; box.innerHTML = ''; cppEdit = null; }); });
  $('[data-c-ok]', box).addEventListener('click', function () {
    var c = v('cobranca').value, d = { id: l0 ? l0.id : '', paciente: cadNome, profissional: v('profissional').value, cobranca: c, convenio: c === 'Convênio' ? v('convenio').value : '', valorSessao: c === 'Por sessão' ? (v('valorSessaoSel').value === 'outro' ? v('valorSessao').value.trim() : v('valorSessaoSel').value) : '', valorMensal: c === 'Mensalidade fixa' ? v('valorMensal').value.trim() : '', pagamento: (c === 'Por sessão' || c === 'Mensalidade fixa') ? v('pagamento').value : 'Não se aplica', desde: v('desde').value.trim(), ate: v('ate').value.trim(), decididoPor: v('decididoPor').value.trim(), ativo: v('ativo').value === 'Sim', obs: v('obs').value.trim(), quemInformou: $("#c-quem").value.trim() || v('decididoPor').value.trim() };
    var er = [];
    if (!d.profissional) er.push('Escolha o profissional.');
    if (c === 'Por sessão' && !(num(d.valorSessao) > 0)) er.push('Informe o valor por sessão.');
    if (c === 'Mensalidade fixa' && !(num(d.valorMensal) > 0)) er.push('Informe o valor mensal.');
    if (c === 'Convênio' && !d.convenio) er.push('Escolha o convênio.');
    if (!d.decididoPor) er.push('Informe quem decidiu o valor.');
    if (d.desde && !dataObj(d.desde)) er.push('"Vigente desde" inválida.'); if (d.ate && !dataObj(d.ate)) er.push('"Vigente até" inválida.');
    $('[data-c-erros]', box).innerHTML = erroBox(er); if (er.length) return;
    var b = this; b.disabled = true;
    call('salvarCobrancaProf', d).then(function (r) {
      if (!r.ok) { $('[data-c-erros]', box).innerHTML = erroBox(r.erros || [], 'Não gravou'); return; }
      toast(r.alterados && r.alterados.length ? 'Cobrança por profissional gravada (' + r.id + ')' : 'Nada mudou');
      box.hidden = true; box.innerHTML = ''; cppEdit = null;
      recarregarAT().then(function () { carregarCPP(); }).catch(function () { carregarCPP(); });
    }).catch(function (e) { toast('Erro: ' + e.message); }).finally(function () { b.disabled = false; });
  });
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
$("#p-cpp-add").addEventListener('click', function () { abrirFormCPP(null); });

/* ---------- novo paciente ---------- */
function salvarRascunhoN() { if (pModo !== 'novo') return; try { var o = {}; CAMPOS_N.forEach(function (id) { o[id] = $("#" + id).value; }); localStorage.setItem(RASCUNHO_N, JSON.stringify(o)); } catch (e) { } }
function lerRascunhoN() { try { var o = JSON.parse(localStorage.getItem(RASCUNHO_N) || 'null'); if (!o) return false; var tem = false; CAMPOS_N.forEach(function (id) { if (o[id] != null) { $("#" + id).value = o[id]; if (o[id]) tem = true; } }); return tem; } catch (e) { return false; } }
function limparRascunhoN() { try { localStorage.removeItem(RASCUNHO_N); } catch (e) { } }
var dupT;
function checarDup() {
  clearTimeout(dupT);
  dupT = setTimeout(function () {
    var box = $("#n-dup"); box.innerHTML = '';
    if (!BOOT || pModo !== 'novo') return;
    var novo = { nome: $("#n-nome").value, cpf: $("#n-cpf").value, nasc: $("#n-nasc").value, pagador: $("#n-pagador").value };
    var r = Duplicatas.verificar(novo, BOOT.pacientes);
    $("#n-nome").classList.toggle('erro', !!(r.bloqueio || r.avisos.length));
    if (r.bloqueio) {
      var p = r.bloqueio.paciente;
      box.innerHTML = aviso('vermelha', 'CPF já cadastrado', 'Este CPF é de <b>' + esc(p.nome) + '</b>' + (p.nasc ? ', nasc. ' + esc(p.nasc) : '') + '. Não dá pra cadastrar de novo. Confira o documento ou abra o cadastro existente.', '<button type="button" class="btn ter" data-abrir="' + esc(p.nome) + '">Abrir cadastro</button>');
    } else if (!dupConfirmada) {
      r.avisos.forEach(function (a) {
        var p = a.paciente;
        box.innerHTML += '<div class="faixa laranja" style="border-width:1px;border-color:var(--lar-b2);border-radius:12px;padding:14px 16px">' + ic('info', 22) + '<div class="corpo" style="font-size:14px"><div><strong style="color:var(--lar-tx)">Parece que já existe:</strong> ' + esc(p.nome) + (p.nasc ? ' · nasc. ' + esc(p.nasc) : '') + (p.pagador ? ' · pagador ' + esc(p.pagador) : '') + (p.modalidade ? ' · ' + esc(p.modalidade) : '') + '.</div><div>' + esc(a.motivos.join(' · ')) + '. É a mesma pessoa?</div></div><div class="acoes"><button type="button" class="btn" data-abrir="' + esc(p.nome) + '">É ele — abrir cadastro</button><button type="button" class="btn ter" data-outra="1">Não, é outra pessoa</button></div></div>';
      });
    }
    $$('[data-abrir]', box).forEach(function (b) { b.addEventListener('click', function () { setModo('editar'); $("#c-pac").value = b.dataset.abrir; carregarCad(); }); });
    $$('[data-outra]', box).forEach(function (b) { b.addEventListener('click', function () { dupConfirmada = true; box.innerHTML = ''; $("#n-nome").classList.remove('erro'); toast('Ok: vai cadastrar como outra pessoa'); }); });
    atualizarBotaoN();
  }, 200);
}
function atualizarBotaoN() {
  var cpf = $("#n-cpf").value, ok = true, hint = $("#n-cpf-hint");
  if (pModo === 'novo') {
    if (Duplicatas.digitos(cpf).length === 11) { if (Duplicatas.cpfValido(cpf)) { hint.textContent = 'CPF válido'; $("#n-cpf").classList.remove('erro'); } else { hint.textContent = 'CPF inválido: confira os dígitos'; $("#n-cpf").classList.add('erro'); ok = false; } }
    else { hint.textContent = 'Da criança também. CPF repetido bloqueia. Sem CPF agora? Complete depois.'; $("#n-cpf").classList.remove('erro'); }
    if ($("#n-dup .faixa.vermelha")) ok = false;
  }
  $("#p-salvar").disabled = !ok; $("#p-so-salvar").disabled = !ok;
}
function dadosN(confirmou) {
  return { nome: $("#n-nome").value, cpf: $("#n-cpf").value, nasc: $("#n-nasc").value, pagador: $("#n-pagador").value, whatsapp: $("#n-whats").value, telPaciente: $("#n-tel-pac").value,
    profissional: $("#n-prof").value, modalidade: '', pagamento: '', convenio: $("#n-conv").value, carteirinha: $("#n-cart").value,
    indicacao: $("#n-indic").value, primeiraConsulta: $("#n-primeira").value, confirmouDuplicata: !!confirmou,
    pagadorCpf: $("#n-pag-cpf").value, respNome: $("#n-resp").value, respPar: $("#n-resp-par").value, respTel: $("#n-resp-tel").value, respCpf: $("#n-resp-cpf").value };
}
function validarN() {
  var e = [];
  if (Duplicatas.tokens($("#n-nome").value).length < 2) e.push('Informe o nome completo.');
  // CPF e nascimento opcionais (gestão, 08/10); preenchidos, têm de ser válidos
  if (Duplicatas.digitos($("#n-cpf").value) && !Duplicatas.cpfValido($("#n-cpf").value)) e.push('CPF inválido: confira os 11 dígitos ou deixe em branco.');
  if ($("#n-nasc").value.trim() && !dataValida($("#n-nasc").value)) e.push('Data de nascimento inválida (dd/mm/aaaa) ou deixe em branco.');
  if ($("#n-primeira").value && !dataValida($("#n-primeira").value)) e.push('Data da 1ª consulta inválida.');
  // a cobrança fica em "Cobrança por profissional" (gestão cadastra depois); aqui só convênio e carteirinha
  return e.concat(errosCpfsExtras());
}
function salvarNovo(confirmou, registrarDepois) {
  if (salvandoP) return;
  var erros = validarN(); $("#n-erros").innerHTML = erroBox(erros); if (erros.length) { $("#n-erros").scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  salvandoP = true; $("#p-salvar").disabled = true; $("#p-so-salvar").disabled = true; $("#n-confirma").innerHTML = '';
  var d = dadosN(confirmou || dupConfirmada);
  call('criarPaciente', d).then(function (r) {
    if (r.precisaConfirmar) {
      $("#n-confirma").innerHTML = aviso('laranja', 'Antes de gravar: pode ser a mesma pessoa', r.avisos.map(function (a) { return '<div><b>' + esc(a.nome) + '</b>' + (a.nasc ? ', nasc. ' + esc(a.nasc) : '') + ' — ' + esc(a.motivos.join(' · ')) + '</div>'; }).join(''), '<div class="acoes" style="flex-basis:100%"><button class="btn" type="button" id="btn-outra">É outra pessoa, cadastrar mesmo assim</button><button class="btn ter" type="button" id="btn-cancela">Cancelar</button>' + r.avisos.map(function (a) { return '<button class="btn ter" type="button" data-abrir="' + esc(a.nome) + '">Abrir ' + esc(primeiroNome(a.nome)) + '</button>'; }).join('') + '</div>');
      $("#btn-outra").addEventListener('click', function () { salvarNovo(true, registrarDepois); });
      $("#btn-cancela").addEventListener('click', function () { $("#n-confirma").innerHTML = ''; });
      $$('#n-confirma [data-abrir]').forEach(function (b) { b.addEventListener('click', function () { setModo('editar'); $("#c-pac").value = b.dataset.abrir; carregarCad(); }); });
      $("#n-confirma").scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!r.ok) { $("#n-erros").innerHTML = erroBox(r.erros || ['Não foi possível gravar.']); return; }
    BOOT.pacientes.push({ linha: r.linha, nome: d.nome, cpf: d.cpf, nasc: d.nasc, pagador: d.pagador, convenio: d.convenio, ativo: 'Sim' });
    var novoAT = { linha: r.linha, nome: d.nome, cpf: d.cpf, nasc: d.nasc, obsCobranca: '', pagador: d.pagador, convenio: d.convenio, telPac: d.telPaciente, resp: d.respNome, respPar: d.respPar, respTel: d.respTel, ativo: 'Sim' };
    if (AT) { AT.pacientes.push(novoAT); var o = document.createElement('option'); o.value = d.nome; $("#dl-pacientes").appendChild(o); }
    limparRascunhoN();
    // gestão: a observação de cobrança não entra na criação; vai pela atualização do cadastro (mesma função da tela Editar)
    var extras = ehGestao() ? { obsCobranca: $("#c-obs").value.trim() } : null;
    var p2 = (extras && extras.obsCobranca) ? call('atualizarCadastro', { nome: d.nome, quemInformou: quemSou() + ' (no cadastro)', campos: extras }).then(function (r2) { if (r2.ok) { novoAT.obsCobranca = extras.obsCobranca; } }) : Promise.resolve();
    return p2.then(function () {
      $("#n-sucesso").innerHTML = (faltasDoc(novoAT).length ? aviso('laranja', 'Falta ' + esc(faltasDocTxt(novoAT)), 'Peça o documento e complete em Pacientes → Editar cadastro.') : '') + aviso('verde', esc(r.nome) + ' cadastrado(a) na linha ' + r.linha + ' de Pacientes', 'Agora cadastre no ControleOdonto. ' + (ehGestao() ? 'Cadastre a cobrança por profissional em Buscar / editar cadastro. ' : 'A gestão cadastra a cobrança por profissional; até lá o app cobra pela tabela. ') + (r.colunasCriadas && r.colunasCriadas.length ? 'Colunas novas criadas na planilha: ' + esc(r.colunasCriadas.join(', ')) + '. ' : ''));
      limparFormN(false); toast('Cadastrado em Pacientes');
      if (registrarDepois || pVoltar === 'registrar') { var v = pVoltar; pVoltar = null; go('registrar', { paciente: d.nome }); if (v !== 'registrar') toast('Agora registre o atendimento de ' + primeiroNome(d.nome)); }
    });
  }).catch(function (e) { banner('Não consegui gravar na planilha (' + e.message + '). Seus dados estão guardados aqui: tente de novo em instantes.'); })
    .finally(function () { salvandoP = false; atualizarBotaoN(); });
}
function limparFormN(apagaSucesso) {
  CAMPOS_N.forEach(function (id) { var e = $("#" + id); if (e.tagName === 'SELECT') e.value = ''; else e.value = ''; });
  mostrarResp();
  if ($("#n-conv").options.length) $("#n-conv").value = 'Particular';
  ["c-obs", "c-quem"].forEach(function (id) { $("#" + id).value = ''; });
  $("#n-dup").innerHTML = ''; $("#n-erros").innerHTML = ''; $("#n-confirma").innerHTML = ''; $("#n-nome").classList.remove('erro');
  if (apagaSucesso !== false) $("#n-sucesso").innerHTML = '';
  dupConfirmada = false; limparRascunhoN(); $("#l-cart").hidden = true; $("#p-cpp-card").hidden = true; atualizarBotaoN();
}

/* ---------- editar cadastro ---------- */
function carregarCad() {
  if (!AT) { setTimeout(carregarCad, 300); return; }
  var nome = $("#c-pac").value.trim(); cadNome = nome; $("#n-sucesso").innerHTML = ''; $("#n-erros").innerHTML = '';
  var p = pacInfo(nome);
  $("#c-pac-info").textContent = p ? '' : (nome ? 'Não está em Pacientes. Use "Novo paciente".' : '');
  if (!p) { $("#p-form").hidden = true; cadDados = null; return; }
  $("#c-carregando").hidden = false; $("#p-form").hidden = true;
  call('lerCadastro', { nome: nome }).then(function (r) {
    $("#c-carregando").hidden = true;
    if (!r.ok) return toast((r.erros || ['Não encontrei o cadastro']).join(' '));
    if (r.nome !== cadNome) return;
    cadDados = r; var c = r.campos || {};
    $("#n-nome").value = r.nome; $("#n-cpf").value = r.cpfFinal ? '···' + r.cpfFinal : ''; $("#n-nasc").value = r.nasc || '';
    // em branco: a recepção completa aqui; preenchido: só leitura (correção é com a gestão)
    $("#n-cpf").readOnly = !!r.cpfFinal; $("#n-nasc").readOnly = !!r.nasc;
    $("#n-cpf-hint").textContent = r.cpfFinal ? 'Só os últimos dígitos, pra conferir. O CPF não muda por aqui.' : 'Sem CPF no cadastro: digite pra completar.';
    $("#n-indic").value = r.indicacao || ''; $("#n-primeira").value = r.primeira || '';
    $("#n-pagador").value = c.pagador || ''; $("#n-whats").value = c.whats || ''; $("#n-tel-pac").value = c.telPac || '';
    $("#n-pag-cpf").value = c.pagadorCpf || ''; $("#n-resp").value = c.respNome || ''; $("#n-resp-par").value = c.respPar || ''; $("#n-resp-tel").value = c.respTel || ''; $("#n-resp-cpf").value = c.respCpf || '';
    setSel($("#n-prof"), c.profRef); setSel($("#n-conv"), c.convenio || 'Particular'); $("#n-cart").value = c.carteirinha || '';
    $("#c-obs").value = c.obsCobranca || ''; $("#c-quem").value = '';
    $("#l-cart").hidden = !$("#n-conv").value || $("#n-conv").value === 'Particular';
    mostrarResp(); $("#p-form").hidden = false; atualizarBotaoN();
    $("#p-cpp-card").hidden = false; $("#p-cpp-form").hidden = true; $("#p-cpp-form").innerHTML = ''; carregarCPP();
  }).catch(function (e) { $("#c-carregando").hidden = true; toast('Erro: ' + e.message); });
}
function salvarEdicao() {
  if (salvandoP) return;
  var nome = cadNome, erros = []; if (!pacInfo(nome) || !cadDados) erros.push('Escolha um paciente da lista.');
  var quem = $("#c-quem").value.trim(); if (!quem) erros.push('Informe quem passou a informação.');
  var cpfC = !$("#n-cpf").readOnly ? $("#n-cpf").value.trim() : '', nascC = !$("#n-nasc").readOnly ? $("#n-nasc").value.trim() : '';
  if (cpfC && !Duplicatas.cpfValido(cpfC)) erros.push('CPF inválido: confira os 11 dígitos.');
  if (nascC && !dataValida(nascC)) erros.push('Data de nascimento inválida (dd/mm/aaaa).');
  if ($("#n-primeira").value && !dataValida($("#n-primeira").value)) erros.push('Data da 1ª consulta inválida.');
  erros = erros.concat(errosCpfsExtras());
  $("#n-erros").innerHTML = erroBox(erros); if (erros.length) return;
  var c0 = cadDados.campos || {};
  var campos = { cpf: cpfC || null, nasc: nascC || null, convenio: $("#n-conv").value, carteirinha: $("#n-cart").value.trim(), pagador: $("#n-pagador").value.trim(), whats: $("#n-whats").value.trim(), telPac: $("#n-tel-pac").value.trim(), profRef: $("#n-prof").value,
    obsCobranca: ehGestao() ? $("#c-obs").value.trim() : (c0.obsCobranca || ''),
    pagadorCpf: $("#n-pag-cpf").value.trim(), respNome: $("#n-resp").value.trim(), respPar: $("#n-resp-par").value.trim(), respTel: $("#n-resp-tel").value.trim(), respCpf: $("#n-resp-cpf").value.trim() };
  salvandoP = true; $("#p-salvar").disabled = true;
  call('atualizarCadastro', { nome: nome, quemInformou: quem, campos: campos }).then(function (r) {
    if (!r.ok) { $("#n-erros").innerHTML = erroBox(r.erros || [], 'Não gravou'); return; }
    [AT && AT.pacientes, BOOT && BOOT.pacientes].forEach(function (l) { (l || []).filter(function (p) { return p.nome === nome; }).forEach(function (p) { if (cpfC) p.cpf = cpfC; if (nascC) p.nasc = nascC; p.convenio = campos.convenio; p.obsCobranca = campos.obsCobranca; p.pagador = campos.pagador; p.telPac = campos.telPac; p.resp = campos.respNome; p.respPar = campos.respPar; p.respTel = campos.respTel; }); });
    var mudou = r.alterados && r.alterados.length;
    toast(mudou ? 'Cadastro atualizado' : 'Nada mudou');
    $("#n-sucesso").innerHTML = aviso('verde', esc(nome) + ' · ' + (mudou ? 'cadastro atualizado' : 'nada mudou'), mudou ? 'Alterado: ' + esc(r.alterados.map(function (c) { return c.split(' (')[0]; }).join(', ')) + '. Registrado em “Alterações de cadastro”.' : 'Nenhum campo mudou.');
    var voltar = function () { if (pVoltar) { var v = pVoltar; pVoltar = null; go(v, { paciente: nome }); } };
    // mudou convênio (gestão): o passado não muda; pergunta só pelas linhas do mês aberto de hoje em diante
    if (ehGestao() && mudou && r.alterados.some(function (c) { return c === 'Convênio'; })) perguntarLinhasAbertas(nome, voltar); else voltar();
  }).catch(function (e) { toast('Erro: ' + e.message); }).finally(function () { salvandoP = false; $("#p-salvar").disabled = false; });
}
function perguntarLinhasAbertas(nome, depois) {
  call('linhasAbertasPaciente', { nome: nome }).then(function (r) {
    if (!r.ok || !r.linhas.length) return depois();
    var n = r.linhas.length, box = el('<div class="faixa nota" style="display:block;margin-top:8px"><strong>Atualizar também ' + (n === 1 ? 'esta linha' : 'estas ' + n + ' linhas') + '?</strong> ' +
      '<span class="muted">Sessões de ' + esc(nome) + ' na aba ' + esc(r.aba) + ' de hoje em diante, ainda com o convênio/modalidade antigos. Os meses anteriores não mudam.</span>' +
      '<ul style="margin:6px 0;padding-left:18px">' + r.linhas.map(function (l) { return '<li>' + esc(l.data + (l.hora ? ' ' + l.hora : '') + ' · ' + l.profissional + ' · ' + (l.convenio || '(sem convênio)') + ' / ' + (l.modalidade || '—') + ' → ' + (r.convenio || '(sem convênio)') + ' / ' + (r.modalidade || '—')) + '</li>'; }).join('') + '</ul>' +
      '<div class="acoes"><button type="button" class="btn" data-sim>Atualizar ' + n + ' linha' + (n === 1 ? '' : 's') + '</button><button type="button" class="btn ter" data-nao>Não, deixar como está</button></div></div>');
    $("#n-sucesso").appendChild(box);
    $('[data-nao]', box).addEventListener('click', function () { box.remove(); depois(); });
    $('[data-sim]', box).addEventListener('click', function () {
      var b = this; b.disabled = true;
      call('atualizarLinhasDoCadastro', { nome: nome, ids: r.linhas.map(function (l) { return l.id; }) }).then(function (r2) {
        if (!r2.ok) { b.disabled = false; return toast((r2.erros || ['Não gravou']).join(' ')); }
        toast((r2.atualizadas || []).length + ' linha(s) de ' + r2.aba + ' atualizada(s)'); box.remove(); depois();
      }).catch(function (e) { b.disabled = false; toast('Erro: ' + e.message); });
    });
  }).catch(function () { depois(); });
}
/* ---------- eventos ---------- */
$("#n-cpf").addEventListener('input', function () { if (!this.readOnly) this.value = mascaraCPF(this.value); });
$("#n-nasc").addEventListener('input', function () { this.value = mascaraData(this.value); });
$("#n-primeira").addEventListener('input', function () { this.value = mascaraData(this.value); });
["n-whats", "n-tel-pac"].forEach(function (id) { $("#" + id).addEventListener('input', function () { this.value = mascaraFone(this.value); }); });
$("#n-resp-tel").addEventListener('input', function () { this.value = mascaraFone(this.value); });
["n-pag-cpf", "n-resp-cpf"].forEach(function (id) { $("#" + id).addEventListener('input', function () { this.value = mascaraCPF(this.value); }); });
$("#n-nasc").addEventListener('input', mostrarResp);
/* responsável legal: aparece pra menor de idade (ou quando já tem algo preenchido); CPFs extras são opcionais, mas se preenchidos têm de ser válidos */
function ehMenor(nasc) { var d = dataObj(nasc); if (!d) return false; var h = new Date(), a = h.getFullYear() - d.getFullYear(); if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) a--; return a < 18; }
function mostrarResp() { var tem = ['n-resp', 'n-resp-par', 'n-resp-tel', 'n-resp-cpf'].some(function (id) { return $("#" + id).value.trim(); }); $("#n-resp-card").hidden = !(ehMenor($("#n-nasc").value) || tem); }
function errosCpfsExtras() {
  var e = [], ok = function (v) { var c = String(v || '').replace(/\D/g, ''); return !c || Duplicatas.cpfValido(c); };
  if (!ok($("#n-pag-cpf").value)) e.push('CPF do pagador inválido. Confira os 11 dígitos.');
  if (!ok($("#n-resp-cpf").value)) e.push('CPF do responsável inválido. Confira os 11 dígitos.');
  return e;
}
$("#n-nome").addEventListener('input', function () { dupConfirmada = false; checarDup(); });
["n-cpf", "n-nasc", "n-pagador"].forEach(function (id) { $("#" + id).addEventListener('input', checarDup); });
CAMPOS_N.forEach(function (id) { $("#" + id).addEventListener('input', salvarRascunhoN); $("#" + id).addEventListener('change', salvarRascunhoN); });
$("#c-pac").addEventListener('change', carregarCad);
$("#c-pac").addEventListener('input', function () { if (pacInfo(this.value)) carregarCad(); });
$("#f-pac").addEventListener('submit', function (e) { e.preventDefault(); if (pModo === 'editar') salvarEdicao(); else salvarNovo(false, true); });
$("#p-salvar").addEventListener('click', function () { if (pModo === 'editar') salvarEdicao(); else salvarNovo(false, true); });
$("#p-so-salvar").addEventListener('click', function () { salvarNovo(false, false); });
$("#p-cancelar").addEventListener('click', function () { if (pVoltar) { var v = pVoltar; pVoltar = null; go(v); return; } if (pModo === 'editar') { $("#c-pac").value = ''; cadDados = null; $("#p-form").hidden = true; } else limparFormN(true); });
