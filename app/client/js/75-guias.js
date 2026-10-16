/* ================= GUIAS LIDAS PELA IA (16/10) =================
   O gatilho diário lê os PDFs da pasta GUIAS DE CONVÊNIOS e grava a SUGESTÃO na aba Guias lidas. Aqui a recepção (e a gestão)
   confirma com um clique: Confirmar grava Guia assinada? = Sim, Nº da guia e Link da guia na(s) linha(s); Escolher outra linha
   abre as sessões de convênio do paciente; Não é guia / ignorar tira da lista. Usado pelo Meu dia (card "Guias lidas ontem") e
   pelas Pendências (card "Guias a conferir", gestão). Nada de alert/confirm nativo: dois cliques e toast. */
var GUIAS = null, guiasGen = 0;
function carregarGuias(depois) {
  var gen = ++guiasGen;
  return call('guiasLidas', {}).then(function (r) { if (gen !== guiasGen) return null; GUIAS = r && r.ok ? r : { itens: [], ontem: 0, ia: {} }; if (depois) depois(GUIAS); return GUIAS; }).catch(function (e) { if (gen !== guiasGen) return null; GUIAS = { itens: [], ontem: 0, ia: { mensagem: 'não consegui ler as guias: ' + e.message }, erro: true }; if (depois) depois(GUIAS); return GUIAS; });
}
function guiaStatusTxt(st) { return { lida: 'sugestão pronta', sem_atendimento: 'guia sem atendimento registrado', baixa_confianca: 'conferir (baixa confiança)', nao_e_guia: 'o app não viu uma guia', erro: 'erro na leitura' }[st] || st; }
function linhaTxt(l) { return l.data + (l.hora ? ' ' + l.hora : '') + ' · ' + profCurto(l.profissional) + (l.guia === 'Sim' ? ' · já assinada' : ''); }
// um item do card: miniatura/link · o que foi lido · linha(s) sugerida(s) · ações
function guiaItemEl(it, aoMudar) {
  var lido = it.lido || {}, sug = it.sugestao || { linhas: [] }, baixa = it.status === 'baixa_confianca' || it.status === 'nao_e_guia', semLinha = !sug.linhas.length;
  var cor = baixa ? ' laranja' : it.status === 'sem_atendimento' ? ' vermelha' : '';
  var lidoHtml = '<b>' + esc(lido.nome || '(nome não lido)') + '</b>' + (sug.paciente && sug.paciente !== lido.nome ? ' <span class="muted">→ ' + esc(sug.paciente) + (sug.como ? ' (' + esc(sug.como) + ')' : '') + '</span>' : '') +
    '<div class="sub">' + esc([it.convenio, lido.numero ? 'guia nº ' + lido.numero : 'nº não lido', lido.carteirinha ? 'carteirinha ' + lido.carteirinha : '', lido.datas && lido.datas.length ? (lido.datas.length > 1 ? lido.datas.length + ' datas: ' : '') + lido.datas.join(', ') : 'sem data', lido.procedimento ? lido.procedimento + (lido.quantidade > 1 ? ' ×' + lido.quantidade : '') : '', lido.assinatura ? 'assinatura ok' : 'SEM assinatura visível', lido.legibilidade && lido.legibilidade !== 'boa' ? 'leitura ' + lido.legibilidade : ''].filter(Boolean).join(' · ')) + '</div>' +
    (it.motivos ? '<div class="sub motivos">' + ic('alerta', 12, 2.6) + ' ' + esc(it.motivos) + '</div>' : '') + (lido.observacao ? '<div class="sub">' + esc(lido.observacao) + '</div>' : '');
  var sugHtml = semLinha ? '<div class="gl-sem">' + esc(it.status === 'nao_e_guia' ? 'não parece uma guia: ignorar?' : 'nenhuma sessão de convênio registrada nessas datas: a sessão não foi lançada, ou nome/data não bateram') + '</div>' :
    '<div class="gl-sug-t">' + (sug.linhas.length === 1 ? 'linha sugerida' : sug.linhas.length + ' linhas sugeridas (guia de várias sessões)') + '</div>' + sug.linhas.map(function (l, i) { return '<label class="check"><input type="checkbox" data-l="' + i + '" checked> <span>' + esc(linhaTxt(l)) + ' <small class="muted">' + esc(l.aba) + '</small></span></label>'; }).join('');
  var cart = lido.carteirinha && sug.paciente ? '<label class="check"><input type="checkbox" data-cart checked> <span>gravar a carteirinha ' + esc(lido.carteirinha) + ' no cadastro de ' + esc(primeiroNome(sug.paciente)) + ' (se estiver vazio)</span></label>' : '';
  var row = el('<div class="gl-item' + cor + '" data-id="' + esc(it.id) + '"><a class="gl-thumb" href="' + esc(it.link) + '" target="_blank" rel="noopener" title="Abrir o PDF"><img src="' + esc(it.miniatura) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'"><span>' + esc(it.nome) + '</span></a>' +
    '<div class="gl-lido"><div class="gl-st">' + esc(guiaStatusTxt(it.status)) + ' <small class="muted">· lida ' + esc(String(it.lidaEm || '').slice(0, 16)) + '</small></div>' + lidoHtml + '</div>' +
    '<div class="gl-sug">' + sugHtml + '<div class="gl-outras" hidden></div>' + cart + '<div class="gl-erro"></div></div>' +
    '<div class="gl-acoes"><button type="button" class="btn mini" data-conf' + (semLinha ? ' disabled' : '') + '>Confirmar</button><button type="button" class="btn ter mini" data-outra>Escolher outra linha</button>' + (semLinha && it.status !== 'nao_e_guia' && sug.paciente ? '<button type="button" class="btn ter mini" data-lancar>Lançar a sessão</button>' : '') + '<button type="button" class="btn link mini" data-ign>' + (it.status === 'nao_e_guia' ? 'Não é guia' : 'Não é guia / ignorar') + '</button></div></div>');
  var outras = $('.gl-outras', row), bOutra = $('[data-outra]', row), bConf = $('[data-conf]', row);
  bOutra.addEventListener('click', function () {
    if (!outras.hidden) { outras.hidden = true; return; }
    var cands = (it.candidatas || []).filter(function (c) { return !sug.linhas.some(function (l) { return l.aba === c.aba && l.id === c.id; }); });
    outras.innerHTML = '<div class="gl-sug-t">outras sessões de convênio de ' + esc(sug.paciente || lido.nome || 'quem?') + '</div>' + (cands.length ? cands.map(function (c, i) { return '<label class="check"><input type="checkbox" data-c="' + i + '"> <span>' + esc(linhaTxt(c)) + ' <small class="muted">' + esc(c.aba) + '</small></span></label>'; }).join('') : '<div class="muted">nenhuma outra sessão de convênio nos meses da guia. Se a sessão não foi lançada, use "Lançar a sessão" (Registrar).</div>');
    outras.hidden = false; outras.dataset.cands = JSON.stringify(cands); bConf.disabled = false;
  });
  bConf.addEventListener('click', function () {
    var linhas = $$('[data-l]', row).filter(function (c) { return c.checked; }).map(function (c) { return sug.linhas[+c.dataset.l]; });
    var cands = outras.hidden ? [] : JSON.parse(outras.dataset.cands || '[]'); $$('[data-c]', row).forEach(function (c) { if (c.checked) linhas.push(cands[+c.dataset.c]); });
    if (!linhas.length) { $('.gl-erro', row).innerHTML = erroBox(['Marque pelo menos uma linha.']); return; }
    var cb = $('[data-cart]', row), b = this; b.disabled = true; b.textContent = 'Gravando…'; $('.gl-erro', row).innerHTML = '';
    call('confirmarGuia', { idArquivo: it.id, linhas: linhas.map(function (l) { return { aba: l.aba, id: l.id, linha: l.linha, paciente: sug.paciente }; }), gravarCarteirinha: !!(cb && cb.checked) }).then(function (r) {
      if (!r.ok) { b.disabled = false; b.textContent = 'Confirmar'; $('.gl-erro', row).innerHTML = erroBox(r.erros || ['Não gravou']); return; }
      toast('Guia' + (r.numero ? ' ' + r.numero : '') + ' gravada em ' + r.gravadas.length + ' linha' + (r.gravadas.length === 1 ? '' : 's') + (r.carteirinha ? ' · carteirinha no cadastro' : '') + (r.erros && r.erros.length ? ' · ' + r.erros.join(' ') : ''));
      if (typeof invalidarResumo === 'function') invalidarResumo();
      row.classList.add('ok'); setTimeout(function () { row.remove(); if (aoMudar) aoMudar(it, 'confirmada'); }, 400);
    }).catch(function (e) { b.disabled = false; b.textContent = 'Confirmar'; $('.gl-erro', row).innerHTML = erroBox(['Não consegui gravar: ' + e.message]); });
  });
  var bl = $('[data-lancar]', row); if (bl) bl.addEventListener('click', function () { go('registrar', { paciente: sug.paciente.split(' / ')[0], data: (lido.datas || [])[0] || '', guia: 'Sim' }); });
  $('[data-ign]', row).addEventListener('click', function () {
    var b = this; doisCliques(b, 'Confirmar: ignorar este arquivo?', function () {
      b.disabled = true;
      call('ignorarGuia', { idArquivo: it.id, motivo: it.status === 'nao_e_guia' ? 'não é guia' : 'ignorada pela ' + quemSou().toLowerCase() }).then(function (r) { if (!r.ok) { b.disabled = false; return toast((r.erros || ['Não gravou']).join(' ')); } toast('Arquivo ignorado'); row.remove(); if (aoMudar) aoMudar(it, 'ignorada'); }).catch(function (e) { b.disabled = false; toast('Erro: ' + e.message); });
    });
  });
  return row;
}
// card do Meu dia: "Guias lidas ontem (n)" — todas as pendentes, o título diz quantas foram lidas ontem
function renderGuiasMeuDia() {
  var card = $("#md-guias-card"), box = $("#md-guias"); if (!card) return;
  var g = GUIAS || { itens: [], ontem: 0, ia: {} }, itens = g.itens || [];
  card.hidden = !itens.length && !(g.ia && g.ia.mensagem);
  $("#md-n-guias-lidas").textContent = itens.length;
  $("#md-guias-t").textContent = 'Guias lidas ontem' + (g.ontem !== itens.length ? ' (' + g.ontem + ') e anteriores' : '');
  $("#md-guias-sub").textContent = g.ia && g.ia.pausada ? g.ia.mensagem : g.erro ? g.ia.mensagem : itens.length ? 'o app leu os PDFs da pasta e sugere a linha da sessão: confira e confirme (ou escolha outra linha)' : 'nenhuma guia pendente de confirmação';
  box.innerHTML = '';
  itens.forEach(function (it) { box.appendChild(guiaItemEl(it, function () { GUIAS.itens = GUIAS.itens.filter(function (x) { return x.id !== it.id; }); if (!GUIAS.itens.length) renderGuiasMeuDia(); })); });
}
