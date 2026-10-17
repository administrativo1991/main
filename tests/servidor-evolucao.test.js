// node tests/servidor-evolucao.test.js — Evolução (Fase 2): só a gestão; números derivados da aba "Evolução mensal" (receita própria,
// repasses dos plantões a 82% quando a célula está vazia, cobertura, pessoal líquido); atendimentos do histórico só nos meses sem aba
// no app; linhas de pagamento não contam; novos, frequência e "voltou em até 90/120 dias" (em apuração enquanto a janela não fecha).
const assert = require('assert');
const { fmt, planilha } = require('./planilha-falsa');
const HM = ['Data', 'Hora', 'Paciente', 'Profissional', 'Procedimento', 'Convênio (auto)', 'Modalidade (auto)', '⚠ Atenção na cobrança (auto)', 'O que aconteceu', 'Valor (R$)', 'Pago?', 'Data do pagamento', 'Forma de pagamento', 'Pagador habitual (auto)', 'Quem pagou (só se foi outra pessoa)', 'NF emitida?', 'Nº da NF', 'Guia assinada? (convênio)', 'Observação', 'ID', 'Registrado por (app)'];
const L = (id, data, paciente, oque, proc, conv) => [data, '09:00', paciente, 'Juliana Ribeiro', proc || 'Sessão de psicologia', conv || 'Particular', '', '', oque, 120, 'Sim', '', '', '', '', '', '', '', '', id, 'rec@x'];
const HEVO = ['Mês', 'Particular', 'Cedplan', 'Sabin', 'Aluguel de sala', 'Outras receitas', 'Plantões Santa Casa', 'Plantões Unimed', 'Repasses (total)', 'Repasses dos plantões',
  'Pessoal', 'Materiais e Insumos', 'Administrativo', 'Marketing', 'Infraestrutura', 'Medicina do Trabalho', 'Taxas e licenças', 'Tributos', 'Outros', 'Recuperações',
  'Despesa total', 'Resultado', 'Patrimônio no fim do mês', 'Acumulador tributário', 'Sessões fora do sistema', 'Fonte', 'Conferido', 'Observação'];
// maio: tudo preenchido (números reais do fechamento 06); agosto: repasse dos plantões, despesa e resultado vazios (o app calcula)
const MAI = ['05/2026', 10400, 4680, 0, 0, 0, 16085.59, 9921.09, 29053.48, '', 7683.30, 936.33, 704.25, 0, 300.74, 59.90, 0, 0, 0, 0, 9684.52, 2348.68, 20247.78, 9866.60, '', '06_FECHAMENTO_MAI26', 'Sim', ''];
const AGO = [new Date(2026, 7, 1), 8545, 6540, 3120, 200, 0, 0, 6152.56, 13890.10, '', 10575.78, 1766.03, 748.37, 600, 0, 59.90, 0, 0, 0, -791.51, '', '', 22857.29, 9157.53, 78, '09_FECHAMENTO_AGO26', '', 'Sabin: 78 sessões só no relatório de guias'];
const H = (d, p, conv) => [d, p, 'Juliana Ribeiro', conv || '', 'ControleOdonto'];
const AGORA = new Date(2026, 9, 16, 10, 0), RealDate = Date;
global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(AGORA.getTime()); } static now() { return AGORA.getTime(); } };
const ss = planilha({
  Pacientes: [['Nome', 'Código', 'CPF', 'Data de nascimento', 'Ativo', 'Cobrança']],
  Listas: [['O que aconteceu', 'Pago?', 'Gestão'], ['Atendido', 'Sim', 'gestao@clinicanascente.com.br']],
  'Evolução mensal': [HEVO, MAI, AGO],
  'Histórico de atendimentos': [['Data', 'Paciente', 'Profissional', 'Convênio', 'Fonte'],
    H('05/05/2026', 'Ana Antiga'), H('20/05/2026', 'Ana Antiga'), H('12/05/2026', 'Beto Sumiu', 'CEDplan'),
    H('04/07/2026', 'Ana Antiga'), H('10/08/2026', 'Ana Antiga'), H('11/08/2026', 'Caio Agosto', 'SABIN SINAI'),
    H('15/09/2026', 'Zé Duplicado')], // setembro tem aba no app: esta linha do histórico não conta
  Setembro: [HM, L('S1', '02/09/2026', 'Ana Antiga', 'Atendido'), L('S2', '09/09/2026', 'Ana Antiga', 'Atendido'), L('S3', '03/09/2026', 'Dani Nova', 'Atendido', 'Sessão de psicologia – convênio', 'Sabin Sinai'),
    L('S4', '30/09/2026', 'Ana Antiga', 'Atendido', 'Pagamento de setembro (valor do mês)'), L('S5', '10/09/2026', 'Caio Agosto', 'Faltou sem aviso')],
  Outubro: [HM, L('O1', '07/10/2026', 'ana antiga', 'Atendido'), L('O2', '06/10/2026', 'Dani Nova', 'Atendido', 'Mensalidade – psicologia')]
});
global.SpreadsheetApp = { getActiveSpreadsheet: () => ss, flush() { } };
global.LockService = { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) };
global.Utilities = { formatDate: fmt };
let email = 'recepcao@clinicanascente.com.br';
global.Session = { getActiveUser: () => ({ getEmail: () => email }) };
const API = (0, eval)(require('./carregar-servidor')());

