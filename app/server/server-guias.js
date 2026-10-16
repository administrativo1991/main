/* ================= GUIAS DE CONVÊNIO lidas da pasta do Drive (16/10/2026) =================
   A recepção digitaliza a guia assinada e salva o PDF em GUIAS DE CONVÊNIOS / {CEDPLAN | SABIN SINAI} / {MM MÊS AA} /
   {paciente} / dd-mm Nome.pdf (nada muda pra ela). Um gatilho diário (ou o botão "Ler guias agora", gestão) lê cada arquivo
   novo com o modelo (chamarIA, server-ia.js), casa a guia com as linhas da aba do mês SEM modelo (regra do app: convênio,
   paciente por carteirinha → nome → nome da pasta, data ±1 dia) e grava a SUGESTÃO na aba `Guias lidas`. Quem grava na linha
   é a recepção, no card "Guias lidas ontem" do Meu dia (Confirmar · Escolher outra linha · Não é guia). Nada é apagado nem
   movido no Drive: o app só lê. */
var ABA_GUIAS = 'Guias lidas';
var HGUIAS = ['ID do arquivo', 'Nome', 'Pasta', 'Link', 'Convênio', 'Data de leitura', 'Status', 'Resultado', 'Sugestão', 'Confiança', 'Motivos', 'Confirmado por', 'Linhas gravadas', 'Observação', 'Páginas', 'Custo (US$)', 'Hash'];
CONFIG.HM.GUIA_N = 'Nº da guia'; CONFIG.HM.GUIA_LINK = 'Link da guia'; // colunas novas no fim da aba do mês (criadas na 1ª confirmação)
var GUIA_STATUS_PENDENTE = { lida: 1, sem_atendimento: 1, baixa_confianca: 1, nao_e_guia: 1 };   // aparecem no card do Meu dia
var GUIA_STATUS_CONFERIR = { sem_atendimento: 1, baixa_confianca: 1, erro: 1, nao_e_guia: 1 };   // card "Guias a conferir" (gestão)
var GUIA_MIMES = { 'application/pdf': 'pdf', 'image/jpeg': 'img', 'image/png': 'img', 'image/webp': 'img', 'image/gif': 'img' };
var GUIA_ORCAMENTO_MS = 270000; // o gatilho e a chamada da tela têm 6 min; parar antes e deixar o resto pro dia seguinte
var GUIA_SCHEMA = { type: 'object', additionalProperties: false, required: ['e_guia', 'observacao', 'guias'], properties: {
  e_guia: { type: 'boolean' }, observacao: { type: 'string' },
  guias: { type: 'array', items: { type: 'object', additionalProperties: false,
    required: ['pagina', 'continuacao_da_anterior', 'convenio', 'numero_guia', 'carteirinha', 'beneficiario', 'datas', 'procedimento', 'quantidade', 'assinatura_visivel', 'legibilidade'],
    properties: { pagina: { type: 'integer' }, continuacao_da_anterior: { type: 'boolean' }, convenio: { type: 'string' }, numero_guia: { type: 'string' }, carteirinha: { type: 'string' }, beneficiario: { type: 'string' },
      datas: { type: 'array', items: { type: 'string' } }, procedimento: { type: 'string' }, quantidade: { type: 'integer' }, assinatura_visivel: { type: 'boolean' }, legibilidade: { type: 'string', enum: ['boa', 'parcial', 'ilegivel'] } } } } } };

