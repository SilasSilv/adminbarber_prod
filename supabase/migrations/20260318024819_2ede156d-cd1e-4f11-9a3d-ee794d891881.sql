
-- 1. Add user_id and email columns to professionals table
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS email text;

-- 2. Fix get_user_barbershop_id to also check professionals table
CREATE OR REPLACE FUNCTION public.get_user_barbershop_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  UNION ALL
  SELECT barbershop_id FROM public.professionals WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- 3. Add RLS policy so professionals can view their barbershop
CREATE POLICY "Professionals can view their barbershop"
ON public.barbershops
FOR SELECT
TO authenticated
USING (
  id IN (SELECT barbershop_id FROM public.professionals WHERE user_id = auth.uid())
);
