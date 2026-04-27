-- ------------------------------------------------------------
-- 20260317012010_create_professional_schedules.sql
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.professional_schedules (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id   UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    day_of_week       SMALLINT NOT NULL,                     -- 0 = domingo, 1 = segunda, …, 6 = sábado
    is_day_off        BOOLEAN NOT NULL DEFAULT FALSE,
    start_time        TEXT NOT NULL,                         -- HH:MM (24h)
    end_time          TEXT NOT NULL,                         -- HH:MM (24h)
    slot_duration     INTEGER NOT NULL DEFAULT 30,           -- minutos de duração de cada slot
    interval_minutes  INTEGER NOT NULL DEFAULT 0,          -- minutos de intervalo entre slots
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilita Row‑Level Security (RLS) – obrigatório para todas as tabelas
ALTER TABLE public.professional_schedules ENABLE ROW LEVEL SECURITY;

-- Política: apenas o dono da barbearia (ou usuários autenticados) podem ler/gravar
CREATE POLICY "professional_schedules_select"
    ON public.professional_schedules
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "professional_schedules_insert"
    ON public.professional_schedules
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = professional_id);

CREATE POLICY "professional_schedules_update"
    ON public.professional_schedules    FOR UPDATE
    TO authenticated
    USING (auth.uid() = professional_id);

CREATE POLICY "professional_schedules_delete"
    ON public.professional_schedules
    FOR DELETE
    TO authenticated
    USING (auth.uid() = professional_id);