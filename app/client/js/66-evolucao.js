/* ================= EVOLUÇÃO E SAÚDE FINANCEIRA (só gestão, Fase 2, 17/10) =================
   Lê API.evolucao: por mês, os números do fechamento (aba "Evolução mensal") e os atendimentos (histórico do ControleOdonto
   antes do app + abas de mês do app). Gráficos em SVG desenhados aqui (sem biblioteca): colunas, colunas empilhadas, colunas
   agrupadas e linhas, com legenda, dica ao passar o mouse/dedo e a tabela "Mês a mês" com os mesmos números.
   Plantões ficam num bloco recolhido, fora dos números da operação própria. */
var EV = null, evGen = 0, evResizeT = null;
var EV_COR = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4']; // paleta categórica validada (ordem fixa; contraste baixo compensado por legenda + tabela)
INICIAR.evolucao = function () {
  if (!ehGestao()) { go('hoje'); return toast('Só a gestão vê a Evolução'); }
  carregarEV();
};
function carregarEV() {
  var gen = ++evGen; $("#ev-carregando").hidden = false; $("#ev-carregando").textContent = 'Carregando…'; $("#ev-corpo").hidden = true;
  call('evolucao', {}).then(function (r) {
    if (gen !== evGen || !aindaNa('evolucao', navGen)) return;
    $("#ev-carregando").hidden = true;
    if (!r.ok) { $("#ev-aviso").innerHTML = erroBox(r.erros || [], 'Não consegui carregar'); return; }
    $("#ev-aviso").innerHTML = r.temAbaEvolucao ? '' : '<div class="faixa">Falta a aba <b>Evolução mensal</b> na planilha: os gráficos de dinheiro ficam vazios até ela existir.</div>';
    EV = r; $("#ev-corpo").hidden = false; renderEV();
  }).catch(function (e) { if (gen === evGen) $("#ev-carregando").textContent = 'Não consegui carregar: ' + e.message; });
}
window.addEventListener('resize', function () { clearTimeout(evResizeT); evResizeT = setTimeout(function () { if (EV && telaAtual === 'evolucao') renderGraficosEV(); }, 150); });

/* ---------- formatos ---------- */
function evNum(n, casas) { return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 }); }
function evMil(n) { if (n == null) return '—'; var a = Math.abs(n), s = n < 0 ? '−' : ''; return s + 'R$ ' + (a >= 1000 ? evNum(a / 1000, a >= 100000 ? 0 : 1) + ' mil' : evNum(a)); }
function evRS(n) { return n == null ? '—' : (n < 0 ? '−' : '') + 'R$ ' + brl(Math.abs(n)); }
function evPct(n) { return n == null ? '—' : evNum(n) + '%'; }
function evEixo(n, tipo) { if (tipo === 'pct') return evNum(n) + '%'; if (tipo === 'qtd') return evNum(n); var a = Math.abs(n); return (n < 0 ? '−' : '') + (a >= 1000 ? evNum(a / 1000) + 'k' : evNum(a)); }

/* ---------- gráfico ----------
   cfg: { rot: [rótulos], series: [{ nome, cor, v: [números ou null] }], tipo: 'col' | 'pilha' | 'grupo' | 'linha', eixo: 'rs' | 'pct' | 'qtd',
          teto: corta o eixo neste valor (o ponto acima mostra o valor real), ref: { v, txt } linha de referência, marca: { i, txt } início de algo,
          extra: function (i) → linhas a mais na dica } */
