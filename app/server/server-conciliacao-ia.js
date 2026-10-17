/* ================= CONCILIAÇÃO ASSISTIDA PELA IA (IA parte 2, 17/10/2026; só gestão) =================
   Mesmo escopo de server.js / server-fase2.js / server-ia.js (montado pelo build). Depois das regras de API.conciliacao, o que
   sobrou no banco (Pix e vendas no cartão sem lançamento, sem sugestão fixa) vai pro modelo junto com os candidatos: recebimentos
   lançados e ainda livres (L…), mensalidades pagas em Mensalistas (M…) e sessões em aberto (A…). Sem CPF, telefone nem pedaço
   de documento (o PagBank põe dígitos no "quem pagou"; saem antes de ir).
   A resposta é só sugestão: fica na coluna "Sugestão IA" da aba do banco e a tela mostra. Quem grava Situação / Ligado a /
   Conciliado é API.conciliar, com o clique da gestão. Ao carregar, cada sugestão guardada é conferida de novo (lançamento ainda
   livre e no mesmo lugar, sessão ainda em aberto, soma e datas); a que não vale mais some. */
var COL_SUG_IA = 'Sugestão IA', CONC_IA_LOTE = 15, CONC_IA_MAX = 60, CONC_IA_TEMPO_MS = 240000;
var SIT_IA = SIT_EXT.filter(function (x) { return x !== 'conciliado' && x !== 'pendente'; });
var CONC_SCHEMA = { type: 'object', additionalProperties: false, required: ['sugestoes'], properties: { sugestoes: { type: 'array', items: { type: 'object', additionalProperties: false,
  required: ['entrada', 'acao', 'lancamentos', 'situacao', 'confianca', 'motivo'],
  properties: { entrada: { type: 'string' }, acao: { type: 'string', enum: ['ligar', 'situacao', 'em_aberto', 'nenhuma'] }, lancamentos: { type: 'array', items: { type: 'string' } },
    situacao: { type: 'string', enum: [''].concat(SIT_IA) }, confianca: { type: 'string', enum: ['alta', 'media', 'baixa'] }, motivo: { type: 'string' } } } } } };

