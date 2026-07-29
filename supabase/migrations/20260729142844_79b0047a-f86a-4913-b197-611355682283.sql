
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialization text;

INSERT INTO public.departments (name, code) VALUES
  ('Computer Science and Engineering', 'CSE'),
  ('Electronics and Communication Engineering', 'ECE'),
  ('Mechanical Engineering', 'MECH'),
  ('Civil Engineering', 'CIVIL')
ON CONFLICT DO NOTHING;

-- Allow admins to delete profiles (was previously denied)
DROP POLICY IF EXISTS "Admins delete any profile" ON public.profiles;
CREATE POLICY "Admins delete any profile"
ON public.profiles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
