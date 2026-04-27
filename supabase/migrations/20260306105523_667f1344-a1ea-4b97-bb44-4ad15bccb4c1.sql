
-- Create clients table
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name text NOT NULL,
  whatsapp text NOT NULL DEFAULT '',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Owner can manage clients
CREATE POLICY "Owner can manage clients"
  ON public.clients FOR ALL TO authenticated
  USING (barbershop_id = get_user_barbershop_id())
  WITH CHECK (barbershop_id = get_user_barbershop_id());