function evPasso(max) { var bruto = max / 4, p = Math.pow(10, Math.floor(Math.log10(bruto || 1))), m = bruto / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; }
function evBarra(x, yBase, yFim, w, r) { // retângulo com a ponta de dado arredondada (4px) e a base reta
  var h = Math.abs(yFim - yBase); r = Math.min(r, h, w / 2); var cima = yFim < yBase, y0 = Math.min(yBase, yFim);
  if (h < 0.5) return '';
  return cima ? 'M' + x + ',' + yBase + 'V' + (y0 + r) + 'Q' + x + ',' + y0 + ' ' + (x + r) + ',' + y0 + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y0 + ' ' + (x + w) + ',' + (y0 + r) + 'V' + yBase + 'Z'
    : 'M' + x + ',' + yBase + 'V' + (yFim - r) + 'Q' + x + ',' + yFim + ' ' + (x + r) + ',' + yFim + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + yFim + ' ' + (x + w) + ',' + (yFim - r) + 'V' + yBase + 'Z';
}
function evGrafico(host, cfg) {
  var n = cfg.rot.length, W = Math.max(280, host.clientWidth || 560), cel = W < 480, H = cel ? 190 : 210, L = 46, R = 10, T = 14, B = 24;
  var vals = [], fmtV = function (v) { return cfg.eixo === 'pct' ? evPct(v) : cfg.eixo === 'qtd' ? (v == null ? '—' : evNum(v)) : evRS(v); };
  for (var i = 0; i < n; i++) {
    if (cfg.tipo === 'pilha') { var pos = 0, neg = 0; cfg.series.forEach(function (s) { var v = s.v[i] || 0; if (v > 0) pos += v; else neg += v; }); vals.push(pos, neg); }
    else cfg.series.forEach(function (s) { if (s.v[i] != null) vals.push(s.v[i]); });
  }
  if (cfg.ref) vals.push(cfg.ref.v);
  var max = Math.max.apply(null, vals.concat([0])), min = Math.min.apply(null, vals.concat([0]));
  if (cfg.teto && max > cfg.teto) max = cfg.teto;
  var passo = evPasso(Math.max(max - min, 1)), yMax = Math.ceil(max / passo) * passo, yMin = Math.floor(min / passo) * passo; if (yMax === yMin) yMax = yMin + passo;
  var y = function (v) { return T + (yMax - Math.min(v, yMax)) / (yMax - yMin) * (H - T - B); }, bw = (W - L - R) / n, cx = function (i) { return L + bw * i + bw / 2; };
  var s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(cfg.titulo || '') + '" class="ev-svg">';
  for (var t = yMin; t <= yMax + 1e-9; t += passo) {
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(t) + '" y2="' + y(t) + '" class="' + (Math.abs(t) < 1e-9 ? 'ev-zero' : 'ev-grade') + '"/>';
    s += '<text x="' + (L - 6) + '" y="' + (y(t) + 4) + '" class="ev-eixo" text-anchor="end">' + esc(evEixo(t, cfg.eixo)) + '</text>';
  }
  if (cfg.ref) s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(cfg.ref.v) + '" y2="' + y(cfg.ref.v) + '" class="ev-ref"/><text x="' + (W - R) + '" y="' + (y(cfg.ref.v) - 4) + '" class="ev-eixo" text-anchor="end">' + esc(cfg.ref.txt) + '</text>';
  if (cfg.marca && cfg.marca.i > 0) { var xm = L + bw * cfg.marca.i; s += '<line x1="' + xm + '" x2="' + xm + '" y1="' + T + '" y2="' + (H - B) + '" class="ev-ref"/><text x="' + (xm + 4) + '" y="' + (T + 8) + '" class="ev-eixo">' + esc(cfg.marca.txt) + '</text>'; }
  var pulo = bw < 34 ? 2 : 1;
  cfg.rot.forEach(function (r, i) { if (i % pulo === 0 || i === n - 1) s += '<text x="' + cx(i) + '" y="' + (H - 6) + '" class="ev-eixo" text-anchor="middle">' + esc(r) + '</text>'; });
  var y0 = y(0);
  if (cfg.tipo === 'col' || cfg.tipo === 'grupo') {
    var k = cfg.series.length, w = Math.min(cfg.tipo === 'grupo' ? 14 : 24, (bw * 0.7 - (k - 1) * 2) / k);
    cfg.series.forEach(function (se, j) { se.v.forEach(function (v, i) { if (v == null) return; var x = cx(i) - (k * w + (k - 1) * 2) / 2 + j * (w + 2), yv = y(v);
      if (v !== 0 && Math.abs(yv - y0) < 2) yv = v > 0 ? y0 - 2 : y0 + 2; // valor perto de zero (ex.: −R$ 63) ainda aparece como um traço de 2px
      s += '<path d="' + evBarra(x, y0, yv, w, 4) + '" fill="' + se.cor + '"/>'; }); });
  } else if (cfg.tipo === 'pilha') {
    var w2 = Math.min(24, bw * 0.6);
    for (var i2 = 0; i2 < n; i2++) {
      var base = 0, topo = -1; cfg.series.forEach(function (se, j) { if ((se.v[i2] || 0) > 0) topo = j; });
      cfg.series.forEach(function (se, j) {
        var v = se.v[i2] || 0; if (v <= 0) return;
        var yb = y(base) - (base > 0 ? 2 : 0), yt = y(base + v); base += v; // 2px de fundo entre os segmentos
        if (yb - yt < 0.5) return;
        s += j === topo ? '<path d="' + evBarra(cx(i2) - w2 / 2, yb, yt, w2, 4) + '" fill="' + se.cor + '"/>' : '<rect x="' + (cx(i2) - w2 / 2) + '" y="' + yt + '" width="' + w2 + '" height="' + (yb - yt) + '" fill="' + se.cor + '"/>';
      });
    }
  } else {
    cfg.series.forEach(function (se) {
      var d = '', caneta = false;
      se.v.forEach(function (v, i) { if (v == null) { caneta = false; return; } d += (caneta ? 'L' : 'M') + cx(i) + ',' + y(v); caneta = true; });
      s += '<path d="' + d + '" fill="none" stroke="' + se.cor + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
      se.v.forEach(function (v, i) {
        if (v == null) return; s += '<circle cx="' + cx(i) + '" cy="' + y(v) + '" r="4" fill="' + se.cor + '" stroke="#fff" stroke-width="2"/>';
        if (cfg.teto && v > cfg.teto) s += '<text x="' + (cx(i) + 7) + '" y="' + (y(v) + 4) + '" class="ev-rot">' + esc(fmtV(v)) + ' ↑</text>';
      });
    });
    if (cfg.series.length === 1) { var se1 = cfg.series[0], ult = -1; se1.v.forEach(function (v, i) { if (v != null) ult = i; }); if (ult >= 0 && !(cfg.teto && se1.v[ult] > cfg.teto)) s += '<text x="' + Math.min(cx(ult) + 8, W - R - 30) + '" y="' + (y(se1.v[ult]) - 8) + '" class="ev-rot">' + esc(fmtV(se1.v[ult])) + '</text>'; }
  }
  for (var h = 0; h < n; h++) s += '<rect class="ev-alvo" data-i="' + h + '" x="' + (L + bw * h) + '" y="' + T + '" width="' + bw + '" height="' + (H - T - B) + '" fill="transparent"/>';
  s += '</svg>';
  var leg = cfg.series.length > 1 ? '<div class="ev-leg">' + cfg.series.map(function (se) { return '<span><i style="background:' + se.cor + '"></i>' + esc(se.nome) + '</span>'; }).join('') + '</div>' : '';
  host.innerHTML = leg + '<div class="ev-area">' + s + '<div class="ev-dica" hidden></div></div>';
  var dica = host.querySelector('.ev-dica'), area = host.querySelector('.ev-area');
  var mostrar = function (e) {
    var a = e.target.closest('.ev-alvo'); if (!a) { dica.hidden = true; return; }
    var i = Number(a.getAttribute('data-i')), linhas = cfg.series.map(function (se) { return '<div><i style="background:' + se.cor + '"></i>' + esc(se.nome) + ' <b>' + esc(fmtV(se.v[i])) + '</b></div>'; });
    if (cfg.extra) linhas = linhas.concat(cfg.extra(i).map(function (t) { return '<div class="sub">' + esc(t) + '</div>'; }));
    dica.innerHTML = '<strong>' + esc(cfg.rot[i]) + '</strong>' + linhas.join(''); dica.hidden = false;
    var xa = Number(a.getAttribute('x')) + bw / 2, lw = dica.offsetWidth;
    dica.style.left = Math.max(0, Math.min(W - lw, xa + 12 + lw > W ? xa - lw - 12 : xa + 12)) + 'px'; dica.style.top = '4px';
  };
  area.addEventListener('pointermove', mostrar); area.addEventListener('pointerdown', mostrar);
  area.addEventListener('pointerleave', function () { dica.hidden = true; });
}

