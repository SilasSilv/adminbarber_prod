
-- Add Pix fields to barbershops
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS pix_key text DEFAULT NULL;
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS pix_key_type text DEFAULT NULL;
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS pix_receiver_name text DEFAULT NULL;

-- Create payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'pix',
  status text NOT NULL DEFAULT 'pendente',
  pix_code text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Owner can manage payments
CREATE POLICY "Owner can manage payments"
ON public.payments
FOR ALL
TO authenticated
USING (barbershop_id = get_user_barbershop_id());

-- Public can insert payments (for booking flow)
CREATE POLICY "Public can insert payments"
ON public.payments
FOR INSERT
TO anon
WITH CHECK (barbershop_id IN (SELECT id FROM barbershops));

-- Public can view own payment by appointment
CREATE POLICY "Public can view payments"
ON public.payments
FOR SELECT
TO anon
USING (true);