/* ---------- pastas do Drive ---------- */
function abaGuias_() { return abaComCabecalho_(ABA_GUIAS, HGUIAS); }
// nome da pasta (CEDPLAN, SABIN SINAI) → convênio como está em Listas (Cedplan, Sabin Sinai); sem correspondência: o nome da pasta
function convenioDaPasta_(nome) {
  var n = semAcento_(nome).replace(/\s+/g, ' '), lista = colunaLista_(CONFIG.LISTAS.CONVENIO).filter(function (c) { return c && !/^Particular$/i.test(c); });
  var exato = lista.filter(function (c) { return semAcento_(c) === n; })[0]; if (exato) return exato;
  var comeca = lista.filter(function (c) { var cc = semAcento_(c); return n.indexOf(cc) === 0 || cc.indexOf(n) === 0; })[0];
  return comeca || String(nome || '').trim();
}
// pasta do mês pelo NÚMERO no início do nome ("10 OUT 26", "07 JUL 26"; tolera "O7" com letra O), conferindo o ano se o nome terminar em 2 dígitos
function pastaMes_(pastaConv, mesIdx, ano) {
  var re = new RegExp('^[0O]?' + (mesIdx + 1) + '(\\D|$)'), aa = String(ano).slice(-2), it = pastaConv.getFolders();
  while (it.hasNext()) {
    var f = it.next(), nome = String(f.getName() || '').trim(); if (!re.test(nome)) continue;
    var m = nome.match(/(\d{2})\s*$/); if (m && m[1] !== aa) continue;
    return f;
  }
  return null;
}
// arquivos de uma pasta e das subpastas (por paciente), até 3 níveis
function arquivosEm_(pasta, caminho, out, nivel) {
  var fi = pasta.getFiles();
  while (fi.hasNext()) { var f = fi.next(); out.push({ id: f.getId(), nome: String(f.getName() || ''), pasta: caminho, sub: nivel > 0 ? pasta.getName() : '', mime: String(f.getMimeType() || ''), tamanho: Number(f.getSize()) || 0, url: f.getUrl(), file: f }); }
  if (nivel >= 3) return;
  var fo = pasta.getFolders();
  while (fo.hasNext()) { var p = fo.next(); arquivosEm_(p, caminho + '/' + p.getName(), out, nivel + 1); }
}
// meses a ler: o escolhido, ou o corrente (+ o anterior até o dia guias_mes_anterior_ate_dia)
function mesesGuias_(cfg, mesNome) {
  var hoje = new Date(), out = [];
  if (mesNome) { var i = CONFIG.MESES.indexOf(mesNome); if (i < 0) return []; var ano = hoje.getFullYear() - (i > hoje.getMonth() ? 1 : 0); return [{ idx: i, ano: ano, nome: mesNome }]; }
  out.push({ idx: hoje.getMonth(), ano: hoje.getFullYear(), nome: CONFIG.MESES[hoje.getMonth()] });
  if (hoje.getDate() <= (Number(cfg.guias_mes_anterior_ate_dia) || 5)) { var ant = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1); out.push({ idx: ant.getMonth(), ano: ant.getFullYear(), nome: CONFIG.MESES[ant.getMonth()] }); }
  return out;
}
// índice da aba Guias lidas: por id do arquivo e por hash do conteúdo
function guiasLidasIdx_() {
  var s = planilha_().getSheetByName(ABA_GUIAS), porId = {}, porHash = {}, linhas = [];
  if (!s || s.getLastRow() < 2) return { porId: porId, porHash: porHash, linhas: linhas, s: s };
  linhasComo_(s).forEach(function (r) { var id = String(r['ID do arquivo'] || '').trim(); if (!id) return; r.id = id; porId[id] = r; linhas.push(r); var hs = String(r['Hash'] || '').trim(); if (hs && !porHash[hs]) porHash[hs] = r; });
  return { porId: porId, porHash: porHash, linhas: linhas, s: s };
}
function hashBytes_(bytes) { try { return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, bytes).map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join(''); } catch (e) { return ''; } }
function pacientesConvenio_(conv) {
  var l = indicePacientes_().filter(function (p) { return p.convenio && !/^Particular$/i.test(p.convenio) && !/^n/i.test(p.ativo || 'Sim'); });
  var doConv = conv ? l.filter(function (p) { return semAcento_(p.convenio) === semAcento_(conv); }) : [];
  return doConv.length ? doConv : l;
}
// carteirinha do cadastro (Pacientes → Nº da carteirinha), por paciente e por número
function carteirinhas_() {
  if (MEMO_.cart) return MEMO_.cart;
  var s = planilha_().getSheetByName(CONFIG.ABA.PACIENTES), h = s ? cabecalhos_(s) : {}, porNome = {}, porNum = {};
  if (s && h[CONFIG.H.CARTEIRINHA] && s.getLastRow() >= 2) {
    var vals = s.getRange(2, 1, s.getLastRow() - 1, Math.max(h[CONFIG.H.NOME], h[CONFIG.H.CARTEIRINHA])).getValues();
    vals.forEach(function (r) { var n = String(r[h[CONFIG.H.NOME] - 1] || '').trim(), c = Duplicatas.digitos(String(r[h[CONFIG.H.CARTEIRINHA] - 1] || '')); if (n && c) { porNome[n] = c; if (!porNum[c]) porNum[c] = n; } });
  }
  MEMO_.cart = { porNome: porNome, porNum: porNum };
  return MEMO_.cart;
}

