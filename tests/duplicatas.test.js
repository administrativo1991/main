// node tests/duplicatas.test.js
const assert = require('assert');
const D = require('../app/server/duplicatas.js');

// Base reduzida com os casos reais da planilha (só nome, nascimento e pagador).
const base = [
  { nome: 'Isaac Oliveira Santos', cpf: '191.376.746-92', nasc: '15/03/2022', pagador: '' },
  { nome: 'Isac de Oliveira Souza', cpf: '010.161.526-47', nasc: '07/08/2024', pagador: '' },
  { nome: 'Laura de Oliveira Souza', cpf: '010.161.186-27', nasc: '07/08/2024', pagador: '' },
  { nome: 'Isabella Abranches Portes', cpf: '', nasc: '10/11/2017', pagador: '' },
  { nome: 'Isabelli Abranches Portes', cpf: '174.626.946-46', nasc: '13/11/2014', pagador: '' },
  { nome: 'Agatha Fonseca Salgado', cpf: '048.991.996-00', nasc: '04/07/2025', pagador: '' },
  { nome: 'Ágatha Helena Silva de Lima', cpf: '158.173.746-76', nasc: '02/07/2023', pagador: '' },
  { nome: 'Agata Vitória Palermo Querino', cpf: '076.778.166-06', nasc: '28/12/2017', pagador: '' },
  { nome: 'Paulo Henrique Souza e Silva', cpf: '164.590.606-06', nasc: '26/02/2008', pagador: 'Natalha da Silva Santos de Jesus / Natalia Aparecida Ribeiro da Silva' },
  { nome: 'Beatriz Sanabio Freesz', cpf: '819.944.516-53', nasc: '04/02/1967', pagador: '' },
];
const motivosDe = (r, nome) => (r.avisos.find(a => a.paciente.nome === nome) || { motivos: [] }).motivos.join(' | ');

// 1. CPF igual bloqueia (mesmo com nome diferente e pontuação diferente)
let r = D.verificar({ nome: 'Fulano de Tal', cpf: '19137674692', nasc: '', pagador: '' }, base);
assert.ok(r.bloqueio && r.bloqueio.paciente.nome === 'Isaac Oliveira Santos', 'CPF igual deve bloquear');

// 2. Isac × Isaac: nascimentos diferentes, sem pagador → avisa pelo sobrenome em comum (Oliveira)
r = D.verificar({ nome: 'Isac de Oliveira Souza', cpf: '', nasc: '07/08/2024', pagador: '' }, base.filter(p => p.nome !== 'Isac de Oliveira Souza'));
assert.ok(!r.bloqueio);
assert.ok(/sobrenome em comum: oliveira/.test(motivosDe(r, 'Isaac Oliveira Santos')), 'Isac × Isaac deve avisar: ' + JSON.stringify(r.avisos.map(a => a.paciente.nome)));

// 3. Gêmeos Laura × Isac (mesmo nascimento, primeiro nome diferente) → NÃO avisa
r = D.verificar({ nome: 'Laura de Oliveira Souza', cpf: '', nasc: '07/08/2024', pagador: '' }, base.filter(p => p.nome !== 'Laura de Oliveira Souza'));
assert.strictEqual(motivosDe(r, 'Isac de Oliveira Souza'), '', 'gêmeos não devem avisar');

// 4. Isabella × Isabelli (irmãs): fonética igual + sobrenomes em comum → avisa, não bloqueia
r = D.verificar({ nome: 'Isabella Abranches Portes', cpf: '', nasc: '10/11/2017', pagador: '' }, base.filter(p => p.nome !== 'Isabella Abranches Portes'));
assert.ok(/sobrenome em comum: abranches, portes/.test(motivosDe(r, 'Isabelli Abranches Portes')));
assert.ok(!r.bloqueio);

// 5. Nome idêntico → avisa com "nome idêntico"
r = D.verificar({ nome: 'Beatriz Sanabio Freesz', cpf: '', nasc: '', pagador: '' }, base);
assert.ok(/nome idêntico/.test(motivosDe(r, 'Beatriz Sanabio Freesz')));

// 6. Natalha × Natalia como pagadoras: paciente novo com primeiro nome parecido e pagador Natalia → avisa pelo pagador
r = D.verificar({ nome: 'Paulo Henrique Rocha', cpf: '', nasc: '', pagador: 'Natalia Aparecida Ribeiro da Silva' }, base);
assert.ok(/pagador parecido/.test(motivosDe(r, 'Paulo Henrique Souza e Silva')), 'pagador Natalia deve casar com Natalha: ' + motivosDe(r, 'Paulo Henrique Souza e Silva'));
r = D.verificar({ nome: 'Paulo Henrique Rocha', cpf: '', nasc: '', pagador: 'Natalha Silva' }, base);
assert.ok(/pagador parecido/.test(motivosDe(r, 'Paulo Henrique Souza e Silva')));

// 7. Agatha / Ágatha / Agata: fonética igual; só avisa quando há mais um sinal
r = D.verificar({ nome: 'Agatha Silva', cpf: '', nasc: '', pagador: '' }, base);
assert.ok(/silva/.test(motivosDe(r, 'Ágatha Helena Silva de Lima')));
assert.strictEqual(motivosDe(r, 'Agatha Fonseca Salgado'), '');
r = D.verificar({ nome: 'Agatha Mendes', cpf: '', nasc: '04/07/2025', pagador: '' }, base);
assert.ok(/mesma data/.test(motivosDe(r, 'Agatha Fonseca Salgado')));

// 8. Primeiro nome diferente nunca avisa, mesmo com sobrenome igual
r = D.verificar({ nome: 'Marina Oliveira Santos', cpf: '', nasc: '15/03/2022', pagador: '' }, base);
assert.strictEqual(r.avisos.length, 0);

// 9. CPF: válido / inválido
assert.ok(D.cpfValido('191.376.746-92'));
assert.ok(D.cpfValido('010.161.526-47'));
assert.ok(!D.cpfValido('111.111.111-11'));
assert.ok(!D.cpfValido('123.456.789-00'));

// 10. fonética
assert.strictEqual(D.fonetica('Isac'), D.fonetica('Isaac'));
assert.strictEqual(D.fonetica('Natalha'), D.fonetica('Natália'));
assert.strictEqual(D.fonetica('Isabella'), D.fonetica('Isabelli'));
assert.notStrictEqual(D.fonetica('Laura'), D.fonetica('Isac'));

console.log('duplicatas: 10 grupos de casos OK');
