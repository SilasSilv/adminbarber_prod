
-- Create barbershops table
CREATE TABLE public.barbershops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create professionals table
CREATE TABLE public.professionals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL DEFAULT '',
  service_id UUID REFERENCES public.services(id),
  professional_id UUID REFERENCES public.professionals(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendado',
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointment_products table
CREATE TABLE public.appointment_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id),
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  products_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'dinheiro',
  barber_commission NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Helper function: get barbershop_id for current user
CREATE OR REPLACE FUNCTION public.get_user_barbershop_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.barbershops WHERE owner_id = auth.uid() LIMIT 1
$$;

-- Barbershops policies
CREATE POLICY "Users can view own barbershop" ON public.barbershops FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Users can insert own barbershop" ON public.barbershops FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own barbershop" ON public.barbershops FOR UPDATE TO authenticated USING (owner_id = auth.uid());

-- Public can view barbershops by slug (for public booking)
CREATE POLICY "Public can view barbershops" ON public.barbershops FOR SELECT TO anon USING (true);

-- Services policies
CREATE POLICY "Owner can manage services" ON public.services FOR ALL TO authenticated USING (barbershop_id = public.get_user_barbershop_id());
CREATE POLICY "Public can view active services" ON public.services FOR SELECT TO anon USING (active = true);

-- Products policies
CREATE POLICY "Owner can manage products" ON public.products FOR ALL TO authenticated USING (barbershop_id = public.get_user_barbershop_id());
CREATE POLICY "Public can view active products" ON public.products FOR SELECT TO anon USING (active = true);

-- Professionals policies
CREATE POLICY "Owner can manage professionals" ON public.professionals FOR ALL TO authenticated USING (barbershop_id = public.get_user_barbershop_id());
CREATE POLICY "Public can view active professionals" ON public.professionals FOR SELECT TO anon USING (active = true);

-- Appointments policies
CREATE POLICY "Owner can manage appointments" ON public.appointments FOR ALL TO authenticated USING (barbershop_id = public.get_user_barbershop_id());
CREATE POLICY "Public can insert appointments" ON public.appointments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can view appointments for availability" ON public.appointments FOR SELECT TO anon USING (true);

-- Appointment products policies
CREATE POLICY "Owner can manage appointment_products" ON public.appointment_products FOR ALL TO authenticated USING (
  appointment_id IN (SELECT id FROM public.appointments WHERE barbershop_id = public.get_user_barbershop_id())
);

-- Transactions policies
CREATE POLICY "Owner can manage transactions" ON public.transactions FOR ALL TO authenticated USING (barbershop_id = public.get_user_barbershop_id());
