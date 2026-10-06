/* ================= PACIENTES (novo paciente + editar cadastro) ================= */
var pModo = 'novo', pVoltar = null, pacIniciado = false, cadNome = '', cadDados = null, dupConfirmada = false, salvandoP = false;
var CAMPOS_N = ["n-nome", "n-cpf", "n-nasc", "n-pagador", "n-whats", "n-prof", "n-mod", "n-conv", "n-cart", "n-indic", "n-primeira"];
var RASCUNHO_N = 'rn-novo-paciente';
var MOD_TABELA = /^Consulta individual|^Por sessão|^Plano de|^Convênio$/i;

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
  preencherSelect($("#c-regra"), BOOT.listas.regras || [], '— (em branco)');
  var sel = $("#n-mod"); sel.innerHTML = '<option value=""></option>'; (BOOT.listas.modalidades || []).forEach(function (m) { var o = document.createElement('option'); o.value = m; o.textContent = m; sel.appendChild(o); });
  $("#p-carregando").hidden = true; $("#p-form").hidden = false; $("#p-rodape").hidden = telaAtual !== 'pacientes';
  $("#p-gestao-campos").hidden = !ehGestao();
  renderCards();
  if (lerRascunhoN()) { toast('Rascunho do cadastro recuperado'); renderCards(); }
  $("#l-cart").hidden = $("#n-conv").value === 'Particular' || !$("#n-conv").value;
}
function setModo(m) {
  pModo = m; seg($("#p-modo"), m);
  var edit = m === 'editar';
  $("#p-busca").hidden = !edit; $("#p-form").hidden = edit && !cadDados;
  $("#p-quem-informou").hidden = !edit;
  $("#p-so-salvar").hidden = edit;
  $("#p-salvar").innerHTML = edit ? 'Salvar cadastro' : 'Salvar e registrar atendimento ' + ic('seta', 16);
  $("#p-rodape-nota").textContent = edit ? 'Atualiza a linha em Pacientes · toda alteração fica em “Alterações de cadastro”, com quem informou' : 'Grava uma linha na aba Pacientes · CPF e nascimento obrigatórios';
  ["n-nome", "n-cpf", "n-nasc"].forEach(function (id) { $("#" + id).readOnly = edit; });
  $("#n-nome-req").hidden = edit; $("#n-cpf-hint").textContent = edit ? 'Só os últimos dígitos, pra conferir. O CPF não muda por aqui.' : 'Da criança também. CPF repetido bloqueia.';
  $("#n-dup").innerHTML = ''; $("#n-erros").innerHTML = ''; $("#n-confirma").innerHTML = ''; $("#n-sucesso").innerHTML = '';
  if (!edit) { cadDados = null; cadNome = ''; limparFormN(false); $("#p-form").hidden = false; renderCards(); }
  else { $("#p-form").hidden = !cadDados; $("#c-pac").focus(); }
}
$$("#p-modo button").forEach(function (b) { b.addEventListener('click', function () { setModo(b.dataset.v); }); });

