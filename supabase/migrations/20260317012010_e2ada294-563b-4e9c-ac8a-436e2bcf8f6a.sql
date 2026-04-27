
CREATE TABLE public.professional_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  slot_duration INTEGER NOT NULL DEFAULT 30,
  interval_minutes INTEGER NOT NULL DEFAULT 0,
  is_day_off BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (professional_id, day_of_week)
);

ALTER TABLE public.professional_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage professional_schedules"
ON public.professional_schedules
FOR ALL
TO authenticated
USING (
  professional_id IN (
    SELECT id FROM public.professionals WHERE barbershop_id = get_user_barbershop_id()
  )
)
WITH CHECK (
  professional_id IN (
    SELECT id FROM public.professionals WHERE barbershop_id = get_user_barbershop_id()
  )
);

CREATE POLICY "Public can view professional_schedules"
ON public.professional_schedules
FOR SELECT
TO anon
USING (true);
