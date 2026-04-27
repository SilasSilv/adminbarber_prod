-- Configurar cron job para executar a edge function send-appointment-reminders a cada 5 minutos
-- Execute este script no SQL Editor do Supabase

-- 1. Criar a extensão pg_cron se ainda não existir
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Agendar a execução da edge function a cada 5 minutos
-- Substitua PROJECT_REF pela referência do seu projeto Supabase
-- Formato: https://PROJECT_REF.supabase.co/functions/v1/send-appointment-reminders

SELECT cron.schedule(
  'send-appointment-reminders',  -- nome do job
  '*/5 * * * *',                 -- expressão cron: a cada 5 minutos
  $$
  SELECT
    net.http_post(
      url:='https://PROJECT_REF.supabase.co/functions/v1/send-appointment-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    ) AS request_id;
  $$
);

-- Para verificar se o cron job foi criado:
-- SELECT * FROM cron.job;

-- Para remover o cron job (se necessário):
-- SELECT cron.unschedule('send-appointment-reminders');

-- 3. (Opcional) Criar tabela para logs de execução (para debug)
CREATE TABLE IF NOT EXISTS public.reminder_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  executed_at timestamp with time zone DEFAULT now(),
  result jsonb
);

-- 4. (Opcional) Função para inserir logs
CREATE OR REPLACE FUNCTION public.log_reminder_execution(result_data jsonb)
RETURNS void AS $$
BEGIN
  INSERT INTO public.reminder_logs (result) VALUES (result_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;