function brl_(n) { return 'R$ ' + Mensagens.valorBR(Math.round((Number(n) || 0) * 100) / 100); }
// "62.985.207 Luisa Maria" → "Luisa Maria": o PagBank põe pedaço de CPF/CNPJ no nome de quem pagou
function semDigitos_(t) { return String(t || '').replace(/\d[\d.\-\/]*/g, ' ').replace(/\s+/g, ' ').trim(); }
// mesmo pagador = mesmo nome sem dígitos, acento e caixa ("62.985.207 Luisa Maria" e "Luisa Maria" são a mesma chave)
function chavePagador_(t) { return Duplicatas.normalizar(semDigitos_(t)); }
// o que a gestão já decidiu pra cada pagador, a partir das entradas do extrato já resolvidas (qualquer mês):
// { chave: { sit: { situação: n }, pacientes: [nomes, dos lançamentos ligados] } }
function historicoPagadores_(ext, todas) {
  var out = {}, linhaDe = function (aba, linha) { var t = todas[aba]; return t ? t.linhas.filter(function (l) { return l.linha === linha; })[0] : null; };
  ext.forEach(function (e) {
    if (!e.situacao || e.situacao === 'pendente' || !e.quem) return; var k = chavePagador_(e.quem); if (!k) return;
    var h = out[k] = out[k] || { sit: {}, pacientes: [] }; h.sit[e.situacao] = (h.sit[e.situacao] || 0) + 1;
    var m, re = /([A-Za-zÇçãé]+)!(\d+)/g; while ((m = re.exec(String(e.ligado || '')))) { var l = linhaDe(m[1], parseInt(m[2], 10)); if (l && h.pacientes.indexOf(l.paciente) < 0) h.pacientes.push(l.paciente); }
  });
  return out;
}
// pagadores conhecidos das entradas do lote: quem o cadastro diz que paga por quem (pagador habitual, nome no extrato,
// responsável, o próprio paciente) e o que a gestão já decidiu pra esse pagador
function concIAPagadores_(c, lote) {
  var pacs = indicePacientes_(), linhas = [];
  var bate = function (q, n) { var tq = tokensNome_(q), tn = tokensNome_(n); if (!tq.length || !tn.length) return false; if (Math.min(tq.length, tn.length) < 2) return Duplicatas.normalizar(q) === Duplicatas.normalizar(n); return notaNome_(q, [n]) >= 0.75; };
  lote.forEach(function (x) {
    var q = semDigitos_(x.tipo === 'venda' ? x.v.comprador : x.e.quem); if (!q) return;
    var cad = [];
    pacs.forEach(function (p) {
      var como = bate(q, p.nome) ? 'o próprio paciente' : p.pagador && bate(q, p.pagador) ? 'pagador habitual' : p.pagadorExtrato && bate(q, p.pagadorExtrato) ? 'nome no extrato' : p.resp && bate(q, p.resp) ? 'responsável' : '';
      if (como) cad.push(p.nome + ' (' + como + (/^n/i.test(p.ativo || '') ? ', inativo' : '') + ')');
    });
    var h = c.hist[chavePagador_(q)], dec = h ? Object.keys(h.sit).map(function (k) { return h.sit[k] + '× ' + k; }).join(', ') + (h.pacientes.length ? ' — ligado a ' + h.pacientes.slice(0, 6).join(', ') : '') : '';
    if (cad.length || dec) linhas.push(x.cod + ' · ' + q + (cad.length ? ' → cadastro: ' + cad.slice(0, 6).join('; ') : '') + (dec ? ' → decisões anteriores da gestão: ' + dec : ''));
  });
  return linhas;
}
function saldoAberto_(r) { return Math.round(((r.pago === 'Parcial' ? r.valor - (r.recebido || 0) : r.valor) || 0) * 100) / 100; }