assert.strictEqual(API.evolucao().ok, false, 'recepção não vê a Evolução');
email = 'gestao@clinicanascente.com.br';
const r = API.evolucao(); assert.ok(r.ok, JSON.stringify(r));
const M = {}; r.meses.forEach(m => { M[m.chave] = m; });
assert.deepStrictEqual(r.meses.map(m => m.rotulo), ['Mai/26', 'Jul/26', 'Ago/26', 'Set/26', 'Out/26']);

// financeiro de maio = o "Resultado da operação própria" do fechamento 06
const fm = M['2026-05'].fin;
assert.strictEqual(fm.propria, 15080); assert.strictEqual(fm.plantoes, 26006.68); assert.strictEqual(fm.repassesPlantoes, 21325.48, '82% dos plantões');
assert.strictEqual(fm.repassesProprios, 7728); assert.strictEqual(fm.margemLiquida, 4637.6); assert.strictEqual(fm.cobertura, 47.89);
assert.strictEqual(fm.resultadoProprio, -2332.52); assert.strictEqual(fm.conferenciaGrupos, 0, 'grupos somam a despesa'); assert.strictEqual(fm.pessoalPct, 50.95);
// agosto: Mês como data; despesa = soma dos grupos (com a recuperação); resultado calculado; pessoal líquido da recuperação
const fa = M['2026-08'].fin;
assert.strictEqual(fa.despesa, 12958.57); assert.strictEqual(fa.resultado, -2291.11); assert.strictEqual(fa.margemLiquida, 6247.1); assert.strictEqual(fa.cobertura, 48.21);
assert.strictEqual(fa.pessoal, 9784.27); assert.strictEqual(fa.plantaoLiquido, 1107.46);
console.log('financeiro ok');

// atendimentos
const a5 = M['2026-05'].at, a7 = M['2026-07'].at, a8 = M['2026-08'].at, a9 = M['2026-09'].at, a10 = M['2026-10'].at;
assert.deepStrictEqual([a5.atendimentos, a5.pacientes, a5.novos, a5.frequencia], [3, 2, 2, 1.5]);
assert.deepStrictEqual(a5.porConvenio, { Particular: 2, Cedplan: 1 });
assert.deepStrictEqual(a5.volta90, { n: 1, de: 2, pct: 50 }, 'Ana voltou em 04/07 (45 dias); Beto não voltou');
assert.deepStrictEqual(a5.volta120, { n: 1, de: 2, pct: 50 });
assert.deepStrictEqual(a7.volta90, null, 'julho: janela de 90 dias ainda aberta em 16/10 (31/07 + 90 = 29/10)');
assert.deepStrictEqual([a8.atendimentos, a8.novos, a8.atendimentosComFora], [2, 1, 80], 'Sabin fora do sistema soma no total');
assert.deepStrictEqual([a9.atendimentos, a9.pacientes, a9.novos], [3, 2, 1], 'setembro: só o app (Zé do histórico fora; pagamento e falta não contam)');
assert.strictEqual(a9.fonte, 'app'); assert.deepStrictEqual(a9.porConvenio, { Particular: 2, Sabin: 1 });
assert.deepStrictEqual([a10.atendimentos, a10.pacientes, a10.novos, a10.parcial], [1, 1, 0, true], 'mesmo paciente com outra caixa; mensalidade não conta');
assert.strictEqual(M['2026-07'].fin, null, 'julho sem linha financeira');
console.log('atendimentos ok');
