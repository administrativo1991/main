/* Recepção Nascente — detecção de duplicata de paciente.
   Módulo puro (sem dependências): roda no Apps Script (servidor), no navegador (tela) e no Node (testes).
   Regras (decisão Roberta, 04 e 05/10/2026):
   - CPF igual a um existente → BLOQUEIA.
   - Nome exatamente igual → avisa (o servidor também bloqueia, porque a planilha usa o nome como chave).
   - Primeiro nome parecido (fonético ou distância de edição) E pelo menos um de:
       (a) mesma data de nascimento, (b) pagador habitual parecido, (c) >= 1 sobrenome em comum → AVISA, deixa prosseguir.
*/
(function (root) {
  var STOP = { de: 1, da: 1, do: 1, dos: 1, das: 1, e: 1, d: 1 };

  function normalizar(s) {
    return String(s == null ? '' : s)
      .replace(/[çÇ]/g, 's')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function tokens(nome) {
    return normalizar(nome).split(' ').filter(function (t) { return t && !STOP[t]; });
  }
  function digitos(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }

  // Fonética simplificada para nomes em português (inspirada no BuscaBR).
  function fonetica(w) {
    w = normalizar(w);
    if (!w) return '';
    w = w.replace(/ph/g, 'f').replace(/th/g, 't')
         .replace(/lh/g, 'li').replace(/nh/g, 'ni')
         .replace(/sch|ch|sh/g, 'x')
         .replace(/c(?=[eiy])/g, 's').replace(/g(?=[eiy])/g, 'j')
         .replace(/c|q/g, 'k').replace(/ss|z|x/g, 's')
         .replace(/y/g, 'i').replace(/w/g, 'v').replace(/h/g, '')
         .replace(/(.)\1+/g, '$1');
    return w.charAt(0) + w.slice(1).replace(/[aeiou]/g, '');
  }

  function lev(a, b) {
    a = normalizar(a); b = normalizar(b);
    if (a === b) return 0;
    var m = a.length, n = b.length, i, j, prev, cur, tmp;
    if (!m) return n; if (!n) return m;
    prev = []; for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur = [i];
      for (j = 1; j <= n; j++) {
        tmp = prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, tmp);
      }
      prev = cur;
    }
    return prev[n];
  }

  function primeiroNomeParecido(a, b) {
    if (!a || !b) return false;
    if (fonetica(a) === fonetica(b)) return true;
    var d = lev(a, b), L = Math.min(a.length, b.length);
    return (L >= 4 && d <= 1) || (L >= 6 && d <= 2);
  }

  function dataChave(d) {
    if (!d) return '';
    if (d instanceof Date && !isNaN(d)) {
      return ('0' + d.getDate()).slice(-2) + ('0' + (d.getMonth() + 1)).slice(-2) + d.getFullYear();
    }
    var s = String(d).trim(), m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) return ('0' + m[1]).slice(-2) + ('0' + m[2]).slice(-2) + (m[3].length === 2 ? '20' + m[3] : m[3]);
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[3] + m[2] + m[1];
    return digitos(s);
  }

  // "Natalha da Silva / Natalia Ribeiro" → dois pagadores
  function pagadores(s) {
    return String(s == null ? '' : s).split(/\s*[\/;,]\s*|\s+ou\s+/i).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function pagadorParecido(a, b) {
    var ta = tokens(a), tb = tokens(b);
    if (!ta.length || !tb.length) return false;
    if (ta.join(' ') === tb.join(' ')) return true;
    if (!primeiroNomeParecido(ta[0], tb[0])) return false;
    var comuns = ta.slice(1).filter(function (t) { return tb.slice(1).indexOf(t) >= 0; });
    return comuns.length > 0 || (ta.length === 1 || tb.length === 1);
  }

  /** novo: {nome, cpf, nasc, pagador}; lista: [{nome, cpf, nasc, pagador, ...}]
      → {bloqueio: {paciente, motivo} | null, avisos: [{paciente, motivos:[...]}]} */
  function verificar(novo, lista) {
    var res = { bloqueio: null, avisos: [] };
    var cpfN = digitos(novo.cpf);
    var tn = tokens(novo.nome);
    var nomeN = tn.join(' ');
    var pagsN = pagadores(novo.pagador);
    (lista || []).forEach(function (p) {
      var cpfP = digitos(p.cpf);
      if (cpfN.length === 11 && cpfP === cpfN) {
        if (!res.bloqueio) res.bloqueio = { paciente: p, motivo: 'CPF já cadastrado' };
        return;
      }
      if (tn.length < 1 || tn[0].length < 3) return;
      var tp = tokens(p.nome);
      if (!tp.length) return;
      var motivos = [];
      if (nomeN === tp.join(' ')) motivos.push('nome idêntico');
      if (primeiroNomeParecido(tn[0], tp[0])) {
        if (novo.nasc && p.nasc && dataChave(novo.nasc) === dataChave(p.nasc)) motivos.push('mesma data de nascimento');
        if (pagsN.length && p.pagador) {
          var pp = pagadores(p.pagador), achou = null;
          pagsN.forEach(function (a) { pp.forEach(function (b) { if (!achou && pagadorParecido(a, b)) achou = b; }); });
          if (achou) motivos.push('pagador parecido: ' + achou);
        }
        var comuns = tn.slice(1).filter(function (t) { return tp.slice(1).indexOf(t) >= 0; });
        if (comuns.length) motivos.push('sobrenome em comum: ' + comuns.join(', '));
      }
      if (motivos.length) res.avisos.push({ paciente: p, motivos: motivos });
    });
    res.avisos.sort(function (a, b) { return b.motivos.length - a.motivos.length; });
    res.avisos = res.avisos.slice(0, 5);
    return res;
  }

  function cpfValido(cpf) {
    var d = digitos(cpf);
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    var s = 0, i, r;
    for (i = 0; i < 9; i++) s += parseInt(d[i], 10) * (10 - i);
    r = (s * 10) % 11; if (r === 10) r = 0; if (r !== parseInt(d[9], 10)) return false;
    s = 0; for (i = 0; i < 10; i++) s += parseInt(d[i], 10) * (11 - i);
    r = (s * 10) % 11; if (r === 10) r = 0;
    return r === parseInt(d[10], 10);
  }

  var Duplicatas = { normalizar: normalizar, tokens: tokens, fonetica: fonetica, lev: lev, verificar: verificar,
                     cpfValido: cpfValido, digitos: digitos, dataChave: dataChave, pagadorParecido: pagadorParecido };
  if (typeof module !== 'undefined' && module.exports) module.exports = Duplicatas;
  root.Duplicatas = Duplicatas;
})(typeof globalThis !== 'undefined' ? globalThis : this);
