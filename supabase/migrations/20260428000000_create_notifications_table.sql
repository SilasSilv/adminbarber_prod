-- Create notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references barbershops(id) on delete cascade,
  title text not null,
  message text not null,
  type text,
  read boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.notifications enable row level security;

-- Create policies
create policy "Users can view notifications from their own barbershop"
  on public.notifications for select
  using (
    barbershop_id in (
      select id from barbershops where owner_id = auth.uid()
      union
      select barbershop_id from professionals where user_id = auth.uid() and active = true
    )
  );

create policy "Users can update their own notifications"
  on public.notifications for update
  using (
    barbershop_id in (
      select id from barbershops where owner_id = auth.uid()
      union
      select barbershop_id from professionals where user_id = auth.uid() and active = true
    )
  )
  with check (
    barbershop_id in (
      select id from barbershops where owner_id = auth.uid()
      union
      select barbershop_id from professionals where user_id = auth.uid() and active = true
    )
  );

-- Create indexes for performance
create index idx_notifications_barbershop_id on public.notifications(barbershop_id);
create index idx_notifications_created_at_desc on public.notifications(created_at desc);
create index idx_notifications_read on public.notifications(read);