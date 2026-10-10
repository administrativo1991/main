/* ================= PACIENTES (novo paciente + editar cadastro) ================= */
var pModo = 'novo', pVoltar = null, pacIniciado = false, cadNome = '', cadDados = null, dupConfirmada = false, salvandoP = false;
var CAMPOS_N = ["n-nome", "n-cpf", "n-nasc", "n-tel-pac", "n-pagador", "n-whats", "n-prof", "n-mod", "n-valor-num", "n-pct-n", "n-pct-v", "n-pagamento", "n-conv", "n-cart", "n-indic", "n-primeira", "n-pag-cpf", "n-resp", "n-resp-par", "n-resp-tel", "n-resp-cpf"];
var RASCUNHO_N = 'rn-novo-paciente';
var pagManual = false; // Pagamento mudado à mão (ou já gravado): a sugestão pela cobrança não sobrescreve
// convênios de desconto (gestão, 07/10): o paciente paga particular com desconto, então os cartões de modalidade continuam.
// Os demais convênios são de plano: a modalidade é sempre "Convênio" e os cartões somem. Convênio de desconto novo: acrescentar aqui.
var CONVENIOS_DESCONTO = ['AAPI JF', 'Plan Minas'];
function convenioDePlano(c) { return !!(c && c !== 'Particular' && CONVENIOS_DESCONTO.indexOf(c) < 0); }

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
  preencherSelect($("#n-pagamento"), (BOOT.listas.pagamentos && BOOT.listas.pagamentos.length ? BOOT.listas.pagamentos : PAGAMENTOS), '—');
  var sel = $("#n-mod"); sel.innerHTML = '<option value=""></option>'; listaCobrancas().forEach(function (m) { var o = document.createElement('option'); o.value = m; o.textContent = m; sel.appendChild(o); });
  $("#p-carregando").hidden = true; $("#p-form").hidden = false; $("#p-rodape").hidden = telaAtual !== 'pacientes';
  $("#p-gestao-campos").hidden = !ehGestao();
  renderCards();
  if (lerRascunhoN()) { toast('Rascunho do cadastro recuperado'); renderCards(); }
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
  if (!edit) { cadDados = null; cadNome = ''; limparFormN(false); $("#p-form").hidden = false; renderCards(); }
  else { $("#p-form").hidden = !cadDados; $("#c-pac").focus(); }
}
$$("#p-modo button").forEach(function (b) { b.addEventListener('click', function () { setModo(b.dataset.v); }); });

