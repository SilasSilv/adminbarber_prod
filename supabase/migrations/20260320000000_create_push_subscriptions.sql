-- Migration: Create push_subscriptions table
-- Description: Stores Web Push API subscriptions for appointment reminders
-- Date: 2024-03-20

create table if not exists public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  appointment_id uuid references public.appointments(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(appointment_id, endpoint)
);

comment on table public.push_subscriptions is 'Armazena as inscrições de Web Push dos clientes para lembretes de agendamento';

comment on column public.push_subscriptions.appointment_id is 'ID do agendamento vinculado';
comment on column public.push_subscriptions.endpoint is 'URL do endpoint de push do navegador';
comment on column public.push_subscriptions.p256dh is 'Chave pública do cliente para criptografia ECDH';
comment on column public.push_subscriptions.auth is 'Token de autenticação para criptografia';

-- Índices para melhor performance nas queries
create index if not exists idx_push_subscriptions_appointment_id on public.push_subscriptions(appointment_id);
create index if not exists idx_push_subscriptions_endpoint on public.push_subscriptions(endpoint);