/* ---------- cartões de modalidade ---------- */
function descMod(m) {
  var prof = $("#n-prof").value, esps = espsDoProf(prof), x = m.toLowerCase();
  // sem profissional escolhido, não chuta preço de outra especialidade: fala só da tabela
  var tipos = AT && prof ? tiposDe(esps) : [], base = tipos.filter(function (p) { return /^(Sessão|Consulta)/.test(p.nome); })[0] || tipos[0];
  var anam = AT && prof ? procsDe(esps).filter(function (p) { return /^Anamnese|^1ª|^Primeira/i.test(p.nome); })[0] : null;
  var preco = function (p) { return p && p.valor != null ? 'R$ ' + (p.valor % 1 ? brl(p.valor) : p.valor) : null; };
  if (/cartão de parceria/.test(x)) { var v = base && AT ? procObj(derivarProc(base.nome, { modalidade: m, regra: '' })) : null; return (preco(v) ? preco(v) + ' por sessão' : 'tabela com desconto') + ' · com o cartão'; }
  if (/^consulta individual/.test(x)) return (anam && preco(anam) ? '1ª consulta ' + preco(anam) + ' · depois ' : '') + (preco(base) ? preco(base) + (anam ? '' : ' por consulta') : 'valor da tabela do procedimento');
  if (/^plano de/.test(x)) { var n = parseInt((m.match(/(\d+)/) || [])[1], 10) || 4, c = AT && prof ? procCompra(n, prof) : null; return n + ' consultas · ' + (preco(c) || 'valor combinado na compra') + ' · vale ' + (n >= 12 ? 6 : n >= 6 ? 3 : 2) + ' meses'; }
  if (x === 'convênio') return 'guia por sessão · fatura no fim do mês';
  if (/^por sessão/.test(x)) return 'valor por sessão definido pela gestão · regra no cadastro';
  if (/^mensalidade fixa/.test(x)) return 'valor mensal fixo · independe do nº de sessões · sem remarcação';
  if (/valor especial/.test(x)) return 'valor mensal combinado pela gestão';
  if (/aapi/.test(x)) return 'mensal pelo convênio AAPI JF';
  if (/pro bono/.test(x)) return 'sem cobrança · a psicóloga ou a gestão decide';
  if (/permuta/.test(x)) return 'troca de serviços · a gestão decide';
  return '';
}
// especialidade de cada modalidade (aba Listas, "Especialidade (modalidade)"); vazio ou "Qualquer especialidade" = vale pra todos
function modDaEsp(m, esps) {
  var x = (BOOT.listas.modalidadesEsp || []).filter(function (y) { return y.nome === m; })[0], e = x ? String(x.esp || '') : '';
  if (!e || /^qualquer/i.test(e) || !esps.length) return true;
  var n = e.toLowerCase(); return esps.some(function (s) { return n.indexOf(s.toLowerCase().split(' ')[0]) >= 0 || s.toLowerCase().indexOf(n.split(' ')[0]) >= 0; });
}
function renderCards() {
  var mods = BOOT.listas.modalidades || [], atual = $("#n-mod").value, tab = $("#n-mods-tabela"), ant = $("#n-mods-antigo");
  tab.innerHTML = ''; ant.innerHTML = '';
  // Novo paciente: profissional primeiro (Roberta, 06/10). Sem profissional, os cartões ficam escondidos; com ele, só os da especialidade dele.
  var prof = $("#n-prof").value, semProf = pModo === 'novo' && !prof, esps = prof ? espsDoProf(prof) : [];
  $("#n-mod-guia").hidden = !semProf; tab.hidden = semProf; ant.hidden = semProf; $("#n-mods-antigo-t").hidden = semProf; $("#n-prof-req").hidden = pModo !== 'novo';
  if (semProf) return;
  if (pModo === 'novo') mods = mods.filter(function (m) { return m === atual || modDaEsp(m, esps); });
  var card = function (m, classe, etiqueta, desab) {
    var on = m === atual;
    var c = el('<label class="cardmod ' + classe + (on ? ' on' : '') + (desab ? ' desab' : '') + '"><span class="nome"><input type="radio" name="mod" value="' + esc(m) + '"' + (on ? ' checked' : '') + (desab ? ' disabled' : '') + '><strong>' + esc(m) + '</strong>' + (etiqueta || '') + '</span><span>' + esc(descMod(m)) + '</span></label>');
    if (!desab) c.querySelector('input').addEventListener('change', function () { $("#n-mod").value = m; renderCards(); onModalidade(); salvarRascunhoN(); });
    return c;
  };
  mods.filter(function (m) { return MOD_TABELA.test(m); }).forEach(function (m) { tab.appendChild(card(m, '')); });
  var restritas = mods.filter(function (m) { return !MOD_TABELA.test(m); });
  if (ehGestao()) restritas.forEach(function (m) { ant.appendChild(card(m, 'antigo', '<span class="tag p lilas">gestão</span>')); });
  else {
    if (atual && restritas.indexOf(atual) >= 0) ant.appendChild(card(atual, 'antigo', '<span class="tag p lilas">atual</span>', true));
    ant.appendChild(el('<div class="cardmod trancado"><span class="nome">' + ic('cadeado', 15, 2.2) + 'Só a gestão</span><span>' + esc(restritas.join(' · ').toLowerCase()) + '</span></div>'));
  }
}
function onModalidade() {
  var m = $("#n-mod").value, w = $("#n-modwarn"); w.innerHTML = '';
  if (MOD_RESTRITA.indexOf(m) >= 0 || /^Pro bono|^Permuta/.test(m)) w.innerHTML = '<div class="faixa lilas">' + ic('info', 20, 2.2) + '<div class="corpo">“' + esc(m) + '” é definida pela gestão. Avise a recepção pelo grupo <b>Nascente | Tratamentos</b> e anote a regra em Observação de cobrança.</div></div>';
}
$("#n-prof").addEventListener('change', function () { if (pModo === 'novo' && $("#n-mod").value && !modDaEsp($("#n-mod").value, espsDoProf(this.value))) { $("#n-mod").value = ''; onModalidade(); } renderCards(); salvarRascunhoN(); });
$("#n-conv").addEventListener('change', function () { $("#l-cart").hidden = this.value === 'Particular' || !this.value; });

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
    else { hint.textContent = 'Da criança também. CPF repetido bloqueia.'; $("#n-cpf").classList.remove('erro'); }
    if ($("#n-dup .faixa.vermelha")) ok = false;
  }
  $("#p-salvar").disabled = !ok; $("#p-so-salvar").disabled = !ok;
}
function dadosN(confirmou) {
  return { nome: $("#n-nome").value, cpf: $("#n-cpf").value, nasc: $("#n-nasc").value, pagador: $("#n-pagador").value, whatsapp: $("#n-whats").value,
    profissional: $("#n-prof").value, modalidade: $("#n-mod").value, convenio: $("#n-conv").value, carteirinha: $("#n-cart").value,
    indicacao: $("#n-indic").value, primeiraConsulta: $("#n-primeira").value, confirmouDuplicata: !!confirmou };
}
function validarN() {
  var e = [];
  if (Duplicatas.tokens($("#n-nome").value).length < 2) e.push('Informe o nome completo.');
  if (!Duplicatas.cpfValido($("#n-cpf").value)) e.push('CPF obrigatório e válido.');
  if (!dataValida($("#n-nasc").value)) e.push('Data de nascimento obrigatória, no formato dd/mm/aaaa.');
  if ($("#n-primeira").value && !dataValida($("#n-primeira").value)) e.push('Data da 1ª consulta inválida.');
  if (!$("#n-prof").value) e.push('Escolha o profissional (a modalidade depende dele).');
  if (!$("#n-mod").value) e.push('Escolha a modalidade.');
  if ($("#n-mod").value === 'Convênio' && $("#n-conv").value === 'Particular') e.push('Modalidade "Convênio": escolha o convênio.');
  return e;
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
    BOOT.pacientes.push({ linha: r.linha, nome: d.nome, cpf: d.cpf, nasc: d.nasc, pagador: d.pagador, modalidade: d.modalidade, convenio: d.convenio, ativo: 'Sim' });
    var novoAT = { linha: r.linha, nome: d.nome, nasc: d.nasc, modalidade: d.modalidade, regra: '', obsCobranca: '', pagador: d.pagador, convenio: d.convenio, valorCombinado: '' };
    if (AT) { AT.pacientes.push(novoAT); var o = document.createElement('option'); o.value = d.nome; $("#dl-pacientes").appendChild(o); }
    limparRascunhoN();
    // gestão: regra, valor combinado e observação de cobrança não entram na criação; vão pela atualização do cadastro (mesma função da tela Editar)
    var extras = ehGestao() ? { regra: $("#c-regra").value, valorCombinado: $("#c-valor").value.trim(), obsCobranca: $("#c-obs").value.trim() } : null;
    var p2 = (extras && (extras.regra || extras.valorCombinado || extras.obsCobranca)) ? call('atualizarCadastro', { nome: d.nome, quemInformou: quemSou() + ' (no cadastro)', campos: extras }).then(function (r2) { if (r2.ok) { novoAT.regra = extras.regra; novoAT.obsCobranca = extras.obsCobranca; novoAT.valorCombinado = extras.valorCombinado; } }) : Promise.resolve();
    return p2.then(function () {
      $("#n-sucesso").innerHTML = aviso('verde', esc(r.nome) + ' cadastrado(a) na linha ' + r.linha + ' de Pacientes', 'Agora cadastre no ControleOdonto. ' + (r.colunasCriadas && r.colunasCriadas.length ? 'Colunas novas criadas na planilha: ' + esc(r.colunasCriadas.join(', ')) + '. ' : ''));
      limparFormN(false); toast('Cadastrado em Pacientes');
      if (registrarDepois || pVoltar === 'registrar') { var v = pVoltar; pVoltar = null; go('registrar', { paciente: d.nome }); if (v !== 'registrar') toast('Agora registre o atendimento de ' + primeiroNome(d.nome)); }
    });
  }).catch(function (e) { banner('Não consegui gravar na planilha (' + e.message + '). Seus dados estão guardados aqui: tente de novo em instantes.'); })
    .finally(function () { salvandoP = false; atualizarBotaoN(); });
}
function limparFormN(apagaSucesso) {
  CAMPOS_N.forEach(function (id) { var e = $("#" + id); if (e.tagName === 'SELECT') e.value = ''; else e.value = ''; });
  if ($("#n-conv").options.length) $("#n-conv").value = 'Particular';
  ["c-regra", "c-valor", "c-obs", "c-quem"].forEach(function (id) { $("#" + id).value = ''; });
  $("#n-dup").innerHTML = ''; $("#n-erros").innerHTML = ''; $("#n-confirma").innerHTML = ''; $("#n-modwarn").innerHTML = ''; $("#n-nome").classList.remove('erro');
  if (apagaSucesso !== false) $("#n-sucesso").innerHTML = '';
  dupConfirmada = false; limparRascunhoN(); renderCards(); $("#l-cart").hidden = true; atualizarBotaoN();
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
    $("#n-indic").value = r.indicacao || ''; $("#n-primeira").value = r.primeira || '';
    $("#n-pagador").value = c.pagador || ''; $("#n-whats").value = c.whats || '';
    setSel($("#n-prof"), c.profRef); setSel($("#n-conv"), c.convenio || 'Particular'); $("#n-cart").value = c.carteirinha || '';
    setSel($("#n-mod"), c.modalidade); setSel($("#c-regra"), c.regra); $("#c-valor").value = c.valorCombinado || ''; $("#c-obs").value = c.obsCobranca || ''; $("#c-quem").value = '';
    $("#l-cart").hidden = !$("#n-conv").value || $("#n-conv").value === 'Particular';
    renderCards(); onModalidade(); $("#p-form").hidden = false; atualizarBotaoN();
  }).catch(function (e) { $("#c-carregando").hidden = true; toast('Erro: ' + e.message); });
}
function salvarEdicao() {
  if (salvandoP) return;
  var nome = cadNome, erros = []; if (!pacInfo(nome) || !cadDados) erros.push('Escolha um paciente da lista.');
  var quem = $("#c-quem").value.trim(); if (!quem) erros.push('Informe quem passou a informação.');
  if ($("#n-mod").value === 'Convênio' && (!$("#n-conv").value || $("#n-conv").value === 'Particular')) erros.push('Modalidade "Convênio": escolha o convênio.');
  if ($("#n-primeira").value && !dataValida($("#n-primeira").value)) erros.push('Data da 1ª consulta inválida.');
  $("#n-erros").innerHTML = erroBox(erros); if (erros.length) return;
  var c0 = cadDados.campos || {};
  var campos = { modalidade: $("#n-mod").value, convenio: $("#n-conv").value, carteirinha: $("#n-cart").value.trim(), pagador: $("#n-pagador").value.trim(), whats: $("#n-whats").value.trim(), profRef: $("#n-prof").value,
    regra: ehGestao() ? $("#c-regra").value : (c0.regra || ''), valorCombinado: ehGestao() ? $("#c-valor").value.trim() : (c0.valorCombinado || ''), obsCobranca: ehGestao() ? $("#c-obs").value.trim() : (c0.obsCobranca || '') };
  salvandoP = true; $("#p-salvar").disabled = true;
  call('atualizarCadastro', { nome: nome, quemInformou: quem, campos: campos }).then(function (r) {
    if (!r.ok) { $("#n-erros").innerHTML = erroBox(r.erros || [], 'Não gravou'); return; }
    [AT && AT.pacientes, BOOT && BOOT.pacientes].forEach(function (l) { (l || []).filter(function (p) { return p.nome === nome; }).forEach(function (p) { p.modalidade = campos.modalidade; p.convenio = campos.convenio; p.regra = campos.regra; p.obsCobranca = campos.obsCobranca; p.valorCombinado = campos.valorCombinado; p.pagador = campos.pagador; }); });
    var mudou = r.alterados && r.alterados.length;
    toast(mudou ? 'Cadastro atualizado' : 'Nada mudou');
    $("#n-sucesso").innerHTML = aviso('verde', esc(nome) + ' · ' + (mudou ? 'cadastro atualizado' : 'nada mudou'), mudou ? 'Alterado: ' + esc(r.alterados.map(function (c) { return c.split(' (')[0]; }).join(', ')) + '. Registrado em “Alterações de cadastro”.' : 'Nenhum campo mudou.');
    if (pVoltar) { var v = pVoltar; pVoltar = null; go(v, { paciente: nome }); }
  }).catch(function (e) { toast('Erro: ' + e.message); }).finally(function () { salvandoP = false; $("#p-salvar").disabled = false; });
}
/* ---------- eventos ---------- */
$("#n-cpf").addEventListener('input', function () { if (pModo === 'novo') this.value = mascaraCPF(this.value); });
$("#n-nasc").addEventListener('input', function () { this.value = mascaraData(this.value); });
$("#n-primeira").addEventListener('input', function () { this.value = mascaraData(this.value); });
$("#n-whats").addEventListener('input', function () { this.value = mascaraFone(this.value); });
$("#n-nome").addEventListener('input', function () { dupConfirmada = false; checarDup(); });
["n-cpf", "n-nasc", "n-pagador"].forEach(function (id) { $("#" + id).addEventListener('input', checarDup); });
CAMPOS_N.forEach(function (id) { $("#" + id).addEventListener('input', salvarRascunhoN); $("#" + id).addEventListener('change', salvarRascunhoN); });
$("#c-pac").addEventListener('change', carregarCad);
$("#c-pac").addEventListener('input', function () { if (pacInfo(this.value)) carregarCad(); });
$("#f-pac").addEventListener('submit', function (e) { e.preventDefault(); if (pModo === 'editar') salvarEdicao(); else salvarNovo(false, true); });
$("#p-salvar").addEventListener('click', function () { if (pModo === 'editar') salvarEdicao(); else salvarNovo(false, true); });
$("#p-so-salvar").addEventListener('click', function () { salvarNovo(false, false); });
$("#p-cancelar").addEventListener('click', function () { if (pVoltar) { var v = pVoltar; pVoltar = null; go(v); return; } if (pModo === 'editar') { $("#c-pac").value = ''; cadDados = null; $("#p-form").hidden = true; } else limparFormN(true); });
