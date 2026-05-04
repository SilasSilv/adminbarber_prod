import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('[DATABASE] Erro: Variáveis de ambiente do Supabase não configuradas.');
  process.exit(1);
}
export const supabase = createClient(supabaseUrl, supabaseKey);

/** * Busca agendamentos pendentes para envio de lembrete * (entre +2h e +2h01min a partir de agora) * e o lembrete ainda não foi enviado. */ export async function buscarAgendamentosPendentes() {
  const agora = new Date();
  const limiteInferior = new Date(agora.getTime() + 2 * 60 * 60 * 1000); // +2h
  const limiteSuperior = new Date(limiteInferior.getTime() + 60 * 1000); // +1min de tolerância
  const { data, error } = await supabase
    .from('agendamentos')
    .select('id, nome_cliente, telefone, horario')
    .eq('lembrete_enviado', false)
    .gte('horario', limiteInferior.toISOString())
    .lte('horario', limiteSuperior.toISOString());
  if (error) {
    console.error('[DATABASE] Erro ao buscar agendamentos:', error.message);
    return [];
  }
  return data;
}

/** * Atualiza o status do agendamento para lembrete enviado */ export async function marcarComoEnviado(id) {
  const { error } = await supabase
    .from('agendamentos')
    .update({ lembrete_enviado: true })
    .eq('id', id);
  if (error) {
    console.error(`[DATABASE] Erro ao atualizar agendamento ${id}:`, error.message);
  }
}