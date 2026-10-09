// planilha falsa em memória (Range/Sheet/planilha) e formatDate, usada pelos testes do servidor
function pad(n) { return ('0' + n).slice(-2); }
function fmt(d, tz, f) {
  return f.replace('yyyy', d.getFullYear()).replace('MM', pad(d.getMonth() + 1)).replace('dd', pad(d.getDate()))
    .replace('HH', pad(d.getHours())).replace('mm', pad(d.getMinutes())).replace('ss', pad(d.getSeconds())).replace(/^d$/, String(d.getDate()));
}
class Range {
  constructor(s, r, c, nr, nc) { Object.assign(this, { s, r, c, nr: nr || 1, nc: nc || 1 }); }
  getValues() { const o = []; for (let i = 0; i < this.nr; i++) { const l = []; for (let j = 0; j < this.nc; j++) { const row = this.s.d[this.r - 1 + i] || []; const v = row[this.c - 1 + j]; l.push(v == null ? '' : v); } o.push(l); } return o; }
  getValue() { return this.getValues()[0][0]; }
  setValues(v) { v.forEach((l, i) => l.forEach((x, j) => this.s.put(this.r + i, this.c + j, x))); return this; }
  setValue(x) { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.s.put(this.r + i, this.c + j, x); return this; }
  setNumberFormat() { return this; } setNumberFormats() { return this; } setFontWeight() { return this; }
  getNumberFormats() { return this.getValues().map(l => l.map(() => '')); } clearContent() { return this.setValue(''); } clear() { return this.setValue(''); }
}
class Sheet {
  constructor(nome, linhas, maxRows) { this.nome = nome; this.d = linhas.map(l => l.slice()); this.maxRows = maxRows || 200; this.maxCols = Math.max(26, ...this.d.map(l => l.length)); }
  put(r, c, v) { while (this.d.length < r) this.d.push([]); const l = this.d[r - 1]; while (l.length < c) l.push(''); l[c - 1] = v; if (c > this.maxCols) this.maxCols = c; }
  getName() { return this.nome; } getRange(r, c, nr, nc) { return new Range(this, r, c, nr, nc); }
  getLastRow() { for (let i = this.d.length; i > 0; i--) if ((this.d[i - 1] || []).some(v => v !== '' && v != null)) return i; return 0; }
  getLastColumn() { let m = 0; this.d.forEach(l => l.forEach((v, j) => { if (v !== '' && v != null) m = Math.max(m, j + 1); })); return m; }
  getMaxColumns() { return this.maxCols; } getMaxRows() { return this.maxRows; }
  insertColumnsAfter(c, n) { this.maxCols += n; } insertRowsAfter(r, n) { this.maxRows += n; } setFrozenRows() { }
  appendRow(l) { this.d.push(l.slice()); }
}
function planilha(abas) {
  const m = {};
  Object.keys(abas).forEach(k => { m[k] = new Sheet(k, abas[k]); });
  return { getName: () => 'teste', getId: () => 'x', getSheetByName: n => m[n] || null, getSheets: () => Object.values(m),
    insertSheet: n => (m[n] = new Sheet(n, [])), setActiveSheet() { }, _m: m };
}
module.exports = { pad, fmt, Range, Sheet, planilha };