// candidatos que o modelo pode usar: recebimentos livres de 45 dias antes do mês a 10 depois, mensalidades pagas do mês e do anterior,
// sessões em aberto de 60 dias antes até o fim do mês
function concIACandidatos_(c, ocupados) {
  var de = new Date(c.ini.getTime() - 45 * 864e5), ate = new Date(c.fim.getTime() + 10 * 864e5), noJanela = function (s, a, b) { var x = ymdDate_(s); return x && x >= ymdDate_(a) && x <= ymdDate_(b); };
  var L = c.recs.filter(function (r) { return c.livre(r) && !ocupados[r.chave] && noJanela(r.dataPag, de, ate); });
  var chaves = [c.resp.chave, chaveMes_(new Date(c.ini.getFullYear(), c.ini.getMonth() - 1, 1, 12))], M = [];
  mensalistasIdx_().linhas.forEach(function (l) {
    chaves.forEach(function (ch) { var mc = l.comp[ch]; if (!mc || !(mc.pago === 'Sim' || mc.pago === 'Parcial')) return; M.push({ paciente: l.paciente, pagador: l.pagador, chave: ch, valor: numBR_(mc.valorCobrado) || l.valor, data: mc.data, forma: mc.forma }); });
  });
  return { L: L.slice(0, 250), M: M.slice(0, 120), A: abertosJanela_(c).slice(0, 150) };
}
// sessões em aberto (com saldo) de 60 dias antes do mês até o fim dele: candidatos A da IA e a lista "Sessão em aberto" da tela
function abertosJanela_(c) {
  var pacs = {}, A = [], de = ymdDate_(new Date(c.ini.getTime() - 60 * 864e5)), ate = ymdDate_(c.fim); indicePacientes_().forEach(function (p) { pacs[p.nome] = p; });
  Object.keys(c.todas).forEach(function (m) { c.todas[m].linhas.forEach(function (r) { var x = ymdDate_(r.data); if (emAberto_(r) && saldoAberto_(r) > 0 && x && x >= de && x <= ate) A.push({ aba: m, linha: r.linha, id: r.id, paciente: r.paciente, profissional: r.profissional, data: r.data, valor: saldoAberto_(r), pagador: (pacs[r.paciente] || {}).pagador || '', pagadorExtrato: (pacs[r.paciente] || {}).pagadorExtrato || '', resp: (pacs[r.paciente] || {}).resp || '' }); }); });
  return A;
}
function concIATexto_(c, lote, cand, cod) {
  var convs = []; try { convs = colunaLista_(CONFIG.LISTAS.CONVENIO).filter(function (x) { return x && !/^Particular$/i.test(x); }); } catch (e) { }
  var t = ['Mês da conciliação: ' + c.resp.chave + '. Primeiro mês com lançamentos no app: ' + (c.inicio ? CONFIG.MESES[c.inicio.getMonth()] + '/' + c.inicio.getFullYear() : '—') + '.',
    'Convênios: ' + (convs.join('; ') || '—') + '.', 'Profissionais da clínica: ' + profissionais_().map(function (p) { return String(p.nome).replace(/^Dra?\.\s+/, ''); }).join('; ') + '.', '', 'ENTRADAS DO BANCO A SUGERIR:'];
  lote.forEach(function (x) {
    if (x.tipo === 'venda') t.push(x.cod + ' · ' + fmtData_(x.v.data) + ' · venda no cartão ' + brl_(x.v.bruto) + ' (' + [x.v.forma, x.v.parcelas, x.v.bandeira].filter(Boolean).join(', ') + ')' + (x.v.comprador ? ' · comprador: ' + semDigitos_(x.v.comprador) : ''));
    else t.push(x.cod + ' · ' + fmtData_(x.e.data) + ' · ' + brl_(x.e.valor) + ' · ' + x.e.tipo + ' · quem pagou: ' + (semDigitos_(x.e.quem) || semDigitos_(x.e.desc) || '—'));
  });
  var pg = concIAPagadores_(c, lote);
  t.push('', 'PAGADORES CONHECIDOS (o cadastro diz quem paga por quem; as decisões anteriores da gestão pro mesmo pagador valem como regra, acima da semelhança de nomes):');
  if (pg.length) pg.forEach(function (l) { t.push(l); }); else t.push('(nenhum)');
  t.push('', 'RECEBIMENTOS LANÇADOS NO APP, AINDA NÃO CONCILIADOS (L):');
  cand.L.forEach(function (r) { var nomes = r.nomes.filter(function (n) { return n !== r.paciente; }); t.push(cod.L(r) + ' · paciente ' + r.paciente + (nomes.length ? ' (pagador: ' + nomes.join(' / ') + ')' : '') + ' · sessão ' + r.data + ' · pago ' + r.dataPag + ' · ' + brl_(r.valor) + ' · ' + r.forma + ' · ' + r.profissional); });
  if (!cand.L.length) t.push('(nenhum)');
  t.push('', 'MENSALIDADES MARCADAS COMO PAGAS NA ABA MENSALISTAS (M):');
  cand.M.forEach(function (m) { t.push(cod.M(m) + ' · paciente ' + m.paciente + (m.pagador ? ' (pagador: ' + m.pagador + ')' : '') + ' · ' + m.chave + ' · ' + brl_(m.valor) + (m.data ? ' · pago ' + m.data : '') + (m.forma ? ' · ' + m.forma : '')); });
  if (!cand.M.length) t.push('(nenhuma)');
  t.push('', 'SESSÕES LANÇADAS E EM ABERTO, NÃO PAGAS (A):');
  cand.A.forEach(function (a) { t.push(cod.A(a) + ' · paciente ' + a.paciente + (a.pagador ? ' (pagador: ' + a.pagador + ')' : '') + ' · ' + a.data + ' · ' + brl_(a.valor) + ' · ' + a.profissional); });
  if (!cand.A.length) t.push('(nenhuma)');
  t.push('', 'Devolva uma sugestão por entrada (' + lote.map(function (x) { return x.cod; }).join(', ') + ').');
  return t.join('\n');
}
// confere uma sugestão (do modelo ou guardada) contra o estado de agora; devolve { ia } pronta pra tela ou null
function concIAConferir_(x, s, c, ocupados) {
  var valor = x.tipo === 'venda' ? x.v.bruto : x.e.valor, data = x.tipo === 'venda' ? x.v.data : x.e.data, out = { acao: s.acao, conf: s.conf, motivo: s.motivo, em: s.em || '', modelo: s.modelo || '', avisos: [] };
  if (s.acao === 'ligar') {
    var porChave = {}; c.recs.forEach(function (r) { porChave[r.chave] = r; });
    var recs = (s.recs || []).map(function (k) { var r = porChave[k.chave]; return r && String(r.id) === String(k.id) && c.livre(r) && !ocupados[r.chave] ? r : null; });
    if (!recs.length || recs.some(function (r) { return !r; })) return null;
    if (recs.some(function (r) { return r.cartao !== (x.tipo === 'venda'); })) return null;
    var soma = Math.round(recs.reduce(function (a, r) { return a + r.valor; }, 0) * 100) / 100;
    if (x.tipo === 'venda') { if (valor < soma - 0.01 || valor > soma * 1.1 + 0.01) out.avisos.push('soma ' + brl_(soma) + ', venda ' + brl_(valor)); else if (valor - soma > 0.01) out.avisos.push(brl_(valor - soma) + ' a mais na maquininha (acréscimo?)'); }
    else if (Math.abs(soma - valor) > 0.01) out.avisos.push('soma ' + brl_(soma) + ', entrada ' + brl_(valor));
    if (recs.some(function (r) { return Math.abs(diasEntre_(r.dataPag, data)) > 45; })) out.avisos.push('data longe da entrada');
    out.recs = recs.map(recResumo_); out._chaves = recs.map(function (r) { return r.chave; });
  } else if (s.acao === 'situacao') {
    if (SIT_IA.indexOf(s.sit) < 0) return null; out.sit = s.sit;
  } else if (s.acao === 'em_aberto') {
    var abertos = (s.abertos || []).map(function (k) { var t = c.todas[k.aba], r = t && t.linhas.filter(function (l) { return l.linha === k.linha && String(l.id) === String(k.id); })[0]; return r && emAberto_(r) ? { aba: k.aba, linha: r.linha, id: r.id, paciente: r.paciente, profissional: r.profissional, data: r.data, valor: saldoAberto_(r) } : null; });
    if (!abertos.length || abertos.some(function (a) { return !a; })) return null; out.abertos = abertos;
  } else if (s.acao !== 'nenhuma') return null;
  if (out.avisos.length && out.conf === 'alta') out.conf = 'media';
  out.aviso = out.avisos.join(' · '); delete out.avisos;
  return out;
}
// lê a coluna "Sugestão IA" das entradas soltas do mês e põe em cada uma a sugestão conferida (x.ia); c.resp.ia = estado do botão
function iaConciliacaoAnexar_(c) {
  var ocupados = {}, conta = { comIA: 0, aSugerir: 0 };
  var anexar = function (x) {
    var cru = c.sugIA[(x.tipo === 'venda' ? 'venda:' : 'ext:') + x.obj.id], s = null; try { s = cru ? JSON.parse(cru) : null; } catch (e) { s = null; }
    var ia = s ? concIAConferir_(x.tipo === 'venda' ? { tipo: 'venda', v: x.obj } : { tipo: 'ext', e: x.obj }, s, c, ocupados) : null;
    if (ia) { (ia._chaves || []).forEach(function (k) { ocupados[k] = 1; }); delete ia._chaves; x.obj.ia = ia; conta.comIA++; }
    else if (!x.obj.sugestao) conta.aSugerir++;
  };
  c.resp.semLancamento.forEach(function (e) { anexar({ tipo: 'ext', obj: e }); });
  c.resp.vendasSemLancamento.forEach(function (v) { anexar({ tipo: 'venda', obj: v }); });
  var cfg = iaConfig_(), bloq = iaBloqueio_('conciliacao', cfg), g = gastoIA_();
  c.resp.ia = { bloqueio: bloq ? bloq.mensagem : (!iaChave_() ? 'Chave da API não configurada.' : ''), modelo: cfg.modelo, gastoMes: g.mes, tetoMes: Number(cfg.teto_mes_usd) || 0, comIA: conta.comIA, aSugerir: conta.aSugerir };
  c.ocupados = ocupados;
  // pra resolver na própria tela uma entrada que paga sessão em aberto (gestão, 17/10): só se há Pix solto
  c.resp.abertos = c.resp.semLancamento.some(function (e) { return e.tipo !== 'Cartão (vendas)'; }) ? abertosJanela_(c).slice(0, 300) : [];
  return c;
}
/* Pix que paga sessão(ões) em aberto, resolvido na conciliação (gestão, 17/10: "queria poder resolver nessa mesma página"):
   registra o recebimento nas sessões (o mesmo de "Registrar pagamento" na Ficha: API.corrigirLancamento com recebidoAgora, data
   do Pix, forma Pix), da mais antiga pra mais nova, e concilia a entrada com elas (API.conciliar). Pix menor que o em aberto =
   recebimento parcial (o resto continua em aberto); Pix maior que o em aberto escolhido = recusa (nada é gravado). */
