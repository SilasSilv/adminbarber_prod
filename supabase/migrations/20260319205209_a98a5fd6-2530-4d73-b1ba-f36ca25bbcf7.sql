CREATE POLICY "Public can insert clients via booking"
ON public.clients
FOR INSERT
TO anon
WITH CHECK (barbershop_id IN (SELECT id FROM barbershops));

CREATE POLICY "Public can check existing clients"
ON public.clients
FOR SELECT
TO anon
USING (true);