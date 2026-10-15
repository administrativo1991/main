/* Mensagens de WhatsApp (Fase 2) — o mesmo código no servidor e na tela, pra mensagem nunca divergir.
   Confirmação: texto oficial da clínica (gestão, 15/10). A gestão pode trocar em Parâmetros!msg_confirmacao, com:
   {pagador} = primeiro nome de quem paga (sem pagador, do paciente) · {da_sua_consulta} = "da sua consulta" / "das suas consultas"
   · {com_profissional} = " com Juliana Ribeiro" (vazio se forem profissionais diferentes) · {sessoes} = Data e Horário de cada
   sessão (com 👤 nome quando são vários pacientes, e "com profissional" quando são vários profissionais). "\n" escrito na
   célula também quebra linha. O profissional sai como na coluna "Nome na mensagem" da aba Profissionais (profMsg; ex.:
   Dra. Juliana Ribeiro); vazia, sai o nome da aba. */
var Mensagens = (function () {
  var CONFIRMACAO_PADRAO = 'Olá, {pagador}! Passando para lembrar {da_sua_consulta} na Clínica Nascente{com_profissional}:\n\n' +
    '{sessoes}\n📍 *Local:* Av. Andradas, 547 – Térreo, Loja 5\n\n' +
    '📋 *IMPORTANTE: É obrigatório passar pela recepção para registrar sua chegada antes de seguir para o consultório.*\n\n' +
    '⚠️ Caso não possa comparecer, avise a recepção com pelo menos *24 horas de antecedência*. A falta sem aviso impede que o profissional disponibilize esse horário para outro paciente.\n\n' +
    'Agradecemos a compreensão e a colaboração!';
  // cobrança (gestão, 15/10): mensalidade/antecipado e consultas do mês (fim do mês). {pagador} · {mes} ("novembro de 2026") ·
  // {valor} ("1.234,00"). A gestão troca em Parâmetros!msg_cobranca_mensalidade e msg_cobranca_consultas.
  var PIX = '📲 *Pix (CNPJ):* 52.763.088/0001-05\n🏦 *Favorecido:* Clínica Nascente LTDA.\n\n';
  var COBRANCA_MENSALIDADE_PADRAO = 'Olá, {pagador}! Tudo bem?\n\nPassando para lembrar do pagamento da mensalidade da Clínica Nascente referente a {mes}.\n\n' +
    '💳 *Valor:* R$ {valor}\n' + PIX + 'Após o pagamento, pedimos, por gentileza, que envie o comprovante por aqui.\n\nQualquer dúvida, estamos à disposição!';
  var COBRANCA_CONSULTAS_PADRAO = 'Olá, {pagador}! Tudo bem?\n\nEstamos entrando em contato para informar o valor referente às consultas realizadas na Clínica Nascente durante o mês de {mes}.\n\n' +
    '💳 *Valor total:* R$ {valor}\n' + PIX + 'Após o pagamento, pedimos, por gentileza, que envie o comprovante por aqui.\n\nAgradecemos a atenção e ficamos à disposição para qualquer dúvida!';
  // número pro link do WhatsApp: só dígitos com 55 na frente; vazio se não parece telefone do Brasil
  function fone(t) { var d = String(t || '').replace(/\D/g, ''); return /^55\d{10,11}$/.test(d) ? d : /^\d{10,11}$/.test(d) ? '55' + d : ''; }
  function foneFmt(t) { var d = fone(t).slice(2); if (!d) return ''; return d.length === 11 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 3) + ' ' + d.slice(3, 7) + '-' + d.slice(7) : '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6); }
  // o número de um paciente: WhatsApp do pagador; se vazio, telefone do responsável; depois o do paciente
  function foneDoPaciente(p) {
    p = p || {}; var ord = [['whats', 'pagador'], ['respTel', 'responsável'], ['telPac', 'paciente']];
    for (var i = 0; i < ord.length; i++) { var f = fone(p[ord[i][0]]); if (f) return { fone: f, foneFmt: foneFmt(f), de: ord[i][1] }; }
    return { fone: '', foneFmt: '', de: '' };
  }
  // link que abre a conversa com o texto. wa.me trocava os emojis por "�" no WhatsApp (gestão, 15/10): api.whatsapp.com/send não
  function linkWhats(f, texto) { return 'https://api.whatsapp.com/send?phone=' + fone(f) + '&text=' + encodeURIComponent(texto); }
  // fim do mês por sessão = "consultas do mês"; mensalidade fixa e antecipado = "mensalidade"
  function tipoCobranca(it) { return it.pagamento === 'Posterior' && it.cobranca !== 'Mensalidade fixa' ? 'consultas' : 'mensalidade'; }
  function valorBR(n) { var v = Math.round((Number(n) || 0) * 100) / 100, i = Math.floor(v), c = Math.round((v - i) * 100); return String(i).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + ('0' + c).slice(-2); }
  function mesTxt(chave) { var m = String(chave || '').split('/'); return m.length === 2 ? m[0].toLowerCase() + ' de ' + m[1] : String(chave || ''); }
  function cobranca(tipo, modelo, pagador, chave, valor) {
    var padrao = tipo === 'consultas' ? COBRANCA_CONSULTAS_PADRAO : COBRANCA_MENSALIDADE_PADRAO;
    return String(modelo || padrao).replace(/\\n/g, '\n').replace(/\{pagador\}/g, primeiroNome(pagador)).replace(/,\s*!/g, '!')
      .replace(/\{mes\}/g, mesTxt(chave)).replace(/\{valor\}/g, valorBR(valor));
  }
  function primeiroNome(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }
  function hora(h) { var m = String(h || '').match(/^(\d{1,2}):(\d{2})/); return m ? ('0' + m[1]).slice(-2) + 'h' + m[2] : String(h || '').trim(); }
  function unicos(l) { return l.filter(function (x, i) { return l.indexOf(x) === i; }); }
  // itens: [{ paciente, profissional, profMsg (opcional), data: 'dd/mm/aaaa', hora: 'hh:mm' }]
  function confirmacao(modelo, pagador, itens) {
    itens = itens || [];
    var pacs = unicos(itens.map(function (x) { return x.paciente; })), profs = unicos(itens.map(function (x) { return x.profMsg || x.profissional; })), umProf = profs.length === 1;
    var blocos = itens.map(function (x) {
      var l = [];
      if (pacs.length > 1 || !umProf) l.push('👤 *' + primeiroNome(x.paciente) + '*' + (umProf ? '' : ' com ' + (x.profMsg || x.profissional)));
      l.push('🗓️ *Data:* ' + x.data);
      if (x.hora) l.push('⏰ *Horário:* ' + hora(x.hora));
      return l.join('\n');
    });
    return String(modelo || CONFIRMACAO_PADRAO).replace(/\\n/g, '\n')
      .replace(/\{pagador\}/g, primeiroNome(pagador || pacs[0]))
      .replace(/\{da_sua_consulta\}/g, itens.length > 1 ? 'das suas consultas' : 'da sua consulta')
      .replace(/\{com_profissional\}/g, umProf && profs[0] ? ' com ' + profs[0] : '')
      .replace(/\{sessoes\}/g, blocos.join('\n\n'))
      .replace(/,\s*!/g, '!');
  }
  return { CONFIRMACAO_PADRAO: CONFIRMACAO_PADRAO, COBRANCA_MENSALIDADE_PADRAO: COBRANCA_MENSALIDADE_PADRAO, COBRANCA_CONSULTAS_PADRAO: COBRANCA_CONSULTAS_PADRAO,
    confirmacao: confirmacao, cobranca: cobranca, linkWhats: linkWhats, tipoCobranca: tipoCobranca, fone: fone, foneFmt: foneFmt, foneDoPaciente: foneDoPaciente, valorBR: valorBR, mesTxt: mesTxt, hora: hora };
})();