API.conciliarAberto = function (d) {
  var neg = soGestao_(); if (neg) return neg; d = d || {};
  var sE = abaComCabecalho_(ABA_EXT, HEXT), e = linhasComo_(sE).filter(function (x) { return String(x['ID do banco']) === String(d.id || ''); })[0];
  if (!e) return { ok: false, erros: ['Não achei a entrada do banco.'] };
  if (String(e['Situação'] || 'pendente') !== 'pendente') return { ok: false, erros: ['Esta entrada já foi resolvida (' + e['Situação'] + '). Recarregue.'] };
  if (/cart/i.test(String(e['Tipo'] || ''))) return { ok: false, erros: ['Depósito de cartão: ligue à venda, não a sessão em aberto.'] };
  var valor = numBR_(e['Valor (R$)']), dataPix = fmtData_(e['Data']), erros = [], sessoes = [];
  (d.abertos || []).slice(0, 12).forEach(function (k) {
    var r = linhasMes_(k.aba).linhas.filter(function (l) { return l.id && l.id === String(k.id || ''); })[0];
    if (!r) { erros.push('Não achei o lançamento ' + k.id + ' em ' + k.aba + '; recarregue.'); return; }
    if (!emAberto_(r) || !(saldo_(r) > 0)) { erros.push(r.paciente + ' ' + r.data + ': não está mais em aberto; recarregue.'); return; }
    if (!sessoes.some(function (x) { return x.aba === k.aba && x.r.id === r.id; })) sessoes.push({ aba: k.aba, r: r });
  });
  if (!sessoes.length && !erros.length) erros.push('Escolha a sessão em aberto.');
  if (erros.length) return { ok: false, erros: erros };
  var emAberto = Math.round(sessoes.reduce(function (a, x) { return a + saldo_(x.r); }, 0) * 100) / 100;
  if (valor > emAberto + 0.005) return { ok: false, erros: ['O Pix (' + brl_(valor) + ') é maior que o em aberto escolhido (' + brl_(emAberto) + '). Escolha mais sessões ou resolva de outro jeito.'] };
  sessoes.sort(function (a, b) { return ymdDate_(a.r.data) - ymdDate_(b.r.data); });
  var resto = valor, pagos = [];
  sessoes.forEach(function (x) {
    if (resto < 0.005 || erros.length) return;
    var v = Math.min(resto, saldo_(x.r)), rc = API.corrigirLancamento({ aba: x.aba, id: x.r.id, campos: { recebidoAgora: v, dataPagamento: dataPix, forma: 'Pix', observacao: 'Pix no banco em ' + dataPix + ' (conciliação)' } });
    if (!rc.ok) { erros.push(x.r.paciente + ' ' + x.r.data + ': ' + (rc.erros || []).join(' ')); return; }
    resto = Math.round((resto - v) * 100) / 100;
    pagos.push({ aba: x.aba, linha: x.r.linha, id: x.r.id, paciente: x.r.paciente, data: x.r.data, valor: v, quitou: v >= saldo_(x.r) - 0.005 });
  });
  if (!pagos.length) return { ok: false, erros: erros };
  var obs = String(d.obs || '').trim(), rcc = API.conciliar({ itens: [{ tipo: 'ext', id: e['ID do banco'], recs: pagos.map(function (p) { return { aba: p.aba, linha: p.linha, id: p.id }; }), obs: obs || 'pagamento de sessão em aberto, registrado na conciliação' }] });
  if (!rcc.ok || rcc.erros.length) erros = erros.concat(rcc.erros || ['Recebimento registrado, mas não consegui conciliar: recarregue e ligue a entrada ao lançamento.']);
  return { ok: true, pagos: pagos, erros: erros };
};
function gravarSugIA_(itens) {
  if (!itens.length) return;
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    [[ABA_EXT, HEXT, 'ID do banco', 'ext'], [ABA_CART, HCART, 'Código da transação', 'venda']].forEach(function (a) {
      var meus = itens.filter(function (i) { return i.tipo === a[3]; }); if (!meus.length) return;
      var s = abaComCabecalho_(a[0], a[1]), h = garantirColunas_(s, a[1]).h; if (s.getLastRow() < 2) return;
      var ids = s.getRange(2, h[a[2]], s.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]); });
      meus.forEach(function (i) { var k = ids.indexOf(String(i.id)); if (k >= 0) s.getRange(k + 2, h[COL_SUG_IA]).setValue(JSON.stringify(i.sug)); });
    });
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
}
// botão "Sugerir com IA": { chave, refazer } → { ok, sugeridas, semSugestao, restantes, custo, mensagem }
API.conciliacaoIA = function (d) {
  var neg = soGestao_(); if (neg) return neg; d = d || {};
  var t0 = new Date().getTime(), cfg = iaConfig_(), bloq = iaBloqueio_('conciliacao', cfg); if (bloq) return { ok: false, motivo: bloq.motivo, erros: [bloq.mensagem] };
  var c = conciliacaoCalc_(String(d.chave || chaveMes_(new Date()))); if (!c.ok) return c;
  iaConciliacaoAnexar_(c);
  var refazer = !!d.refazer, ocupados = {};
  // ao refazer, as sugestões atuais saem da conta (os lançamentos delas voltam a ser candidatos); senão ficam como estão
  if (!refazer) Object.keys(c.ocupados).forEach(function (k) { ocupados[k] = 1; });
  var fila = [];
  c.resp.semLancamento.forEach(function (e) { if (!e.sugestao && (refazer || !e.ia)) fila.push({ tipo: 'ext', id: e.id, e: e }); });
  c.resp.vendasSemLancamento.forEach(function (v) { if (refazer || !v.ia) fila.push({ tipo: 'venda', id: v.id, v: v }); });
  if (!fila.length) return { ok: true, sugeridas: 0, semSugestao: 0, restantes: 0, custo: 0, mensagem: 'Nada a sugerir neste mês: o que sobrou já tem sugestão.' };
  var restantes = Math.max(0, fila.length - CONC_IA_MAX); fila = fila.slice(0, CONC_IA_MAX);
  var nE = 0, nV = 0; fila.forEach(function (x) { x.cod = x.tipo === 'venda' ? 'V' + (++nV) : 'E' + (++nE); });
  var out = { ok: true, sugeridas: 0, semSugestao: 0, restantes: restantes, custo: 0, lotes: 0, mensagem: '', erros: [] }, quem = usuario_().email || '';
  for (var i = 0; i < fila.length; i += CONC_IA_LOTE) {
    if (new Date().getTime() - t0 > CONC_IA_TEMPO_MS) { out.restantes += fila.length - i; out.mensagem = 'Parei pelo tempo: clique de novo pra continuar.'; break; }
    var lote = fila.slice(i, i + CONC_IA_LOTE), cand = concIACandidatos_(c, ocupados), mapa = {}, codRev = {};
    var cod = { L: function (r) { var k = 'L' + (cand.L.indexOf(r) + 1); mapa[k] = { tipo: 'L', r: r }; return k; }, M: function (m) { var k = 'M' + (cand.M.indexOf(m) + 1); mapa[k] = { tipo: 'M', m: m }; return k; }, A: function (a) { var k = 'A' + (cand.A.indexOf(a) + 1); mapa[k] = { tipo: 'A', a: a }; return k; } };
    lote.forEach(function (x) { codRev[x.cod] = x; });
    var texto = concIATexto_(c, lote, cand, cod);
    var r = chamarIA('conciliacao', { texto: texto, schema: CONC_SCHEMA, maxTokens: 16000, linhas: lote.length, quem: quem, observacao: c.resp.chave + ' · lote ' + (out.lotes + 1) + ' · ' + lote.length + ' entradas · ' + (cand.L.length + cand.M.length + cand.A.length) + ' candidatos' });
    if (!r.ok) { out.ok = out.sugeridas > 0; out.motivo = r.motivo; out.erros.push(r.mensagem); out.restantes += fila.length - i; break; }
    out.lotes++; out.custo = Math.round((out.custo + (r.custo || 0)) * 1e6) / 1e6;
    var grava = [], vistos = {}, agora = agora_();
    ((r.dados && r.dados.sugestoes) || []).forEach(function (s) {
      var x = codRev[String(s.entrada || '').trim()]; if (!x || vistos[x.cod]) return; vistos[x.cod] = 1;
      var refs = (s.lancamentos || []).map(function (k) { return mapa[String(k).trim()]; }).filter(Boolean);
      var sug = { em: agora, modelo: r.modelo || cfg.modelo, acao: s.acao, conf: s.confianca, motivo: String(s.motivo || '').slice(0, 300) };
      if (s.acao === 'ligar') sug.recs = refs.filter(function (o) { return o.tipo === 'L'; }).map(function (o) { return { chave: o.r.chave, id: o.r.id }; });
      else if (s.acao === 'em_aberto') sug.abertos = refs.filter(function (o) { return o.tipo === 'A'; }).map(function (o) { return { aba: o.a.aba, linha: o.a.linha, id: o.a.id }; });
      else if (s.acao === 'situacao') { sug.sit = s.situacao; var ms = refs.filter(function (o) { return o.tipo === 'M'; }); if (ms.length) sug.mens = ms.map(function (o) { return o.m.paciente + ' · ' + o.m.chave + ' · ' + brl_(o.m.valor); }); }
      // o modelo não é confiável pra conta: a sugestão só vale se passar na mesma conferência de quando a tela carrega
      var ia = concIAConferir_(x, sug, c, ocupados);
      if (!ia) { sug = { em: agora, modelo: sug.modelo, acao: 'nenhuma', conf: 'baixa', motivo: 'sugestão descartada pela conferência do app (' + (s.acao || '?') + ': ' + String(s.motivo || '').slice(0, 120) + ')' }; }
      else (ia._chaves || []).forEach(function (k) { ocupados[k] = 1; });
      if (sug.acao === 'nenhuma') out.semSugestao++; else out.sugeridas++;
      grava.push({ tipo: x.tipo, id: x.id, sug: sug });
    });
    lote.forEach(function (x) { if (!vistos[x.cod]) { out.semSugestao++; grava.push({ tipo: x.tipo, id: x.id, sug: { em: agora, modelo: r.modelo || cfg.modelo, acao: 'nenhuma', conf: 'baixa', motivo: 'o modelo não respondeu sobre esta entrada' } }); } });
    gravarSugIA_(grava);
  }
  if (!out.mensagem && out.restantes) out.mensagem = out.restantes + ' entrada(s) ficaram pra próxima: clique de novo.';
  return out;
};
