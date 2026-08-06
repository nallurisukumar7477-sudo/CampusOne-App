
CREATE TYPE public.notice_category AS ENUM ('general','academic','exam','holiday','placement','event');
CREATE TYPE public.notice_priority AS ENUM ('normal','important','urgent');

CREATE TABLE public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category public.notice_category NOT NULL DEFAULT 'general',
  priority public.notice_priority NOT NULL DEFAULT 'normal',
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  attachment_name text,
  attachment_url text,
  published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notices TO authenticated;
GRANT ALL ON public.notices TO service_role;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER notices_updated_at BEFORE UPDATE ON public.notices
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.current_user_department_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT department_id FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.current_user_course_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT course_id FROM public.profiles WHERE id = auth.uid() $$;

CREATE POLICY "Staff view all notices" ON public.notices FOR SELECT TO authenticated
USING (has_role(auth.uid(),'faculty'::app_role) OR has_role(auth.uid(),'hod'::app_role) OR has_role(auth.uid(),'principal'::app_role) OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Students view targeted notices" ON public.notices FOR SELECT TO authenticated
USING (
  published = true
  AND has_role(auth.uid(),'student'::app_role)
  AND (department_id IS NULL OR department_id = public.current_user_department_id())
  AND (course_id IS NULL OR course_id = public.current_user_course_id())
  AND (section_id IS NULL OR section_id = public.current_user_section_id())
);

CREATE POLICY "Staff create notices" ON public.notices FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (has_role(auth.uid(),'faculty'::app_role) OR has_role(auth.uid(),'hod'::app_role) OR has_role(auth.uid(),'principal'::app_role) OR has_role(auth.uid(),'admin'::app_role))
);

CREATE POLICY "Authors update own notices" ON public.notices FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(),'admin'::app_role))
WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Authors delete own notices" ON public.notices FOR DELETE TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.notice_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id uuid NOT NULL REFERENCES public.notices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notice_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.notice_reads TO authenticated;
GRANT ALL ON public.notice_reads TO service_role;
ALTER TABLE public.notice_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notice reads" ON public.notice_reads FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "Users insert own notice reads" ON public.notice_reads FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own notice reads" ON public.notice_reads FOR DELETE TO authenticated
USING (user_id = auth.uid());
