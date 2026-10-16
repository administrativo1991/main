/* ================= FICHA DO PACIENTE (Fase 2, 16/10) =================
   Tudo de um paciente numa tela, só leitura (API.fichaPaciente): contatos e WhatsApp, cobrança por profissional, horários
   fixos e próximos 14 dias, o que está em aberto (a receber, guias, NF), mensalidade/antecipado, sessões das abas de mês,
   mensagens de WhatsApp e alterações de cadastro. Abre pela busca daqui, por Pacientes → Ficha, pelo painel da Agenda,
   pelo Registrar e pela Cobrança do mês. Editar continua em Pacientes; registrar, no Registrar. */
var FI = null, fiNome = '', fiGen = 0, fiComboOk = false;
INICIAR.ficha = function (extra) {
  if (!fiComboOk) { fiComboOk = true; comboPacientes($("#fi-busca"), function () { abrirFicha($("#fi-busca").value.trim()); }); }
  if (extra && extra.nome) { $("#fi-busca").value = extra.nome; abrirFicha(extra.nome); }
  else if (!fiNome) { $("#fi-vazio").hidden = false; $("#fi-corpo").hidden = true; setTimeout(function () { $("#fi-busca").focus(); }, 50); }
};
function abrirFicha(nome) {
  if (!nome) return; fiNome = nome; var gen = ++fiGen;
  $("#fi-vazio").hidden = true; $("#fi-corpo").hidden = true; $("#fi-carregando").hidden = false;
  call('fichaPaciente', { nome: nome }).then(function (r) {
    if (!aindaNa('ficha', navGen) || gen !== fiGen) return;
    $("#fi-carregando").hidden = true;
    if (!r.ok) { $("#fi-vazio").hidden = false; $("#fi-vazio").innerHTML = erroBox(r.erros || ['Não encontrei.'], 'Ficha'); return; }
    FI = r; renderFicha();
  }).catch(function (e) { if (gen !== fiGen) return; $("#fi-carregando").hidden = true; $("#fi-vazio").hidden = false; $("#fi-vazio").textContent = 'Não consegui carregar: ' + e.message; });
}
function fiItem(esq, dir, tag) { return '<div class="fd-item">' + esq + '<span class="esp"></span>' + (tag || '') + (dir || '') + '</div>'; }
function fiLista(id, itens, html, vazio) { $("#" + id).innerHTML = itens.length ? itens.map(html).join('') : '<div class="muted">' + vazio + '</div>'; }
function renderFicha() {
  var r = FI, p = r.paciente, rs = function (n) { return brlCurto(n || 0); };
  $("#fi-nome").textContent = p.nome; document.title = p.nome + ' · Ficha';
  var sub = []; if (p.nasc) { var i = idade(p.nasc); sub.push((i ? i + ' · ' : '') + 'nasc. ' + p.nasc); } sub.push(p.convenio || 'Particular'); if (/^n/i.test(p.ativo || 'Sim')) sub.push('INATIVO'); if (p.cpfFinal) sub.push('CPF ···' + p.cpfFinal);
  $("#fi-sub").textContent = sub.join(' · ');
  var zap = p.fone ? '<a class="btn sec mini" target="_blank" rel="noopener" href="' + esc(Mensagens.linkWhats(p.fone, '')) + '">' + ic('send', 13, 2.4) + ' ' + esc(p.foneFmt) + '</a>' + (p.foneDe !== 'pagador' ? ' <span class="muted">(telefone do ' + esc(p.foneDe) + ')</span>' : '') : '<span class="tag laranja">sem WhatsApp</span>';
  if (p.fixoFmt) zap += ' <span class="muted">· fixo (ligar):</span> ' + esc(p.fixoFmt);
  $("#fi-contatos").innerHTML = '<div><span class="muted">Quem paga</span> <b>' + esc(p.pagador || p.nome) + '</b> · ' + zap + '</div>' + (p.resp ? '<div><span class="muted">Responsável</span> ' + esc(p.resp + (p.respPar ? ' (' + p.respPar + ')' : '')) + (p.respTel ? ' · ' + esc(p.respTel) : '') + '</div>' : '') + (p.telPac ? '<div><span class="muted">Telefone do paciente</span> ' + esc(p.telPac) + '</div>' : '');
  $("#fi-obs").innerHTML = p.obsCobranca ? '<div class="faixa nota">' + esc(p.obsCobranca) + '</div>' : '';
  var ac = $("#fi-acoes"); ac.innerHTML = '';
  [['Registrar atendimento', function () { go('registrar', { paciente: p.nome }); }, 'btn mini'], ['Editar cadastro', function () { go('pacientes', { editar: p.nome, voltar: 'ficha' }); }, 'btn ter mini'], ['Cobrança do mês', function () { go('cobranca', { buscar: p.nome }); }, 'btn ter mini']].forEach(function (x) { var b = el('<button type="button" class="' + x[2] + '">' + esc(x[0]) + '</button>'); b.addEventListener('click', x[1]); ac.appendChild(b); });
  // resumo
  var receber = r.aberto.filter(function (x) { return x.tipo === 'receber'; }), totR = receber.reduce(function (a, x) { return a + (x.r.saldo || 0); }, 0);
  var atend = r.sessoes.filter(function (x) { return /^Atendido/.test(x.oque); }).length, faltas = r.sessoes.filter(function (x) { return /^(Faltou|Desmarcou)/.test(x.oque); }).length;
  $("#fi-resumo").innerHTML = '<div class="' + (totR ? 'atencao' : '') + '"><b>' + esc(rs(totR)) + '</b><span>a receber</span></div><div><b>' + r.aberto.filter(function (x) { return x.tipo === 'guia'; }).length + '</b><span>guias a assinar</span></div><div><b>' + (r.ultimaVez ? esc(r.ultimaVez.data.slice(0, 5)) : '—') + '</b><span>última vez' + (r.ultimaVez ? ' · ' + esc(profCurto(r.ultimaVez.profissional)) : '') + '</span></div><div><b>' + atend + '</b><span>atendimentos (abas de mês)</span></div><div><b>' + faltas + '</b><span>faltas e desmarcações</span></div>';
  // em aberto
  var rot = { receber: ['a receber', 'amarela'], guia: ['guia a assinar', 'lilas'], nf: ['NF a emitir', 'laranja'], acordo: ['no parcelamento (em dia)', 'lilas'] };
  $("#fi-n-aberto").textContent = r.aberto.length;
  fiLista('fi-aberto', r.aberto, function (x) { return fiItem('<span class="quem">' + esc(x.r.data.slice(0, 5)) + '</span><span class="muted">' + esc(profCurto(x.r.profissional) + ' · ' + (x.r.procedimento || '')) + '</span>', x.tipo !== 'guia' && x.r.saldo ? '<b>' + esc(rs(x.tipo === 'nf' ? x.r.valor : x.r.saldo)) + '</b>' : '', '<span class="tag ' + rot[x.tipo][1] + '">' + rot[x.tipo][0] + '</span>'); }, 'Nada em aberto.');
  // sessões
  $("#fi-n-sessoes").textContent = r.totalSessoes > r.sessoes.length ? 'as ' + r.sessoes.length + ' mais recentes de ' + r.totalSessoes : r.totalSessoes + ' no ano';
  $("#fi-sessoes").innerHTML = r.sessoes.length ? r.sessoes.map(function (x) { var falta = !/^Atendido/.test(x.oque); return '<tr' + (falta ? ' class="apagada"' : '') + '><td>' + esc(x.data.slice(0, 5) + (x.hora ? ' ' + x.hora : '')) + '</td><td>' + esc(profCurto(x.profissional)) + '<div class="sub">' + esc(x.procedimento) + '</div></td><td>' + esc(x.oque.split(' (')[0]) + (x.decisao ? ' · gestão: ' + esc(x.decisao) : '') + '<div class="sub">' + esc((x.valor ? rs(x.valor) + ' · ' : '') + (x.pago || 'Pago? vazio') + (x.pago === 'Parcial' ? ' · falta ' + rs(x.saldo) : '')) + '</div></td></tr>'; }).join('') : '<tr><td colspan="3" class="muted">Nenhuma sessão nas abas de mês.</td></tr>';
  // próximos e horários fixos
  fiLista('fi-proximos', r.proximos, function (x) { var st = x.registrado ? '<span class="tag verde">' + esc(x.registrado.split(' (')[0]) + '</span>' : x.naoVem ? '<span class="tag vermelha">não vem</span>' : x.confirmado ? '<span class="tag verde">confirmado</span>' : '<span class="tag cinza">a confirmar</span>'; return fiItem('<span class="quem">' + esc(x.diaSemana.slice(0, 3).toLowerCase() + ' ' + x.data.slice(0, 5) + (x.hora ? ' · ' + x.hora : '')) + '</span><span class="muted">' + esc(profCurto(x.profissional) + (x.tipo ? ' · ' + x.tipo.toLowerCase() : '')) + '</span>', '', st); }, 'Nada agendado nos próximos 14 dias.');
  $("#fi-fixos").textContent = r.fixos.length ? 'Horário fixo: ' + r.fixos.map(function (x) { return x.dia.toLowerCase() + ' ' + x.hora + ' com ' + profCurto(x.profissional) + (/quinzen/i.test(x.frequencia) ? ' (quinzenal)' : '') + (x.tipo ? ' · ' + x.tipo.toLowerCase() : ''); }).join(' · ') : 'Sem horário fixo.';
  // cobrança por profissional
  fiLista('fi-cobrancas', r.cobrancas.slice().sort(function (a, b) { return (b.vigente ? 1 : 0) - (a.vigente ? 1 : 0); }), function (x) { return '<div class="fd-item' + (x.vigente ? '' : ' fi-off') + '"><span>' + esc(x.resumo) + (x.obs ? '<div class="sub">' + esc(x.obs) + '</div>' : '') + '</span><span class="esp"></span>' + (x.vigente ? '<span class="tag verde">vale hoje</span>' : '<span class="tag cinza">' + esc(!/^s/i.test(x.ativo || 'Sim') ? 'inativa' : x.desde ? 'a partir de ' + x.desde : x.ate ? 'até ' + x.ate : 'não vale hoje') + '</span>') + '</div>'; }, 'Sem cobrança cadastrada: cobra pela tabela. Avise a gestão.');
  // mensalidade / antecipado
  $("#fi-mensal-card").hidden = !r.mensal.length;
  fiLista('fi-mensal', r.mensal, function (x) { return fiItem('<span class="quem">' + esc(x.chave) + '</span><span class="muted">' + esc(profCurto(x.profissional)) + '</span>', x.pago ? '<span class="muted">' + esc((x.data || '') + (x.forma ? ' · ' + x.forma : '')) + '</span>' : '', '<span class="tag ' + (COR_FAIXA[x.cor] || 'cinza') + '">' + esc(x.situacao) + '</span>'); }, '');
  // mensagens e alterações
  fiLista('fi-msgs', r.mensagens, function (x) { return fiItem('<span class="quem">' + esc(String(x.quando).slice(0, 16)) + '</span><span class="muted">' + esc(x.tipo + (x.sessao ? ' · sessão ' + String(x.sessao).slice(0, 5) : '') + (x.competencia ? ' · ' + x.competencia : '') + (x.valor ? ' · ' + rs(x.valor) : '')) + '</span>', '<span class="muted">' + esc(x.por) + '</span>'); }, 'Nenhuma mensagem pelo app ainda.');
  fiLista('fi-alts', r.alteracoes, function (x) { return '<div class="fd-item"><span class="quem">' + esc(String(x.quando).slice(0, 10)) + '</span><span>' + esc(x.campo) + ': <span class="muted">' + esc(x.de || '(vazio)') + '</span> → <b>' + esc(x.para) + '</b><div class="sub">' + esc(x.quem) + '</div></span></div>'; }, 'Nenhuma alteração registrada.');
  if (typeof renderParcFicha === 'function') renderParcFicha();
  $("#fi-corpo").hidden = false;
}