/* ---------- casamento (sem modelo) ---------- */
function dataLida_(t) {
  t = String(t || '').trim(); var m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) t = m[3] + '/' + m[2] + '/' + m[1];
  var m2 = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/); if (m2) t = ('0' + m2[1]).slice(-2) + '/' + ('0' + m2[2]).slice(-2) + '/' + (m2[3].length === 2 ? '20' + m2[3] : m2[3]);
  var d = parseData_(t); return d ? fmtData_(d) : '';
}
// "28-09 Isabelly Silva de Paiva .pdf" → { data: '28/09/aaaa' (com o ano do mês da pasta), nome: 'Isabelly Silva de Paiva' }
function dicaDoNome_(nome, ano) {
  var t = String(nome || '').replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[_]+/g, ' ').replace(/\s*\(\d+\)\s*$/, '').trim(), data = '';
  var m = t.match(/(\d{1,2})[-\/.](\d{1,2})/); if (m) { data = dataLida_(('0' + m[1]).slice(-2) + '/' + ('0' + m[2]).slice(-2) + '/' + ano); t = t.replace(m[0], ' '); }
  t = t.replace(/\b(assinad[oa]|cedplan|sabin|sinai|guia|scan|digitalizad[oa])\b/gi, ' ').replace(/\s+/g, ' ').trim();
  return { data: data, nome: t };
}
function melhorNome_(texto, candidatos) {
  var best = null, nota = 0; if (!String(texto || '').trim()) return { nome: '', nota: 0 };
  candidatos.forEach(function (n) { var x = notaNome_(texto, [n]); if (x > nota || (x === nota && best && n.length < best.length)) { nota = x; best = n; } });
  return { nome: nota >= 0.8 ? best : '', nota: nota };
}
// uma guia lida → { paciente, confianca, motivos[], linhas[], tipo }
function casarGuia_(g, conv, dica, mesPasta) {
  var motivos = [], baixa = false, cart = carteirinhas_(), nomesConv = pacientesConvenio_(conv).map(function (p) { return p.nome; }), nomesTodos = indicePacientes_().map(function (p) { return p.nome; });
  var numCart = Duplicatas.digitos(String(g.carteirinha || '')), paciente = '', como = '';
  if (numCart && cart.porNum[numCart]) { paciente = cart.porNum[numCart]; como = 'carteirinha'; }
  if (!paciente) { var m1 = melhorNome_(g.beneficiario, nomesConv); if (!m1.nome) m1 = melhorNome_(g.beneficiario, nomesTodos); if (m1.nome) { paciente = m1.nome; como = 'nome lido'; if (m1.nota < 1) motivos.push('nome parecido, não igual (' + g.beneficiario + ')'); } }
  if (!paciente && dica && dica.nome) { var m2 = melhorNome_(dica.nome, nomesConv); if (!m2.nome) m2 = melhorNome_(dica.nome, nomesTodos); if (m2.nome) { paciente = m2.nome; como = 'nome da pasta/arquivo'; motivos.push('nome lido na guia não bateu com o cadastro; usei o da pasta/arquivo'); baixa = true; } }
  if (!paciente) { motivos.push('nome sem correspondência no cadastro (' + (g.beneficiario || 'não lido') + ')'); baixa = true; }
  if (paciente && numCart && cart.porNome[paciente] && cart.porNome[paciente] !== numCart) { motivos.push('carteirinha lida (' + numCart + ') diverge do cadastro (' + cart.porNome[paciente] + ')'); baixa = true; }
  if (paciente && como !== 'carteirinha' && dica && dica.nome) { var m3 = notaNome_(dica.nome, [paciente]); if (m3 < 0.5) { motivos.push('nome da pasta/arquivo (' + dica.nome + ') não bate com ' + paciente); baixa = true; } }
  if (g.legibilidade && g.legibilidade !== 'boa') { motivos.push('leitura ' + g.legibilidade); baixa = true; }
  if (g.assinatura_visivel === false) { motivos.push('sem assinatura visível'); baixa = true; }
  if (g.convenio && conv && semAcento_(g.convenio).indexOf(semAcento_(conv).split(' ')[0]) < 0) motivos.push('convênio lido (' + g.convenio + ') diferente da pasta (' + conv + ')');
  var datas = (g.datas || []).map(dataLida_).filter(Boolean);
  if (!datas.length && dica && dica.data) { datas = [dica.data]; motivos.push('data não lida na guia; usei a do nome do arquivo'); baixa = true; }
  if (!datas.length) { motivos.push('sem data de atendimento'); baixa = true; }
  // a data do nome do arquivo ("28-09 Nome.pdf", posta pela recepção) costuma ser a da sessão; a lida na guia pode ser a de
  // emissão/autorização. Quando as duas diferem (mais de 1 dia), as linhas das duas entram e a guia vai pra conferência.
  var dataArq = dica && dica.data && !datas.some(function (ds) { return Math.abs(diasEntre_(ds, dica.data)) <= 1; }) ? dica.data : '';
  var linhas = [], vistos = {}, buscar = function (ds, origem) {
    var d = parseData_(ds), cands = [];
    [new Date(d.getFullYear(), d.getMonth() - 1, 15), d, new Date(d.getFullYear(), d.getMonth() + 1, 15)].forEach(function (dm) {
      var aba = nomeAbaMes_(dm); if (cands.some(function (c) { return c.aba === aba; }) || !planilha_().getSheetByName(aba)) return;
      linhasMes_(aba).linhas.forEach(function (r) {
        if (r.paciente !== paciente || !/^Atendido/.test(r.oque) || ehPerdido_(r.pago)) return;
        var convL = !r.convenio || /^Particular$/i.test(r.convenio) ? '' : r.convenio;
        if (!(convL || /^Convênio/i.test(r.pago))) return;
        if (convL && conv && semAcento_(convL) !== semAcento_(conv)) return;
        var dr = parseData_(r.data); if (!dr) return; var dif = Math.abs(diasEntre_(r.data, ds)); if (dif > 1) return;
        cands.push({ aba: aba, id: r.id, linha: r.linha, data: r.data, hora: r.hora, profissional: r.profissional, procedimento: r.procedimento, guia: r.guia, guiaN: '', dif: dif, dataGuia: ds, origem: origem });
      });
    });
    var exatas = cands.filter(function (c) { return c.dif === 0; }), usar = exatas.length ? exatas : cands;
    if (exatas.length === 0 && cands.length) motivos.push('sessão de ' + ds + ' não achada; sugeri a de ' + cands[0].data);
    var novas = 0; usar.forEach(function (c) { var k = c.aba + '|' + (c.id || c.linha); if (!vistos[k]) { vistos[k] = 1; linhas.push(c); novas++; } });
    return novas;
  };
  if (paciente) {
    datas.forEach(function (ds) { buscar(ds, 'guia'); });
    if (dataArq) {
      var nArq = buscar(dataArq, 'arquivo');
      if (nArq) { motivos.push('data lida na guia (' + datas.join(', ') + ') difere da do nome do arquivo (' + dataArq + '): confira qual sessão é'); baixa = true; }
    }
  }
  var tipo = !linhas.length ? 'nenhuma' : linhas.length === 1 ? 'uma' : 'varias';
  if (paciente && (datas.length || dataArq) && tipo === 'nenhuma') motivos.push('nenhuma sessão de convênio de ' + paciente + ' em ' + datas.concat(dataArq ? [dataArq + ' (nome do arquivo)'] : []).join(', '));
  return { paciente: paciente, como: como, confianca: baixa ? 'baixa' : 'alta', motivos: motivos, linhas: linhas, tipo: tipo, datas: datas };
}

