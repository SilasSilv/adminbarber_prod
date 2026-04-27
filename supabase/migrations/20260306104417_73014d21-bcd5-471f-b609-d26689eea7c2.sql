
-- Backfill barbershops for existing users who don't have one
INSERT INTO public.barbershops (owner_id, name, slug)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'barbershop_name', 'Minha Barbearia'),
  COALESCE(
    lower(regexp_replace(
      regexp_replace(
        translate(COALESCE(u.raw_user_meta_data->>'barbershop_name', 'minha-barbearia'), 
          'áàãâéèêíìîóòõôúùûçÁÀÃÂÉÈÊÍÌÎÓÒÕÔÚÙÛÇ', 'aaaaeeeiiioooouuucAAAAEEEIIIOOOOUUUC'),
        '[^a-zA-Z0-9]+', '-', 'g'
      ),
      '^-|-$', '', 'g'
    )),
    'minha-barbearia'
  ) || '-' || substr(md5(u.id::text), 1, 6)
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.barbershops b WHERE b.owner_id = u.id
);
