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
  return { CONFIRMACAO_PADRAO: CONFIRMACAO_PADRAO, confirmacao: confirmacao, hora: hora };
})();