/* ---------- leitura (gatilho diário ou botão) ---------- */
// dica do nome da subpasta (paciente) e do arquivo ("dd-mm Nome.pdf"): nome e data da sessão
function dicaGuia_(a) {
  var ano = a.ano || new Date().getFullYear(), dica = dicaDoNome_(a.sub || a.nome, ano), dicaArq = dicaDoNome_(a.nome, ano);
  if (!dica.nome) dica.nome = dicaArq.nome; if (!dica.data) dica.data = dicaArq.data;
  return dica;
}
// casa as guias lidas de um arquivo com as linhas das abas do mês (determinístico, sem modelo) → status, sugestão, confiança, motivos
function casamentoGuia_(guias, a) {
  var dica = dicaGuia_(a), cas = guias.map(function (g) { return casarGuia_(g, a.conv, dica, a.mesNome); });
  var linhas = [], vistos = {}, motivos = [], pacientes = [], baixa = false, semLinha = false;
  cas.forEach(function (c) { c.linhas.forEach(function (l) { var k = l.aba + '|' + (l.id || l.linha); if (!vistos[k]) { vistos[k] = 1; linhas.push(l); } }); c.motivos.forEach(function (m) { if (motivos.indexOf(m) < 0) motivos.push(m); }); if (c.paciente && pacientes.indexOf(c.paciente) < 0) pacientes.push(c.paciente); if (c.confianca === 'baixa') baixa = true; if (c.tipo === 'nenhuma') semLinha = true; });
  var status = !linhas.length ? 'sem_atendimento' : baixa ? 'baixa_confianca' : 'lida';
  if (status === 'lida' && semLinha) { status = 'baixa_confianca'; motivos.push('parte das datas sem sessão registrada'); }
  var sug = { paciente: pacientes.join(' / '), linhas: linhas.map(function (l) { return { aba: l.aba, id: l.id, linha: l.linha, data: l.data, hora: l.hora, profissional: l.profissional, procedimento: l.procedimento, guia: l.guia, origem: l.origem || '' }; }), datas: [].concat.apply([], cas.map(function (c) { return c.datas; })), como: cas[0] && cas[0].como };
  return { status: status, sug: sug, confianca: baixa ? 'baixa' : 'alta', motivos: motivos.join('; ') };
}
// guia já lida e ainda pendente (lida · sem atendimento · baixa confiança): refaz o casamento com o que o modelo leu (custo 0).
// Devolve true se status ou sugestão mudaram (ex.: a sessão foi lançada depois da leitura, ou o casamento melhorou).
function recasarGuia_(idx, h, a) {
  var r = idx.porId[a.id]; if (!r) return false;
  var st = String(r['Status'] || ''); if (st !== 'lida' && st !== 'sem_atendimento' && st !== 'baixa_confianca') return false;
  var lido = parseJSON_(r['Resultado']); if (!lido || !lido.e_guia || !(lido.guias || []).length) return false;
  var cm = casamentoGuia_(lido.guias, a), sugAntes = JSON.stringify(parseJSON_(r['Sugestão']) || {}), sugNova = JSON.stringify(cm.sug);
  if (cm.status === st && sugNova === sugAntes && cm.motivos === String(r['Motivos'] || '')) return false;
  gravarCelulas_(idx.s, r._linha, h, { 'Status': cm.status, 'Sugestão': sugNova, 'Confiança': cm.confianca, 'Motivos': cm.motivos, 'Observação': 'sugestão refeita em ' + agora_() + (st !== cm.status ? ' (era ' + st + ')' : '') });
  r['Status'] = cm.status; r['Sugestão'] = sugNova; r['Motivos'] = cm.motivos;
  return true;
}
function lerGuias_(opts) {
  opts = opts || {};
  var t0 = new Date().getTime(), cfg = iaConfig_(), quem = opts.quem || usuario_().email || 'gatilho';
  var res = { ok: true, lidas: 0, confirmar: 0, conferir: 0, ignoradas: 0, comErro: 0, duplicadas: 0, restantes: 0, custo: 0, parou: '', mensagens: [], quando: agora_() };
  var fim = function () { res.duracao = Math.round((new Date().getTime() - t0) / 1000); propIA_('ia_guias_ultima', JSON.stringify({ quando: res.quando, lidas: res.lidas, confirmar: res.confirmar, conferir: res.conferir, comErro: res.comErro, restantes: res.restantes, parou: res.parou, custo: res.custo, origem: opts.origem || '' })); return res; };
  var bloq = iaBloqueio_('guias', cfg); if (bloq) { res.ok = false; res.parou = bloq.motivo; res.mensagens.push(bloq.mensagem); return fim(); }
  if (!iaChave_()) { res.ok = false; res.parou = 'sem_chave'; res.mensagens.push('Chave da API não configurada: leitura automática indisponível.'); return fim(); }
  var raiz; try { raiz = DriveApp.getFolderById(String(cfg.pasta_guias_id || '').trim()); } catch (e) { res.ok = false; res.parou = 'pasta'; res.mensagens.push('Não consegui abrir a pasta das guias (' + (e && e.message || e) + '). Confira pasta_guias_id na aba IA e a permissão do Drive no carregador.'); return fim(); }
  var meses = mesesGuias_(cfg, opts.mes), lista = [], itc = raiz.getFolders();
  while (itc.hasNext()) {
    var pc = itc.next(), conv = convenioDaPasta_(pc.getName());
    meses.forEach(function (m) { var pm = pastaMes_(pc, m.idx, m.ano); if (!pm) return; var tmp = []; arquivosEm_(pm, pc.getName() + '/' + pm.getName(), tmp, 0); tmp.forEach(function (a) { a.conv = conv; a.ano = m.ano; a.mesNome = m.nome; lista.push(a); }); });
  }
  var idx = guiasLidasIdx_(), novos = lista.filter(function (a) { var r = idx.porId[a.id]; return !r || String(r['Status'] || '') === 'erro'; });
  // ordem: pasta, depois nome; "nome (1).pdf" (cópia baixada de novo) depois de "nome.pdf", pra duplicata apontar pro original
  var chaveOrd = function (a) { return a.pasta + '/' + a.nome.replace(/\s*\(\d+\)(\.[a-z0-9]+)?$/i, '$1') + (/\(\d+\)/.test(a.nome) ? '~' : ''); };
  novos.sort(function (a, b) { return chaveOrd(a).localeCompare(chaveOrd(b)); });
  var max = Number(cfg.guias_max_por_execucao) || 25, s = abaGuias_(), h = cabecalhos_(s), feitos = 0, processados = 0;
  var gravar = function (a, pares) { var r = idx.porId[a.id], linha = r ? r._linha : proximaLinha_(s, h['ID do arquivo']); var base = { 'ID do arquivo': a.id, 'Nome': a.nome, 'Pasta': a.pasta, 'Link': a.url, 'Convênio': a.conv || '', 'Data de leitura': agora_() }; Object.keys(pares).forEach(function (k) { base[k] = pares[k]; }); gravarCelulas_(s, linha, h, base); if (!r) idx.porId[a.id] = Object.assign({ _linha: linha, id: a.id }, base); };
  for (var i = 0; i < novos.length; i++) {
    var a = novos[i];
    if (feitos >= max || new Date().getTime() - t0 > GUIA_ORCAMENTO_MS) { res.parou = res.parou || 'limite'; break; }
    processados++;
    var tipo = GUIA_MIMES[a.mime.toLowerCase()];
    if (!tipo) { gravar(a, { 'Status': 'nao_lida_tipo', 'Observação': 'tipo ' + (a.mime || '?') + ': o app só lê PDF, JPG e PNG' }); res.ignoradas++; continue; }
    var blob, bytes; try { blob = a.file.getBlob(); bytes = blob.getBytes(); } catch (e1) { gravar(a, { 'Status': 'erro', 'Observação': 'não consegui abrir: ' + (e1 && e1.message || e1) }); res.comErro++; continue; }
    var hs = hashBytes_(bytes), dup = hs && idx.porHash[hs];
    if (dup && dup.id !== a.id) { gravar(a, { 'Status': 'duplicada', 'Hash': hs, 'Observação': 'mesmo conteúdo que ' + (dup['Nome'] || dup.id) + ' (' + dup['Pasta'] + ')' }); res.duplicadas++; continue; }
    var pacs = pacientesConvenio_(a.conv);
    var texto = 'Arquivo: ' + a.nome + '\nPasta: ' + a.pasta + (a.sub ? ' (subpasta do paciente: ' + a.sub + ')' : '') + '\nConvênio da pasta: ' + (a.conv || '?') + '\nMês da pasta: ' + (a.mesNome || '') + '/' + (a.ano || '') + '\n\nPacientes de convênio cadastrados (nome · carteirinha · convênio):\n' +
      pacs.map(function (p) { return p.nome + ' · ' + (carteirinhas_().porNome[p.nome] || '-') + ' · ' + p.convenio; }).join('\n');
    var r = chamarIA('guias', { documentos: [{ nome: a.nome, bytes: bytes, mime: tipo === 'img' ? a.mime.toLowerCase() : 'application/pdf' }], texto: texto, schema: GUIA_SCHEMA, maxTokens: 3000, arquivos: 1, linhas: pacs.length, quem: quem, observacao: a.pasta + '/' + a.nome });
    feitos++;
    if (!r.ok) {
      if (r.motivo === 'recusa' || r.motivo === 'json_invalido') { gravar(a, { 'Status': 'erro', 'Hash': hs, 'Observação': r.mensagem, 'Custo (US$)': r.custo || 0 }); res.comErro++; res.custo += r.custo || 0; continue; }
      if (r.motivo === 'erro_api') { gravar(a, { 'Status': 'erro', 'Hash': hs, 'Observação': r.mensagem }); res.comErro++; if (res.comErro >= 3) { res.parou = 'erro_api'; res.mensagens.push('leitura automática indisponível hoje (' + r.mensagem + ')'); break; } continue; }
      processados--; res.parou = r.motivo; res.mensagens.push(r.mensagem); break; // pausa, teto ou chave: nada é gravado; o arquivo fica pro próximo dia
    }
    res.custo += r.custo || 0;
    if (hs) idx.porHash[hs] = { id: a.id, Nome: a.nome, Pasta: a.pasta }; // só o que foi lido vale como original de uma duplicata
    var d = r.dados || {}, guias = (d.guias || []).filter(function (g) { return g && !g.continuacao_da_anterior; }), lido = { e_guia: d.e_guia !== false && guias.length > 0, observacao: d.observacao || '', guias: guias, modelo: r.modelo, tokens: r.usage };
    if (!lido.e_guia) { gravar(a, { 'Status': 'nao_e_guia', 'Hash': hs, 'Resultado': JSON.stringify(lido), 'Confiança': 'baixa', 'Motivos': 'o modelo não viu uma guia: ' + (d.observacao || ''), 'Páginas': (d.guias || []).length, 'Custo (US$)': r.custo || 0 }); res.conferir++; continue; }
    var cm = casamentoGuia_(guias, a);
    gravar(a, { 'Status': cm.status, 'Hash': hs, 'Resultado': JSON.stringify(lido), 'Sugestão': JSON.stringify(cm.sug), 'Confiança': cm.confianca, 'Motivos': cm.motivos, 'Páginas': guias.length, 'Custo (US$)': r.custo || 0, 'Observação': '' });
    res.lidas++; if (cm.status === 'lida') res.confirmar++; else res.conferir++;
  }
  res.restantes = Math.max(0, novos.length - processados);
  // refaz o casamento (sem chamar o modelo) das guias ainda pendentes: a sessão pode ter sido lançada depois da leitura
  res.recasadas = 0;
  try { lista.forEach(function (a) { if (novos.indexOf(a) >= 0) return; if (new Date().getTime() - t0 > GUIA_ORCAMENTO_MS) return; if (recasarGuia_(idx, h, a)) res.recasadas++; }); } catch (e2) { res.mensagens.push('não refiz as sugestões pendentes: ' + (e2 && e2.message || e2)); }
  SpreadsheetApp.flush();
  res.novos = novos.length; res.custo = Math.round(res.custo * 1e6) / 1e6; res.custoPorGuia = res.lidas ? Math.round(res.custo / res.lidas * 1e6) / 1e6 : 0;
  return fim();
}
ROTINAS_IA_.push(function () { return lerGuias_({ origem: 'gatilho', quem: 'gatilho' }); });
// botão "Ler guias agora" (gestão): mês escolhido ou o corrente
API.lerGuias = function (d) { d = d || {}; if (usuario_().perfil !== 'gestao') return { ok: false, erros: ['Só a gestão dispara a leitura.'] }; var r = lerGuias_({ mes: String(d.mes || '').trim(), origem: 'tela' }); r.erros = r.ok ? [] : r.mensagens.slice(); return r; };