/* ---------- cartões de modalidade ---------- */
function listaCobrancas() { var l = (BOOT.listas.modalidades || []).filter(function (m) { return COBRANCAS.indexOf(m) >= 0; }); return l.length ? l : COBRANCAS.slice(); }
function descMod(m) {
  var prof = $("#n-prof").value, esps = espsDoProf(prof);
  // sem profissional escolhido, não chuta preço de outra especialidade: fala só da tabela
  var tipos = AT && prof ? tiposDe(esps) : [], base = tipos.filter(function (p) { return /^(Sessão|Consulta)/.test(p.nome); })[0] || tipos[0];
  var anam = AT && prof ? procsDe(esps).filter(function (p) { return /^Anamnese|^1ª|^Primeira/i.test(p.nome); })[0] : null;
  var preco = function (p) { return p && p.valor != null ? 'R$ ' + (p.valor % 1 ? brl(p.valor) : p.valor) : null; };
  if (m === 'Tabela') return (anam && preco(anam) ? '1ª consulta ' + preco(anam) + ' · depois ' : '') + (preco(base) ? preco(base) + (anam ? '' : ' por sessão') : 'valor da tabela · clínica médica, pediatria e outras especialidades');
  if (m === 'Por sessão (combinado)') return 'valor por sessão combinado com a psicóloga ou a gestão · informe abaixo';
  if (PACOTES_PADRAO[m]) return PACOTES_PADRAO[m].n + ' sessões por R$ ' + PACOTES_PADRAO[m].valor + ' · pago adiantado';
  if (m === 'Mensalidade social') return 'R$ ' + MENSALIDADE_SOCIAL + ' por mês · não conta sessões';
  if (m === 'Mensalidade especial') return 'valor fixo do mês combinado (ex.: R$ 150, R$ 120 quinzenal) · informe abaixo';
  if (m === 'Convênio') return 'guia por sessão · fatura no fim do mês';
  if (m === 'Pro bono') return 'sem cobrança · a psicóloga ou a gestão decide';
  if (m === 'Permuta') return 'troca de serviços · sem cobrança';
  return '';
}
// especialidade de cada modalidade (aba Listas, "Especialidade (modalidade)"); vazio ou "Qualquer especialidade" = vale pra todos
function modDaEsp(m, esps) {
  var x = (BOOT.listas.modalidadesEsp || []).filter(function (y) { return y.nome === m; })[0], e = x ? String(x.esp || '') : '';
  if (!e || /^qualquer/i.test(e) || !esps.length) return true;
  var n = e.toLowerCase(); return esps.some(function (s) { return n.indexOf(s.toLowerCase().split(' ')[0]) >= 0 || s.toLowerCase().indexOf(n.split(' ')[0]) >= 0; });
}
function renderCards() {
  var mods = listaCobrancas(), atual = $("#n-mod").value, tab = $("#n-mods-tabela"), ant = $("#n-mods-antigo");
  tab.innerHTML = ''; ant.innerHTML = '';
  // Profissional é opcional (gestão, 08/10: paciente pode ser atendido por mais de um). Sem profissional, mostra todas as modalidades; com ele, só as da especialidade dele.
  var prof = $("#n-prof").value, semProf = false, esps = prof ? espsDoProf(prof) : [];
  var conv = $("#n-conv").value, plano = convenioDePlano(conv);
  if (plano) { if ($("#n-mod").value !== 'Convênio') { $("#n-mod").value = 'Convênio'; atual = 'Convênio'; onModalidade(); } } // convênio de plano: modalidade é sempre Convênio
  else if (atual === 'Convênio' && pModo === 'novo') { $("#n-mod").value = ''; atual = ''; } // paciente novo voltou pra particular/desconto: escolher de novo (no editar, mantém o que está gravado)
  var esconde = semProf || plano;
  $("#n-mod-guia").textContent = plano ? 'Convênio ' + conv + ': a cobrança fica “Convênio” (o convênio paga). Só preencher a carteirinha.' : 'Escolha o profissional: a cobrança diz como cobra, o profissional diz qual tabela.';
  $("#n-mod-guia").hidden = !esconde; tab.hidden = esconde; ant.hidden = esconde; $("#n-mods-antigo-t").hidden = esconde; $("#n-prof-req").hidden = true;
  if (esconde) { mostrarCamposCob(); return; }
  if (pModo === 'novo') mods = mods.filter(function (m) { return m === atual || modDaEsp(m, esps); });
  var card = function (m, classe, etiqueta, desab) {
    var on = m === atual;
    var c = el('<label class="cardmod ' + classe + (on ? ' on' : '') + (desab ? ' desab' : '') + '"><span class="nome"><input type="radio" name="mod" value="' + esc(m) + '"' + (on ? ' checked' : '') + (desab ? ' disabled' : '') + '><strong>' + esc(m) + '</strong>' + (etiqueta || '') + '</span><span>' + esc(descMod(m)) + '</span></label>');
    if (!desab) c.querySelector('input').addEventListener('change', function () { $("#n-mod").value = m; renderCards(); onModalidade(); salvarRascunhoN(); });
    return c;
  };
  // gestão, 09/10: a recepção escolhe qualquer cobrança (a Juliana passa o valor)
  if (atual && mods.indexOf(atual) < 0) tab.appendChild(card(atual, '', '<span class="tag p lilas">atual</span>'));
  mods.forEach(function (m) { tab.appendChild(card(m, '')); });
  ant.hidden = true; $("#n-mods-antigo-t").hidden = true;
}
// campos da cobrança: valor combinado (Por sessão), sessões e valor (pacotes) e Pagamento sugerido pela cobrança
function mostrarCamposCob() {
  var m = $("#n-mod").value, pad = PACOTES_PADRAO[m], vn = $("#n-valor-num");
  $("#l-valor-num").hidden = !/^(Por sessão \(combinado\)|Mensalidade social|Mensalidade especial)$/.test(m);
  $("#n-valor-txt").textContent = /^Mensalidade/.test(m) ? 'Valor da mensalidade (por mês)' : 'Valor combinado por sessão';
  vn.readOnly = m === 'Mensalidade social';
  if (m === 'Mensalidade social') vn.value = brl(MENSALIDADE_SOCIAL); else if (vn.dataset.social === '1') vn.value = '';
  vn.dataset.social = m === 'Mensalidade social' ? '1' : '';
  $("#l-pct-n").hidden = $("#l-pct-v").hidden = !pad;
  $("#n-pct-n").readOnly = true; $("#n-pct-v").readOnly = true;
  if (pad) { $("#n-pct-n").value = pad.n; $("#n-pct-v").value = brl(pad.valor); } // pacote 4 / 12: nº e valor automáticos (gestão, 09/10)
  $("#n-pag-leg").textContent = m && PAG_SUGERIDO[m] ? (pagManual && $("#n-pagamento").value !== PAG_SUGERIDO[m] ? 'mudado à mão (sugerido: ' + PAG_SUGERIDO[m] + ')' : 'sugerido pela cobrança · pode mudar') : 'quando paga';
}
function onModalidade() {
  var m = $("#n-mod").value, w = $("#n-modwarn"); w.innerHTML = '';
  if (m && !pagManual && PAG_SUGERIDO[m]) $("#n-pagamento").value = PAG_SUGERIDO[m];
  mostrarCamposCob();
}
$("#n-pagamento").addEventListener('change', function () { pagManual = true; mostrarCamposCob(); salvarRascunhoN(); });
$("#n-prof").addEventListener('change', function () { if (pModo === 'novo' && $("#n-mod").value && !modDaEsp($("#n-mod").value, espsDoProf(this.value))) { $("#n-mod").value = ''; onModalidade(); } renderCards(); salvarRascunhoN(); });
$("#n-conv").addEventListener('change', function () { $("#l-cart").hidden = this.value === 'Particular' || !this.value; renderCards(); onModalidade(); salvarRascunhoN(); });

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
    profissional: $("#n-prof").value, modalidade: $("#n-mod").value, pagamento: $("#n-pagamento").value, valorNum: $("#l-valor-num").hidden ? '' : $("#n-valor-num").value.trim(), pctN: $("#l-pct-n").hidden ? '' : $("#n-pct-n").value.trim(), pctV: $("#l-pct-v").hidden ? '' : $("#n-pct-v").value.trim(), convenio: $("#n-conv").value, carteirinha: $("#n-cart").value,
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
  // cobrança em branco é aceita (vira Tabela, com aviso "completar cadastro"); valor combinado em branco = a definir
  return e.concat(errosCob(), errosCpfsExtras());
}
function errosCob() {
  var e = [], m = $("#n-mod").value;
  if (m === 'Convênio' && (!$("#n-conv").value || $("#n-conv").value === 'Particular')) e.push('Cobrança "Convênio": escolha o convênio.');
  var vtx = $("#n-valor-num").value.trim(); if (/^(Por sessão \(combinado\)|Mensalidade especial)$/.test(m) && vtx && !/^a definir$/i.test(vtx) && !(num(vtx) > 0)) e.push('Valor combinado: use só o número (ex.: 90) ou deixe em branco se ainda está a definir.');
  if (m && !$("#n-pagamento").value) e.push('Escolha o Pagamento (quando paga).');
  return e;
}
function cobDoForm() { return { modalidade: $("#n-mod").value, pagamento: $("#n-pagamento").value, valorNum: $("#l-valor-num").hidden ? '' : num($("#n-valor-num").value), pctN: $("#l-pct-n").hidden ? '' : num($("#n-pct-n").value), pctV: $("#l-pct-v").hidden ? '' : num($("#n-pct-v").value) }; }
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
    var cf = cobDoForm(), novoAT = { linha: r.linha, nome: d.nome, cpf: d.cpf, nasc: d.nasc, modalidade: d.modalidade, pagamento: cf.pagamento, valorNum: cf.valorNum === '' ? null : cf.valorNum, pctN: cf.pctN === '' ? null : cf.pctN, pctV: cf.pctV === '' ? null : cf.pctV, regra: '', obsCobranca: '', pagador: d.pagador, convenio: d.convenio, valorCombinado: '' };
    if (AT) { AT.pacientes.push(novoAT); var o = document.createElement('option'); o.value = d.nome; $("#dl-pacientes").appendChild(o); }
    limparRascunhoN();
    // gestão: a observação de cobrança não entra na criação; vai pela atualização do cadastro (mesma função da tela Editar)
    var extras = ehGestao() ? { obsCobranca: $("#c-obs").value.trim() } : null;
    var p2 = (extras && extras.obsCobranca) ? call('atualizarCadastro', { nome: d.nome, quemInformou: quemSou() + ' (no cadastro)', campos: extras }).then(function (r2) { if (r2.ok) { novoAT.obsCobranca = extras.obsCobranca; } }) : Promise.resolve();
    return p2.then(function () {
      $("#n-sucesso").innerHTML = (faltasDoc(novoAT).length ? aviso('laranja', 'Falta ' + esc(faltasDocTxt(novoAT)), 'Peça o documento e complete em Pacientes → Editar cadastro.') : '') + aviso('verde', esc(r.nome) + ' cadastrado(a) na linha ' + r.linha + ' de Pacientes', 'Agora cadastre no ControleOdonto. ' + (r.colunasCriadas && r.colunasCriadas.length ? 'Colunas novas criadas na planilha: ' + esc(r.colunasCriadas.join(', ')) + '. ' : ''));
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
  ["c-regra", "c-valor", "c-obs", "c-quem"].forEach(function (id) { $("#" + id).value = ''; });
  $("#n-dup").innerHTML = ''; $("#n-erros").innerHTML = ''; $("#n-confirma").innerHTML = ''; $("#n-modwarn").innerHTML = ''; $("#n-nome").classList.remove('erro');
  if (apagaSucesso !== false) $("#n-sucesso").innerHTML = '';
  dupConfirmada = false; pagManual = false; limparRascunhoN(); renderCards(); mostrarCamposCob(); $("#l-cart").hidden = true; atualizarBotaoN();
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
    // nome antigo (antes de 09/10) aparece como o novo; só grava a troca se salvar
    setSel($("#n-mod"), !c.modalidade || COBRANCAS.indexOf(c.modalidade) >= 0 ? c.modalidade : (cobDe({ modalidade: c.modalidade, pctN: c.pctN, convenio: c.convenio, valorNum: c.valorNum }) || c.modalidade)); setSel($("#c-regra"), c.regra);
    var pac0 = pacInfo(r.nome) || {}; setSel($("#n-pagamento"), c.pagamento || ''); pagManual = !!c.pagamento;
    // o servidor manda o número como texto ("70.5"): ponto decimal, sem milhar
    var nSrv = function (v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? null : n; };
    var vc0 = nSrv(c.valorNum) != null ? nSrv(c.valorNum) : valorComb(pac0); $("#n-valor-num").value = vc0 != null ? brl(vc0) : '';
    $("#n-pct-n").value = nSrv(c.pctN) != null ? nSrv(c.pctN) : ''; $("#n-pct-v").value = nSrv(c.pctV) != null ? brl(nSrv(c.pctV)) : ''; $("#c-valor").value = c.valorCombinado || ''; $("#c-obs").value = c.obsCobranca || ''; $("#c-quem").value = '';
    $("#l-cart").hidden = !$("#n-conv").value || $("#n-conv").value === 'Particular';
    renderCards(); onModalidade(); mostrarResp(); $("#p-form").hidden = false; atualizarBotaoN();
  }).catch(function (e) { $("#c-carregando").hidden = true; toast('Erro: ' + e.message); });
}
function salvarEdicao() {
  if (salvandoP) return;
  var nome = cadNome, erros = []; if (!pacInfo(nome) || !cadDados) erros.push('Escolha um paciente da lista.');
  var quem = $("#c-quem").value.trim(); if (!quem) erros.push('Informe quem passou a informação.');
  erros = erros.concat(errosCob());
  var cpfC = !$("#n-cpf").readOnly ? $("#n-cpf").value.trim() : '', nascC = !$("#n-nasc").readOnly ? $("#n-nasc").value.trim() : '';
  if (cpfC && !Duplicatas.cpfValido(cpfC)) erros.push('CPF inválido: confira os 11 dígitos.');
  if (nascC && !dataValida(nascC)) erros.push('Data de nascimento inválida (dd/mm/aaaa).');
  if ($("#n-primeira").value && !dataValida($("#n-primeira").value)) erros.push('Data da 1ª consulta inválida.');
  erros = erros.concat(errosCpfsExtras());
  $("#n-erros").innerHTML = erroBox(erros); if (erros.length) return;
  var c0 = cadDados.campos || {};
  var cf = cobDoForm();
  var campos = { cpf: cpfC || null, nasc: nascC || null, modalidade: cf.modalidade, pagamento: cf.pagamento, valorNum: cf.valorNum, pctN: cf.pctN, pctV: cf.pctV, convenio: $("#n-conv").value, carteirinha: $("#n-cart").value.trim(), pagador: $("#n-pagador").value.trim(), whats: $("#n-whats").value.trim(), telPac: $("#n-tel-pac").value.trim(), profRef: $("#n-prof").value,
    obsCobranca: ehGestao() ? $("#c-obs").value.trim() : (c0.obsCobranca || ''),
    pagadorCpf: $("#n-pag-cpf").value.trim(), respNome: $("#n-resp").value.trim(), respPar: $("#n-resp-par").value.trim(), respTel: $("#n-resp-tel").value.trim(), respCpf: $("#n-resp-cpf").value.trim() };
  salvandoP = true; $("#p-salvar").disabled = true;
  call('atualizarCadastro', { nome: nome, quemInformou: quem, campos: campos }).then(function (r) {
    if (!r.ok) { $("#n-erros").innerHTML = erroBox(r.erros || [], 'Não gravou'); return; }
    [AT && AT.pacientes, BOOT && BOOT.pacientes].forEach(function (l) { (l || []).filter(function (p) { return p.nome === nome; }).forEach(function (p) { if (cpfC) p.cpf = cpfC; if (nascC) p.nasc = nascC; p.modalidade = campos.modalidade; p.pagamento = campos.pagamento; p.valorNum = campos.valorNum === '' ? null : campos.valorNum; p.pctN = campos.pctN === '' ? null : campos.pctN; p.pctV = campos.pctV === '' ? null : campos.pctV; p.convenio = campos.convenio; p.obsCobranca = campos.obsCobranca; p.pagador = campos.pagador; p.telPac = campos.telPac; p.resp = campos.respNome; p.respPar = campos.respPar; p.respTel = campos.respTel; }); });
    var mudou = r.alterados && r.alterados.length;
    toast(mudou ? 'Cadastro atualizado' : 'Nada mudou');
    $("#n-sucesso").innerHTML = aviso('verde', esc(nome) + ' · ' + (mudou ? 'cadastro atualizado' : 'nada mudou'), mudou ? 'Alterado: ' + esc(r.alterados.map(function (c) { return c.split(' (')[0]; }).join(', ')) + '. Registrado em “Alterações de cadastro”.' : 'Nenhum campo mudou.');
    var voltar = function () { if (pVoltar) { var v = pVoltar; pVoltar = null; go(v, { paciente: nome }); } };
    // mudou convênio ou cobrança (gestão): o passado não muda; pergunta só pelas linhas do mês aberto de hoje em diante
    if (ehGestao() && mudou && r.alterados.some(function (c) { return c === 'Convênio' || c === 'Cobrança'; })) perguntarLinhasAbertas(nome, voltar); else voltar();
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
