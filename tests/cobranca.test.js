// node tests/cobranca.test.js — o bloco "O que fazer agora" (módulo compartilhado), com os casos do item 9.3 da Fase 1
const assert = require('assert');
const C = require('../app/shared/cobranca');
const L = (o) => Object.assign({ paciente: 'P', profissional: 'Juliana Ribeiro', ativo: 'Sim', cobranca: 'Por sessão', pagamento: 'Na hora', decididoPor: 'migração 15/10', decididoEm: '15/10/2026' }, o);
const dia = (d) => d + '/10/2026';
let n = 0; const t = (nome, fn) => { fn(); n++; };

t('normalização dos nomes antigos', () => {
  assert.strictEqual(C.normCobranca('Mensalidade social'), 'Mensalidade fixa');
  assert.strictEqual(C.normCobranca('Por sessão (combinado)'), 'Por sessão');
  assert.strictEqual(C.normPagamento('No mês seguinte'), 'Posterior');
  assert.strictEqual(C.normPagamento('Na sessão'), 'Na hora');
  assert.strictEqual(C.normPagamento('', 'Mensalidade fixa'), 'Antecipado');
  assert.strictEqual(C.rotuloPagamento('Posterior'), 'Fim do mês');
});
t('linha vigente: profissional, vigência, mais recente', () => {
  const linhas = [L({ linha: 2, profissional: 'Giovana Grossi', cobranca: 'Pro bono' }), L({ linha: 3, pagamento: 'Posterior', ate: '31/10/2026', valorSessao: 80 }), L({ linha: 4, pagamento: 'Antecipado', desde: '01/11/2026', valorSessao: 80 })];
  assert.strictEqual(C.linhaVigente(linhas, 'P', 'Juliana Ribeiro', dia('20')).linha.pagamento, 'Posterior');
  assert.strictEqual(C.linhaVigente(linhas, 'P', 'Juliana Ribeiro', '05/11/2026').linha.pagamento, 'Antecipado');
  assert.strictEqual(C.linhaVigente(linhas, 'P', 'Giovana Grossi', dia('20')).linha.cobranca, 'Pro bono');
  assert.strictEqual(C.linhaVigente(linhas, 'P', 'Dr. Victor Cunha', dia('20')).linha, null);
  const dup = C.linhaVigente([L({ linha: 2, valorSessao: 70 }), L({ linha: 5, valorSessao: 80 })], 'P', 'Juliana Ribeiro', dia('20'));
  assert.strictEqual(dup.linha.valorSessao, 80); assert.ok(/2 linhas/.test(dup.aviso));
  assert.strictEqual(C.resumoLinha(L({ valorSessao: 80, pagamento: 'Antecipado' })), 'Juliana: sessão R$ 80, antecipado (até dia 10)');
  assert.strictEqual(C.resumoLinha(L({ profissional: 'Dr. Victor Cunha', valorSessao: 200 })), 'Victor: sessão R$ 200, na hora');
});
t('Lays: por sessão R$ 25 na hora', () => {
  const b = C.calcular({ linha: L({ valorSessao: 25 }), hoje: dia('15'), pagador: 'Michelle' });
  assert.strictEqual(b.situacao, 'na-hora'); assert.strictEqual(b.cor, 'amarelo'); assert.strictEqual(b.frase, 'Cobrar R$ 25 agora'); assert.strictEqual(b.apoio, 'pagador: Michelle');
  assert.strictEqual(b.recebeu, 'sim-nao-parcial'); assert.strictEqual(b.valor, 25); assert.strictEqual(C.pagoK(b, 'Sim'), 'Sim'); assert.strictEqual(C.pagoK(b, 'Parcial'), 'Parcial'); assert.strictEqual(b.curto, 'R$ 25 · cobrar');
  assert.ok(/migração 15\/10 em 15\/10\/2026/.test(b.decidido));
});
t('Julia: R$ 70 fim do mês', () => {
  const b = C.calcular({ linha: L({ valorSessao: 70, pagamento: 'Posterior' }), hoje: dia('15'), competencia: { chave: 'Outubro/2026', atendidas: 2, aReceber: 140 } });
  assert.strictEqual(b.situacao, 'fim-do-mes'); assert.strictEqual(b.cor, 'azul'); assert.strictEqual(b.frase, 'Não cobrar hoje — paga no fim do mês (R$ 70/sessão)');
  assert.ok(/2 sessões este mês/.test(b.apoio)); assert.strictEqual(b.recebeu, 'sim-nao'); assert.strictEqual(b.padraoRecebeu, 'Não'); assert.strictEqual(C.pagoK(b), 'Não'); assert.strictEqual(b.curto, 'Fim do mês R$ 70');
});
t('antecipado: pago, em aberto (dia 5 e dia 12), atrasado (dia 16), mês de 5 semanas, abatimento', () => {
  const l = L({ valorSessao: 70, pagamento: 'Antecipado' });
  let b = C.calcular({ linha: l, hoje: dia('15'), competencia: { chave: 'Outubro/2026', pago: 'Sim', data: '02/10/2026', forma: 'Pix', sessoes: 4 } });
  assert.strictEqual(b.situacao, 'antecipado-pago'); assert.strictEqual(b.frase, 'Não cobrar — outubro pago (4 sessões)'); assert.strictEqual(b.apoio, 'R$ 70/sessão · pago em 02/10/2026 (Pix)'); assert.strictEqual(C.pagoK(b), 'Incluída na mensalidade'); assert.strictEqual(b.valor, ''); assert.strictEqual(b.curto, 'Out. pago');
  b = C.calcular({ linha: l, hoje: dia('05'), competencia: { chave: 'Outubro/2026', sessoes: 5 } });
  assert.strictEqual(b.situacao, 'antecipado-aberto'); assert.strictEqual(b.frase, 'Outubro em aberto — cobrar R$ 350'); assert.ok(/5 sessões × R\$ 70 · vence dia 10/.test(b.apoio)); assert.strictEqual(b.botaoPagarMes, true); assert.strictEqual(b.valorMes, 350);
  b = C.calcular({ linha: l, hoje: dia('12'), competencia: { chave: 'Outubro/2026', sessoes: 4 } });
  assert.ok(/tolerância até 15/.test(b.apoio)); assert.strictEqual(b.cor, 'amarelo');
  b = C.calcular({ linha: l, hoje: dia('16'), competencia: { chave: 'Outubro/2026', sessoes: 4 } });
  assert.strictEqual(b.situacao, 'antecipado-atrasado'); assert.strictEqual(b.cor, 'vermelho'); assert.strictEqual(b.frase, 'Outubro atrasado (R$ 280) — chamar a gestão'); assert.strictEqual(b.obsAuto, 'atendido com mês em atraso'); assert.strictEqual(C.pagoK(b), 'Incluída na mensalidade');
  b = C.calcular({ linha: l, hoje: '05/11/2026', competencia: { chave: 'Novembro/2026', sessoes: 4, abatimentos: [{ texto: '− 1 sessão cancelada em 22/10', n: 1 }] } });
  assert.strictEqual(b.frase, 'Novembro em aberto — cobrar R$ 210'); assert.ok(/3 sessões × R\$ 70 \(− 1 sessão cancelada em 22\/10\)/.test(b.apoio));
  b = C.calcular({ linha: l, hoje: dia('05'), competencia: { chave: 'Outubro/2026', sessoes: 4, valorCobrado: 300 } });
  assert.strictEqual(b.valorMes, 300, 'valor cobrado editado pela gestão manda');
});
t('Inglidy e Borchert: mensalidade fixa', () => {
  const l = L({ cobranca: 'Mensalidade fixa', valorMensal: 120, pagamento: 'Antecipado' });
  let b = C.calcular({ linha: l, hoje: dia('15'), competencia: { chave: 'Outubro/2026', pago: 'Sim', data: '08/10/2026', forma: 'Pix' } });
  assert.strictEqual(b.frase, 'Não cobrar — mensalidade de outubro paga'); assert.strictEqual(b.cor, 'verde'); assert.ok(/R\$ 120\/mês, independente do nº de sessões/.test(b.apoio)); assert.strictEqual(C.pagoK(b), 'Incluída na mensalidade'); assert.strictEqual(b.curto, 'Mensalidade out. paga');
  b = C.calcular({ linha: L({ cobranca: 'Mensalidade fixa', valorMensal: 150, pagamento: 'Antecipado' }), hoje: dia('08'), competencia: { chave: 'Outubro/2026' } });
  assert.strictEqual(b.frase, 'Mensalidade de outubro em aberto — cobrar R$ 150'); assert.strictEqual(b.cor, 'amarelo'); assert.strictEqual(b.botaoPagarMes, true);
  b = C.calcular({ linha: L({ cobranca: 'Mensalidade fixa', valorMensal: 150, pagamento: 'Antecipado' }), hoje: dia('20'), competencia: { chave: 'Outubro/2026' } });
  assert.strictEqual(b.frase, 'Mensalidade de outubro atrasada (R$ 150) — chamar a gestão'); assert.strictEqual(b.cor, 'vermelho');
  b = C.calcular({ linha: L({ cobranca: 'Mensalidade fixa', valorMensal: 200, pagamento: 'Posterior' }), hoje: dia('20'), competencia: { chave: 'Outubro/2026' } });
  assert.strictEqual(b.situacao, 'mensalidade-fim-do-mes'); assert.strictEqual(b.cor, 'azul');
});
t('convênio, pro bono, permuta, teste, retorno, sem linha, falta', () => {
  let b = C.calcular({ linha: L({ cobranca: 'Convênio', convenio: 'Cedplan', pagamento: 'Não se aplica' }), hoje: dia('15') });
  assert.strictEqual(b.frase, 'Não cobrar — convênio Cedplan'); assert.strictEqual(b.guia, true); assert.strictEqual(C.pagoK(b), 'Convênio (fatura)'); assert.strictEqual(b.curto, 'Convênio Cedplan · guia'); assert.strictEqual(b.cor, 'azul');
  b = C.calcular({ linha: L({ cobranca: 'Pro bono', ate: '31/10/2026' }), hoje: dia('15') });
  assert.strictEqual(b.frase, 'Não cobrar — pro bono'); assert.strictEqual(b.apoio, 'até 31/10/2026'); assert.strictEqual(C.pagoK(b), 'Não se aplica (pro bono / permuta)'); assert.strictEqual(b.curto, 'Pro bono até 31/10');
  b = C.calcular({ linha: L({ cobranca: 'Permuta' }), hoje: dia('15') }); assert.strictEqual(b.frase, 'Não cobrar — permuta');
  b = C.calcular({ linha: L({ valorSessao: 80 }), procedimento: 'Aplicação de teste – avaliação neuropsicológica', hoje: dia('15') });
  assert.strictEqual(b.frase, 'Não cobrar — aplicação de teste'); assert.strictEqual(b.apoio, 'já incluído'); assert.strictEqual(C.pagoK(b), 'Não se aplica (pro bono / permuta)');
  b = C.calcular({ linha: null, procedimento: 'Retorno pediátrico (com pedido de exames, até 30 dias)', hoje: dia('15') });
  assert.strictEqual(b.frase, 'Não cobrar — retorno');
  b = C.calcular({ linha: null, profissional: 'Dr. Victor Cunha', valorCheio: 200, hoje: dia('15'), pagador: 'Renato' });
  assert.strictEqual(b.situacao, 'sem-linha'); assert.strictEqual(b.cor, 'laranja'); assert.strictEqual(b.frase, 'Sem cobrança cadastrada pra Dr. Victor Cunha — cobrar R$ 200'); assert.strictEqual(b.apoio, 'avise a gestão · pagador: Renato'); assert.strictEqual(b.recebeu, 'sim-nao-parcial'); assert.strictEqual(b.valor, 200);
  b = C.calcular({ linha: L({ valorSessao: 80 }), oque: 'Faltou sem aviso', hoje: dia('15') });
  assert.strictEqual(b.frase, 'Sem cobrança — faltou sem aviso. A gestão decide.'); assert.strictEqual(b.detalhe, true); assert.strictEqual(b.detalheObrigatorio, true); assert.strictEqual(C.pagoK(b), ''); assert.strictEqual(b.obsAuto, 'Falta/desmarcação — ');
  b = C.calcular({ linha: L({ valorSessao: 80 }), oque: 'Desmarcou com antecedência (≥ 24h)', hoje: dia('15') });
  assert.strictEqual(b.detalheObrigatorio, false); assert.strictEqual(b.curto, 'Desmarcou com antecedência');
});
t('Davi: trocar o profissional muda o bloco', () => {
  const linhas = [L({ paciente: 'Davi', linha: 2, profissional: 'Giovana Grossi', cobranca: 'Pro bono' }), L({ paciente: 'Davi', linha: 3, valorSessao: 80, pagamento: 'Posterior', ate: '31/10/2026' })];
  const g = C.calcular({ linha: C.linhaVigente(linhas, 'Davi', 'Giovana Grossi', dia('15')).linha, hoje: dia('15') }), j = C.calcular({ linha: C.linhaVigente(linhas, 'Davi', 'Juliana Ribeiro', dia('15')).linha, hoje: dia('15'), competencia: { chave: 'Outubro/2026', atendidas: 1, aReceber: 80 } });
  assert.strictEqual(g.frase, 'Não cobrar — pro bono'); assert.strictEqual(j.situacao, 'fim-do-mes');
});
t('situação da competência (Cobrança do mês)', () => {
  const l = L({ valorSessao: 70, pagamento: 'Antecipado' });
  assert.strictEqual(C.situacaoCompetencia(l, { chave: 'Outubro/2026', pago: 'Sim' }, dia('20')).sit, 'em dia');
  assert.strictEqual(C.situacaoCompetencia(l, { chave: 'Outubro/2026' }, dia('05')).sit, 'vence dia 10');
  assert.strictEqual(C.situacaoCompetencia(l, { chave: 'Outubro/2026' }, dia('12')).sit, 'tolerância até 15');
  assert.strictEqual(C.situacaoCompetencia(l, { chave: 'Outubro/2026' }, dia('20')).sit, 'atrasada');
  assert.strictEqual(C.situacaoCompetencia(l, { chave: 'Setembro/2026' }, dia('05')).sit, 'atrasada');
  assert.strictEqual(C.situacaoCompetencia(l, { chave: 'Novembro/2026' }, dia('20')).sit, 'futura');
  assert.strictEqual(C.situacaoCompetencia(L({ valorSessao: 70, pagamento: 'Posterior' }), { chave: 'Outubro/2026', aReceber: 140 }, dia('20')).txt, 'a receber R$ 140');
  assert.strictEqual(C.proximaCompetencia('Dezembro/2026'), 'Janeiro/2027');
});
console.log('cobranca.test.js: ' + n + ' grupos ok');
