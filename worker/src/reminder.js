import client from './whatsapp.js';
import { buscarAgendamentosPendentes, marcarComoEnviado } from './database.js';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function formatarHora(timestamp) {
  const data = new Date(timestamp);
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export async function processarLembretes() {
  if (!client.info || !client.info.wid) {
    console.log('[REMINDER] ⏸️ WhatsApp não conectado. Aguardando autenticação...');
    return;
  }
  
  console.log('[REMINDER] 🔍 Verificando agendamentos pendentes...');
  const agendamentos = await buscarAgendamentosPendentes();
  
  if (agendamentos.length === 0) {
    console.log('[REMINDER] ✅ Nenhum lembrete pendente no momento.');
    return;
  }
  
  console.log(`[REMINDER] 📤 Enviando ${agendamentos.length} lembrete(s)...`);
  
  for (const agendamento of agendamentos) {
    await delay(3000 + Math.random() * 2000);
    const numero = `${agendamento.telefone}@c.us`;
    const hora = formatarHora(agendamento.horario);
    const mensagem = `Olá ${agendamento.nome_cliente}, tudo certo? 💈 Seu horário está marcado para hoje às ${hora}. Responda para confirmar ou remarcar.`;
    
    try {
      await client.sendMessage(numero, mensagem);
      console.log(`[REMINDER] ✅ Lembrete enviado para ${agendamento.nome_cliente}`);
      await marcarComoEnviado(agendamento.id);
    } catch (error) {
      console.error(`[REMINDER] ❌ Falha ao enviar para ${agendamento.telefone}:`, error.message);
    }
  }
}