/* ---------- card do Meu dia e das Pendências ---------- */
function parseJSON_(t) { try { return JSON.parse(String(t || '')) || null; } catch (e) { return null; } }
function thumb_(id) { return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w240'; }
function guiaItem_(r) {
  var lido = parseJSON_(r['Resultado']) || {}, sug = parseJSON_(r['Sugestão']) || { linhas: [] };
  var g = (lido.guias || [])[0] || {};
  return { id: r.id, nome: r['Nome'], pasta: r['Pasta'], link: r['Link'], miniatura: thumb_(r.id), convenio: r['Convênio'], lidaEm: r['Data de leitura'], status: r['Status'], confianca: r['Confiança'] || '', motivos: r['Motivos'] || '', obs: r['Observação'] || '',
    lido: { numero: g.numero_guia || '', carteirinha: g.carteirinha || '', nome: g.beneficiario || '', datas: [].concat.apply([], (lido.guias || []).map(function (x) { return (x.datas || []).map(dataLida_).filter(Boolean); })), procedimento: g.procedimento || '', quantidade: g.quantidade || 0, assinatura: g.assinatura_visivel !== false, legibilidade: g.legibilidade || '', observacao: lido.observacao || '', paginas: (lido.guias || []).length, numeros: (lido.guias || []).map(function (x) { return x.numero_guia; }).filter(Boolean) },
    sugestao: { paciente: sug.paciente || '', linhas: sug.linhas || [], como: sug.como || '' }, confirmadoPor: r['Confirmado por'] || '', linhasGravadas: r['Linhas gravadas'] || '', custo: numBR_(r['Custo (US$)']) };
}
// linhas de convênio do paciente nos meses das datas (mês anterior e seguinte também) pra "Escolher outra linha"
function candidatasGuia_(paciente, datas) {
  var abas = {}, out = [];
  (datas.length ? datas : [hoje_()]).forEach(function (ds) { var d = parseData_(ds) || new Date(); [new Date(d.getFullYear(), d.getMonth() - 1, 15), d, new Date(d.getFullYear(), d.getMonth() + 1, 15)].forEach(function (dm) { abas[nomeAbaMes_(dm)] = 1; }); });
  Object.keys(abas).forEach(function (aba) { if (!planilha_().getSheetByName(aba)) return; linhasMes_(aba).linhas.forEach(function (r) { if (r.paciente !== paciente || !/^Atendido/.test(r.oque)) return; var convL = !r.convenio || /^Particular$/i.test(r.convenio) ? '' : r.convenio; if (!(convL || /^Convênio/i.test(r.pago))) return; out.push({ aba: aba, id: r.id, linha: r.linha, data: r.data, hora: r.hora, profissional: r.profissional, procedimento: r.procedimento, guia: r.guia }); }); });
  return out.slice(-40);
}
API.guiasLidas = function (d) {
  d = d || {};
  var idx = guiasLidasIdx_(), ontem = fmtData_(dataMais_(new Date(), -1)), itens = [], nOntem = 0;
  idx.linhas.forEach(function (r) {
    var st = String(r['Status'] || ''); if (!GUIA_STATUS_PENDENTE[st] && !(d.todas && GUIA_STATUS_CONFERIR[st])) return;
    var it = guiaItem_(r); if (String(it.lidaEm || '').slice(0, 10) === ontem) nOntem++;
    if (d.candidatas !== false) it.candidatas = it.sugestao.paciente ? candidatasGuia_(it.sugestao.paciente.split(' / ')[0], it.lido.datas) : [];
    itens.push(it);
  });
  itens.sort(function (a, b) { return String(b.lidaEm).localeCompare(String(a.lidaEm)) || String(a.nome).localeCompare(String(b.nome)); });
  var estado = API.iaEstado();
  return { ok: true, itens: itens, ontem: nOntem, ontemData: ontem, ia: { pausada: estado.pausada, mensagem: estado.mensagem, ultima: estado.ultimaGuias } };
};
function linhaGuias_(idx, idArquivo) { var r = idx.porId[String(idArquivo || '').trim()]; return r || null; }
// Confirmar: grava Guia assinada? = Sim, Nº da guia e Link da guia nas linhas escolhidas, com log; opcionalmente a carteirinha no cadastro
API.confirmarGuia = function (d) {
  d = d || {};
  var u = usuario_(), linhas = (d.linhas || []).filter(function (l) { return l && l.aba && (l.id || l.linha); });
  if (!linhas.length) return { ok: false, erros: ['Escolha pelo menos uma linha.'] };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var idx = guiasLidasIdx_(), r = linhaGuias_(idx, d.idArquivo); if (!r) return { ok: false, erros: ['Guia não encontrada na aba Guias lidas.'] };
    if (String(r['Status'] || '') === 'confirmada' && !d.denovo) return { ok: false, erros: ['Esta guia já foi confirmada (' + r['Confirmado por'] + ').'] };
    var it = guiaItem_(r), numero = String(d.numero != null ? d.numero : (it.lido.numeros.join(', ') || it.lido.numero)).trim(), link = String(r['Link'] || ''), carimbo = (u.email || 'app') + ' · ' + agora_();
    var HM = CONFIG.HM, gravadas = [], erros = [], sa = abaComCabecalho_(CONFIG.ABA.ALT_LANC, CONFIG.HL_LANC), ha = cabecalhos_(sa);
    linhas.forEach(function (l) {
      var s = planilha_().getSheetByName(l.aba); if (!s) { erros.push('Aba ' + l.aba + ' não existe.'); return; }
      var bloq = bloqueioPlanilha_([s]); if (bloq) { erros.push(bloq); return; }
      var h = garantirColunas_(s, [HM.GUIA_N, HM.GUIA_LINK]).h, linha = 0;
      if (l.id && h[HM.ID]) { var ids = s.getRange(2, h[HM.ID], Math.max(s.getLastRow() - 1, 1), 1).getValues(); for (var i = 0; i < ids.length; i++) if (String(ids[i][0]).trim() === String(l.id).trim()) { linha = i + 2; break; } }
      if (!linha && l.linha) { linha = Number(l.linha); if (!(linha >= 2) || String(s.getRange(linha, h[HM.PACIENTE]).getValue() || '').trim() !== String(it.sugestao.paciente.split(' / ')[0] || l.paciente || '')) linha = 0; }
      if (!linha) { erros.push('Não achei a linha ' + (l.id || l.linha) + ' em ' + l.aba + '.'); return; }
      var atual = s.getRange(linha, 1, 1, s.getLastColumn()).getValues()[0], g = function (k) { var c = h[HM[k]]; return c ? String(atual[c - 1] == null ? '' : atual[c - 1]).trim() : ''; };
      var pares = {}, mud = [], paciente = g('PACIENTE');
      if (g('GUIA') !== 'Sim') { pares[HM.GUIA] = 'Sim'; mud.push({ campo: 'Guia assinada?', de: g('GUIA'), para: 'Sim' }); }
      if (numero && g('GUIA_N') !== numero) { var nv = g('GUIA_N') && g('GUIA_N').indexOf(numero) < 0 ? g('GUIA_N') + ', ' + numero : numero; pares[HM.GUIA_N] = nv; mud.push({ campo: 'Nº da guia', de: g('GUIA_N'), para: nv }); }
      if (link && g('GUIA_LINK') !== link) { pares[HM.GUIA_LINK] = link; mud.push({ campo: 'Link da guia', de: g('GUIA_LINK') ? '(outro link)' : '', para: link }); }
      if (!mud.length) { gravadas.push(l.aba + ':' + (l.id || linha) + ' (já estava)'); return; }
      if (h[HM.LOG]) pares[HM.LOG] = (g('LOG') ? g('LOG') + ' | ' : '') + 'guia lida (IA) confirmada por ' + carimbo;
      gravarCelulas_(s, linha, h, pares);
      mud.forEach(function (m) { gravarCelulas_(sa, proximaLinha_(sa, ha['ID']), ha, { 'Data/hora': agora_(), 'Aba': l.aba, 'ID': l.id || ('linha ' + linha), 'Paciente': paciente, 'Campo': m.campo, 'De': m.de, 'Para': m.para, 'Quem informou': 'guia lida pela IA (' + r['Nome'] + ') · confirmada por ' + (u.perfil === 'gestao' ? 'gestão' : 'recepção'), 'Registrado por (app)': carimbo }); });
      gravadas.push(l.aba + ':' + (l.id || linha));
    });
    if (!gravadas.length) return { ok: false, erros: erros.length ? erros : ['Nada gravado.'] };
    // carteirinha lida → cadastro (só se o cadastro estiver vazio), com log em Alterações de cadastro
    var cartGravada = '';
    if (d.gravarCarteirinha && it.lido.carteirinha && it.sugestao.paciente) {
      var nomeP = it.sugestao.paciente.split(' / ')[0], sp = aba_(CONFIG.ABA.PACIENTES), hp = garantirColunasPacientes_().h, p = indicePacientes_().filter(function (x) { return x.nome === nomeP; })[0];
      if (p && hp[CONFIG.H.CARTEIRINHA]) {
        var cAtual = String(sp.getRange(p.linha, hp[CONFIG.H.CARTEIRINHA]).getValue() || '').trim(), numC = Duplicatas.digitos(it.lido.carteirinha);
        if (!cAtual && numC) {
          sp.getRange(p.linha, hp[CONFIG.H.CARTEIRINHA]).setNumberFormat('@').setValue(numC);
          if (hp[CONFIG.H.LOG]) sp.getRange(p.linha, hp[CONFIG.H.LOG]).setValue((String(sp.getRange(p.linha, hp[CONFIG.H.LOG]).getValue() || '') + ' | carteirinha lida na guia por ' + carimbo).replace(/^ \| /, ''));
          var sc = abaComCabecalho_(CONFIG.ABA.ALTERACOES, CONFIG.HC), hc = cabecalhos_(sc);
          gravarCelulas_(sc, proximaLinha_(sc, hc['Paciente']), hc, { 'Data/hora': agora_(), 'Paciente': nomeP, 'Campo': CONFIG.H.CARTEIRINHA, 'De': '', 'Para': numC, 'Quem informou': 'guia lida pela IA (' + r['Nome'] + ')', 'Registrado por (app)': carimbo });
          cartGravada = numC; invalidar_(['pac']); delete MEMO_.cart;
        }
      }
    }
    var hg = cabecalhos_(idx.s);
    gravarCelulas_(idx.s, r._linha, hg, { 'Status': 'confirmada', 'Confirmado por': carimbo, 'Linhas gravadas': gravadas.join(', '), 'Observação': (String(r['Observação'] || '') + (d.observacao ? ' | ' + d.observacao : '')).replace(/^ \| /, '') });
    invalidar_(['comp']); SpreadsheetApp.flush();
    return { ok: true, gravadas: gravadas, erros: erros, carteirinha: cartGravada, numero: numero };
  } finally { lock.releaseLock(); }
};
// Não é guia / ignorar (com motivo): a linha fica como ignorada; o arquivo não é lido de novo
API.ignorarGuia = function (d) {
  d = d || {}; var u = usuario_();
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var idx = guiasLidasIdx_(), r = linhaGuias_(idx, d.idArquivo); if (!r) return { ok: false, erros: ['Guia não encontrada.'] };
    var hg = cabecalhos_(idx.s), carimbo = (u.email || 'app') + ' · ' + agora_();
    gravarCelulas_(idx.s, r._linha, hg, { 'Status': 'ignorada', 'Confirmado por': carimbo, 'Observação': 'ignorada: ' + String(d.motivo || 'não é guia').trim() });
    SpreadsheetApp.flush();
    return { ok: true };
  } finally { lock.releaseLock(); }
};

