CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  requested text := lower(coalesce(NEW.raw_user_meta_data->>'role', 'student'));
  assigned public.app_role;
BEGIN
  IF requested = 'faculty' THEN
    assigned := 'faculty'::public.app_role;
  ELSE
    assigned := 'student'::public.app_role;
  END IF;

  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;