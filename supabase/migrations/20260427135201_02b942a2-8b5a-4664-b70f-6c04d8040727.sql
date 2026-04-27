-- Add reminder_sent_at to appointments for idempotency
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamp with time zone;

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_appointment
  ON public.push_subscriptions (appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointments_reminder_lookup
  ON public.appointments (status, date, start_time)
  WHERE reminder_sent_at IS NULL;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Public/anon can insert their own subscription right after booking
CREATE POLICY "Public can insert push subscriptions"
ON public.push_subscriptions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  appointment_id IN (SELECT id FROM public.appointments)
);

-- Owner of the barbershop can view/delete subscriptions linked to their appointments
CREATE POLICY "Owner can view push subscriptions"
ON public.push_subscriptions
FOR SELECT
TO authenticated
USING (
  appointment_id IN (
    SELECT id FROM public.appointments
    WHERE barbershop_id = public.get_user_barbershop_id()
  )
);

CREATE POLICY "Owner can delete push subscriptions"
ON public.push_subscriptions
FOR DELETE
TO authenticated
USING (
  appointment_id IN (
    SELECT id FROM public.appointments
    WHERE barbershop_id = public.get_user_barbershop_id()
  )
);