/* ---------- Pendências: "PDF na pasta?" na lista Convênio sem guia + card Guias a conferir ---------- */
var gestaoResumoSemIA_ = API.gestaoResumo;
API.gestaoResumo = function (d) {
  var r = gestaoResumoSemIA_(d);
  if (!r || !r.ok) return r;
  try {
    var idx = guiasLidasIdx_(), porId = {}, porPacData = {}, conferir = [];
    idx.linhas.forEach(function (g) {
      var st = String(g['Status'] || ''); if (st === 'ignorada' || st === 'nao_lida_tipo' || st === 'duplicada') return;
      var it = guiaItem_(g);
      (it.sugestao.linhas || []).forEach(function (l) { if (l.id) porId[l.id] = it.nome; });
      String(g['Linhas gravadas'] || '').split(',').forEach(function (x) { var m = x.trim().match(/^[^:]+:([^ ]+)/); if (m) porId[m[1]] = it.nome; });
      var nomes = (it.sugestao.paciente || '').split(' / ').concat(it.lido.nome ? [it.lido.nome] : []);
      nomes.forEach(function (n) { if (!n) return; it.lido.datas.forEach(function (ds) { porPacData[Duplicatas.normalizar(n) + '|' + ds] = it.nome; }); });
      if (GUIA_STATUS_CONFERIR[st] && usuario_().perfil === 'gestao') conferir.push(it);
    });
    (r.semGuia || []).forEach(function (l) { var arq = (l.id && porId[l.id]) || porPacData[Duplicatas.normalizar(l.paciente) + '|' + l.data] || ''; l.pdfNaPasta = arq ? 'sim' : 'não'; l.pdfArquivo = arq; });
    r.guiasAConferir = conferir;
  } catch (e) { r.guiasAConferir = []; r.guiasErro = String(e && e.message || e); }
  return r;
};
