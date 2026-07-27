
-- Courses
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  duration_years integer NOT NULL DEFAULT 4 CHECK (duration_years BETWEEN 1 AND 6),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can view courses" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage courses" ON public.courses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Sections
CREATE TABLE public.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  semester integer NOT NULL CHECK (semester BETWEEN 1 AND 12),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, semester, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sections TO authenticated;
GRANT ALL ON public.sections TO service_role;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can view sections" ON public.sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage sections" ON public.sections FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER sections_updated_at BEFORE UPDATE ON public.sections FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Profile extensions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS roll_number text,
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS semester integer CHECK (semester BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS profile_completed boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_roll_number_unique
  ON public.profiles (lower(roll_number)) WHERE roll_number IS NOT NULL;

-- Faculty assignments
CREATE TABLE public.faculty_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (faculty_id, section_id, subject_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faculty_assignments TO authenticated;
GRANT ALL ON public.faculty_assignments TO service_role;
ALTER TABLE public.faculty_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage faculty assignments" ON public.faculty_assignments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Faculty view own assignments" ON public.faculty_assignments FOR SELECT TO authenticated
  USING (faculty_id = auth.uid());
CREATE POLICY "Leadership view all assignments" ON public.faculty_assignments FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'hod'::app_role) OR has_role(auth.uid(),'principal'::app_role));

-- Expanded profile visibility so staff can see users, and classmates can see each other
CREATE POLICY "Staff view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'faculty'::app_role)
    OR has_role(auth.uid(),'hod'::app_role)
    OR has_role(auth.uid(),'principal'::app_role)
  );

CREATE POLICY "Classmates view section peers" ON public.profiles FOR SELECT TO authenticated
  USING (
    section_id IS NOT NULL
    AND section_id = (SELECT section_id FROM public.profiles WHERE id = auth.uid())
  );

-- Avatar storage policies (bucket already created)
CREATE POLICY "Users view own avatar" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Staff view all avatars" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (
    has_role(auth.uid(),'faculty'::app_role) OR has_role(auth.uid(),'hod'::app_role)
    OR has_role(auth.uid(),'principal'::app_role) OR has_role(auth.uid(),'admin'::app_role)
  ));

CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
