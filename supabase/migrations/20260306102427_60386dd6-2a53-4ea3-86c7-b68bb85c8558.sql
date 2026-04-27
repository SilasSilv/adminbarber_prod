
-- Trigger function to auto-create barbershop when user confirms email
CREATE OR REPLACE FUNCTION public.handle_new_user_barbershop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name text;
  _slug text;
  _existing uuid;
BEGIN
  _name := NEW.raw_user_meta_data->>'barbershop_name';
  IF _name IS NULL OR _name = '' THEN
    RETURN NEW;
  END IF;

  _slug := lower(regexp_replace(
    regexp_replace(
      translate(_name, 'áàãâéèêíìîóòõôúùûçÁÀÃÂÉÈÊÍÌÎÓÒÕÔÚÙÛÇ', 'aaaaeeeiiioooouuucAAAAEEEIIIOOOOUUUC'),
      '[^a-zA-Z0-9]+', '-', 'g'
    ),
    '^-|-$', '', 'g'
  ));

  SELECT id INTO _existing FROM public.barbershops WHERE slug = _slug LIMIT 1;
  IF _existing IS NOT NULL THEN
    _slug := _slug || '-' || substr(md5(random()::text), 1, 6);
  END IF;

  INSERT INTO public.barbershops (owner_id, name, slug)
  VALUES (NEW.id, _name, _slug);

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created_barbershop ON auth.users;

-- Create trigger on user insert
CREATE TRIGGER on_auth_user_created_barbershop
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_barbershop();
