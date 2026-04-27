
-- Make public appointment insert more restrictive - only allow if barbershop exists
DROP POLICY "Public can insert appointments" ON public.appointments;
CREATE POLICY "Public can insert appointments" ON public.appointments FOR INSERT TO anon
WITH CHECK (barbershop_id IN (SELECT id FROM public.barbershops));