/* ---------- tela ---------- */
function evMeses() { return EV.meses; }
function evSerie(f, lista) { return (lista || evMeses()).map(function (m) { var v = f(m); return v == null || isNaN(v) ? null : v; }); }
// cada gráfico só com os meses que valem pra ele: dinheiro = meses fechados; atendimentos = meses com dados, menos o mês em andamento
function evMF() { return evMeses().filter(function (m) { return m.fin; }); }
function evMA() { return evMeses().filter(function (m) { return m.at && !m.at.parcial; }); }
var EV_GRAFS = [];
function renderEV() {
  var M = evMeses(), comFin = M.filter(function (m) { return m.fin; }), u = comFin[comFin.length - 1], a = comFin[comFin.length - 2];
  $("#ev-ref").textContent = u ? 'Último mês fechado: ' + u.rotulo + (a ? ' · setas comparam com ' + a.rotulo : '') + '. Receita própria = particular + Cedplan + Sabin + aluguel de sala (sem plantões).' : 'Nenhum mês fechado na aba Evolução mensal.';
  var tile = function (valor, nome, delta, atencao) { return '<div' + (atencao ? ' class="atencao"' : '') + '><b>' + esc(valor) + '</b><span>' + esc(nome) + '</span>' + (delta ? '<span class="ev-delta">' + esc(delta) + '</span>' : '') + '</div>'; };
  var dPct = function (k) { if (!a || !a.fin[k]) return ''; var d = (u.fin[k] - a.fin[k]) / Math.abs(a.fin[k]) * 100; return (d >= 0 ? '▲ ' : '▼ ') + evNum(Math.abs(d)) + '% vs ' + a.rotulo; };
  var dPp = function (k) { if (!a || a.fin[k] == null) return ''; var d = u.fin[k] - a.fin[k]; return (d >= 0 ? '▲ ' : '▼ ') + evNum(Math.abs(d)) + ' p.p. vs ' + a.rotulo; };
  var dRS = function (k) { if (!a) return ''; var d = u.fin[k] - a.fin[k]; return (d >= 0 ? '▲ ' : '▼ ') + evMil(Math.abs(d)) + ' vs ' + a.rotulo; };
  $("#ev-tiles").innerHTML = u ? tile(evMil(u.fin.propria), 'receita própria em ' + u.rotulo, dPct('propria')) + tile(evMil(u.fin.resultado), 'resultado do mês', dRS('resultado'), u.fin.resultado < 0)
    + tile(evMil(u.fin.resultadoProprio), 'resultado sem plantões', dRS('resultadoProprio'), u.fin.resultadoProprio < 0) + tile(evPct(u.fin.cobertura), 'cobertura do ponto de equilíbrio', dPp('cobertura'))
    + tile(evPct(u.fin.pessoalPct), 'pessoal sobre a receita própria', dPp('pessoalPct')) : '';
  var MF = evMF(), MA = evMA(), primeiroApp = -1; MA.forEach(function (m, i) { if (primeiroApp < 0 && /app/.test(m.at.fonte)) primeiroApp = i; });
  EV_GRAFS = [
    { t: 'Receita própria por origem', sub: 'sem plantões', meses: MF, cfg: { tipo: 'pilha', eixo: 'rs', series: [
      { nome: 'Particular', cor: EV_COR[0], v: evSerie(function (m) { return m.fin && m.fin.origem.particular; }, MF) },
      { nome: 'Cedplan', cor: EV_COR[1], v: evSerie(function (m) { return m.fin && m.fin.origem.cedplan; }, MF) },
      { nome: 'Sabin', cor: EV_COR[2], v: evSerie(function (m) { return m.fin && m.fin.origem.sabin; }, MF) },
      { nome: 'Aluguel de sala', cor: EV_COR[3], v: evSerie(function (m) { return m.fin && m.fin.origem.aluguel; }, MF) }],
      extra: function (i) { var f = MF[i].fin; return f ? ['Total: ' + evRS(f.propria)] : ['mês sem fechamento']; } } },
    { t: 'Atendimentos e pacientes', sub: 'por mês' + (primeiroApp > 0 ? ' · a partir de ' + MA[primeiroApp].rotulo + ' os números vêm do app' : ''), meses: MA, cfg: { tipo: 'linha', eixo: 'qtd', marca: primeiroApp > 0 ? { i: primeiroApp, txt: 'app' } : null, series: [
      { nome: 'Atendimentos', cor: EV_COR[0], v: evSerie(function (m) { return m.at && (m.at.atendimentosComFora || m.at.atendimentos); }, MA) },
      { nome: 'Pacientes únicos', cor: EV_COR[1], v: evSerie(function (m) { return m.at && m.at.pacientes; }, MA) },
      { nome: 'Pacientes novos', cor: EV_COR[2], v: evSerie(function (m) { return m.at && m.at.novos; }, MA) }],
      extra: function (i) { var t = MA[i].at, f = MA[i].fin, o = []; if (!t) return ['sem dados de atendimento']; o.push(evNum(t.frequencia, 1) + ' atendimentos por paciente'); if (t.atendimentosComFora) o.push('inclui ' + f.foraDoSistema + ' sessões fora do sistema'); if (t.parcial) o.push('mês em andamento'); o.push('fonte: ' + t.fonte); return o; } } },
    { t: 'Resultado do mês', sub: 'com e sem plantões', meses: MF, cfg: { tipo: 'grupo', eixo: 'rs', series: [
      { nome: 'Resultado', cor: EV_COR[0], v: evSerie(function (m) { return m.fin && m.fin.resultado; }, MF) },
      { nome: 'Sem plantões', cor: EV_COR[1], v: evSerie(function (m) { return m.fin && m.fin.resultadoProprio; }, MF) }] } },
    { t: 'Despesa por grupo', sub: 'competência do mês', meses: MF, cfg: { tipo: 'pilha', eixo: 'rs', series: [
      { nome: 'Pessoal', cor: EV_COR[0], v: evSerie(function (m) { return m.fin && m.fin.pessoal; }, MF) },
      { nome: 'Materiais e insumos', cor: EV_COR[1], v: evSerie(function (m) { return m.fin && m.fin.grupos['Materiais e Insumos']; }, MF) },
      { nome: 'Administrativo', cor: EV_COR[2], v: evSerie(function (m) { return m.fin && m.fin.grupos['Administrativo']; }, MF) },
      { nome: 'Marketing', cor: EV_COR[3], v: evSerie(function (m) { return m.fin && m.fin.grupos['Marketing']; }, MF) },
      { nome: 'Outros', cor: EV_COR[4], v: evSerie(function (m) { var g = m.fin && m.fin.grupos; return g && g['Infraestrutura'] + g['Medicina do Trabalho'] + g['Taxas e licenças'] + g['Tributos'] + g['Outros']; }, MF) }],
      extra: function (i) { var f = MF[i].fin; if (!f) return []; var g = f.grupos, o = ['Total: ' + evRS(f.despesa)]; ['Infraestrutura', 'Medicina do Trabalho', 'Taxas e licenças', 'Tributos', 'Outros'].forEach(function (k) { if (g[k]) o.push(k + ': ' + evRS(g[k])); }); if (g['Recuperações']) o.push('Pessoal já líquido de ' + evRS(-g['Recuperações']) + ' de recuperação'); return o; } } },
    { t: 'Pessoal sobre a receita própria', sub: 'quanto da receita própria vai para pessoal', meses: MF, cfg: { tipo: 'linha', eixo: 'pct', teto: 150, series: [
      { nome: 'Pessoal / receita própria', cor: EV_COR[0], v: evSerie(function (m) { return m.fin && m.fin.pessoalPct; }, MF) }],
      extra: function (i) { var f = MF[i].fin; return f ? ['Pessoal ' + evRS(f.pessoal) + ' · receita própria ' + evRS(f.propria)] : []; } } },
    { t: 'Cobertura do ponto de equilíbrio', sub: 'margem própria depois dos tributos ÷ despesa (100% = empata)', meses: MF, cfg: { tipo: 'linha', eixo: 'pct', ref: { v: 100, txt: 'empata' }, series: [
      { nome: 'Cobertura', cor: EV_COR[0], v: evSerie(function (m) { return m.fin && m.fin.cobertura; }, MF) }],
      extra: function (i) { var f = MF[i].fin; return f ? ['Margem própria ' + evRS(f.margemLiquida) + ' · despesa ' + evRS(f.despesa)] : []; } } },
    { t: 'Retenção', sub: 'dos atendidos no mês, quantos voltaram em até 90 e 120 dias', meses: MA, cfg: { tipo: 'linha', eixo: 'pct', series: [
      { nome: 'Voltou em até 90 dias', cor: EV_COR[0], v: evSerie(function (m) { return m.at && m.at.volta90 && m.at.volta90.pct; }, MA) },
      { nome: 'Voltou em até 120 dias', cor: EV_COR[1], v: evSerie(function (m) { return m.at && m.at.volta120 && m.at.volta120.pct; }, MA) }],
      extra: function (i) { var t = MA[i].at; if (!t) return []; var o = []; ['volta90', 'volta120'].forEach(function (k, j) { o.push((j ? '120' : '90') + ' dias: ' + (t[k] ? t[k].n + ' de ' + t[k].de + ' pacientes' : 'em apuração')); }); return o; } } },
    { t: 'Caixa', sub: 'saldo no fim do mês (parte tem dono: repasses a pagar, créditos dos sócios)', meses: MF, cfg: { tipo: 'linha', eixo: 'rs', series: [
      { nome: 'Patrimônio (bancos)', cor: EV_COR[0], v: evSerie(function (m) { return m.fin && m.fin.patrimonio; }, MF) },
      { nome: 'Acumulador tributário', cor: EV_COR[1], v: evSerie(function (m) { return m.fin && m.fin.acumulador; }, MF) }] } }
  ];
  $("#ev-graficos").innerHTML = EV_GRAFS.map(function (g, i) { return '<section class="card compacto ev-card"><div><h2 style="font-size:15px">' + esc(g.t) + '</h2><div class="muted" style="font-size:12px">' + esc(g.sub) + '</div></div><div class="ev-g" id="ev-g' + i + '"></div></section>'; }).join('');
  renderGraficosEV(); renderPlantoesEV(); renderTabelaEV(); renderNotasEV();
}
function renderGraficosEV() {
  var rot = function (l) { return l.map(function (m) { return m.rotulo.slice(0, 3); }); }, MF = evMF();
  EV_GRAFS.forEach(function (g, i) { var host = $("#ev-g" + i); if (host) evGrafico(host, Object.assign({ rot: rot(g.meses), titulo: g.t }, g.cfg)); });
  var pl = $("#ev-pl-graf"); if (pl && $("#ev-plantoes").open) evGrafico(pl, { rot: rot(MF), titulo: 'Plantões', tipo: 'pilha', eixo: 'rs', series: [
    { nome: 'Santa Casa', cor: EV_COR[0], v: evSerie(function (m) { return m.fin.santaCasa; }, MF) }, { nome: 'Unimed', cor: EV_COR[1], v: evSerie(function (m) { return m.fin.unimed; }, MF) }] });
}
$("#ev-plantoes").addEventListener('toggle', function () { if (this.open && EV) renderGraficosEV(); });
function renderPlantoesEV() {
  $("#ev-pl-linhas").innerHTML = evMeses().filter(function (m) { return m.fin; }).map(function (m) { var f = m.fin; return '<tr><td>' + esc(m.rotulo) + '</td><td class="num">' + esc(brl(f.santaCasa)) + '</td><td class="num">' + esc(brl(f.unimed)) + '</td><td class="num"><b>' + esc(brl(f.plantoes)) + '</b></td><td class="num">' + esc(brl(f.repassesPlantoes)) + '</td><td class="num">' + esc(brl(f.plantaoLiquido)) + '</td></tr>'; }).join('') || '<tr><td colspan="6" class="vazio">Nenhum mês fechado.</td></tr>';
}
function renderTabelaEV() {
  var C = [['Mês'], ['Receita própria', 1], ['Despesa', 1], ['Resultado', 1], ['Sem plantões', 1], ['Cobertura', 1], ['Pessoal %', 1], ['Atendimentos', 1], ['Pacientes', 1], ['Novos', 1], ['Volta 120 d', 1], ['Patrimônio', 1], ['Acumulador', 1], ['Conferido']];
  $("#ev-t-cab").innerHTML = '<tr>' + C.map(function (c) { return '<th' + (c[1] ? ' class="num"' : '') + '>' + esc(c[0]) + '</th>'; }).join('') + '</tr>';
  $("#ev-t-linhas").innerHTML = evMeses().map(function (m) {
    var f = m.fin || {}, t = m.at || {}, td = function (v, neg) { return '<td class="num' + (neg && v < 0 ? ' ev-neg' : '') + '">' + v + '</td>'; };
    return '<tr><td>' + esc(m.rotulo) + (t.parcial ? ' <span class="tag p cinza">em andamento</span>' : '') + '</td>' + td(m.fin ? esc(brl(f.propria)) : '—') + td(m.fin ? esc(brl(f.despesa)) : '—') + td(m.fin ? esc(evRS(f.resultado)) : '—', f.resultado) + td(m.fin ? esc(evRS(f.resultadoProprio)) : '—', f.resultadoProprio)
      + td(esc(evPct(f.cobertura))) + td(esc(evPct(f.pessoalPct))) + td(m.at ? esc(evNum(t.atendimentosComFora || t.atendimentos)) + (t.atendimentosComFora ? '*' : '') : '—') + td(m.at ? esc(evNum(t.pacientes)) : '—') + td(m.at ? esc(evNum(t.novos)) : '—')
      + td(t.volta120 ? esc(evPct(t.volta120.pct)) : m.at ? 'em apuração' : '—') + td(f.patrimonio != null ? esc(brl(f.patrimonio)) : '—') + td(f.acumulador != null ? esc(brl(f.acumulador)) : '—') + '<td>' + esc(m.fin ? (/^s/i.test(f.conferido) ? 'Sim' : 'a conferir') : '') + '</td></tr>';
  }).join('');
}
function renderNotasEV() {
  var M = evMeses(), notas = ['Regras dos fechamentos: o repasse dos plantões é ' + EV.regras.repassePlantao + '% e a margem própria desconta ' + EV.regras.tributo + '% de tributo sobre a receita própria.'];
  var app = M.filter(function (m) { return m.at && /app/.test(m.at.fonte); })[0], hist = M.filter(function (m) { return m.at && !/app/.test(m.at.fonte); });
  if (hist.length) notas.push('Atendimentos de ' + hist[0].rotulo + ' a ' + hist[hist.length - 1].rotulo + ': exports do ControleOdonto (aba Histórico de atendimentos)' + (app ? '; de ' + app.rotulo + ' em diante: as abas do app, que registram tudo (inclusive Sabin), então o salto nesse mês é em parte a troca de fonte.' : '.'));
  M.forEach(function (m) { if (m.fin && m.fin.obs) notas.push(m.rotulo + ': ' + m.fin.obs); if (m.at && m.at.atendimentosComFora) notas.push(m.rotulo + ': * inclui ' + m.fin.foraDoSistema + ' sessões fora do sistema (não entram em pacientes, novos e retenção).'); });
  var aConf = M.filter(function (m) { return m.fin && !/^s/i.test(m.fin.conferido); }).map(function (m) { return m.rotulo; });
  if (aConf.length) notas.push('A conferir na aba Evolução mensal (coluna Conferido): ' + aConf.join(', ') + '.');
  $("#ev-notas").innerHTML = '<strong>Como ler</strong><ul style="margin:6px 0 0;padding-left:18px">' + notas.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
}
