/* ================= ALERTAS (Fase 2, 16/10) =================
   Avisos calculados no servidor (alertasDe_): na Agenda vêm com a lista do dia (DIA.alertas) e aparecem no paciente (etiqueta
   na linha, lista no painel) e numa linha das pendências; na Ficha, no topo. "Sem celular" não conta na etiqueta nem nas
   pendências (é quase todo mundo enquanto os números não forem cadastrados): só aparece no painel e na Ficha, em cinza. */
function alertasDe(nome) { return (DIA && DIA.alertas && DIA.alertas[nome]) || []; }
function alertaBadge(nome) {
  var l = alertasDe(nome).filter(function (a) { return a.tipo !== 'whats'; }); if (!l.length) return '';
  return ' <button type="button" class="tag p ' + l[0].cor + ' alerta-tag" data-alerta-ficha="' + esc(nome) + '" title="' + esc(l.map(function (a) { return a.texto; }).join('\n') + '\n(clique para abrir a ficha)') + '" aria-label="' + l.length + (l.length === 1 ? ' alerta' : ' alertas') + ': abrir a ficha de ' + esc(nome) + '">' + ic('alerta', 11, 2.6) + ' ' + l.length + '</button>';
}
// o ⚠ ao lado do nome abre a Ficha (antes de a linha da Agenda tratar o clique)
document.addEventListener('click', function (e) {
  var b = e.target && e.target.closest ? e.target.closest('[data-alerta-ficha]') : null; if (!b) return;
  e.preventDefault(); e.stopPropagation(); go('ficha', { nome: b.getAttribute('data-alerta-ficha') });
}, true);
var ACAO_ALERTA = { cobranca: 'Cobrança do mês', pacientes: 'Editar cadastro', ficha: 'Ver ficha' };
function alertasHtml(l, nome, naFicha) {
  if (!l || !l.length) return '';
  return '<div class="alertas">' + l.map(function (a) {
    var acao = a.acao && ACAO_ALERTA[a.acao] && !(naFicha && a.acao === 'ficha') ? '<button type="button" class="btn ter mini no-print" data-alerta="' + esc(a.acao) + '" data-nome="' + esc(nome) + '">' + esc(ACAO_ALERTA[a.acao]) + '</button>' : '';
    return '<div class="alerta ' + esc(a.cor) + '">' + ic('alerta', 15, 2.4) + '<span>' + esc(a.texto) + '</span>' + acao + '</div>';
  }).join('') + '</div>';
}
function ligarAlertas(root) {
  $$('[data-alerta]', root).forEach(function (b) {
    b.addEventListener('click', function () {
      var n = b.dataset.nome, a = b.dataset.alerta;
      if (a === 'cobranca') go('cobranca', { buscar: n }); else if (a === 'pacientes') go('pacientes', { editar: n, voltar: telaAtual === 'ficha' ? 'ficha' : 'hoje' }); else go('ficha', { nome: n });
    });
  });
}
