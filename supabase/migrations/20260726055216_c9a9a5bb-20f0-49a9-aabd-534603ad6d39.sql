
-- Subjects
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view subjects" ON public.subjects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage subjects" ON public.subjects
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Attendance records
CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present','absent')),
  marked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, student_id, date)
);

CREATE INDEX idx_attendance_student ON public.attendance_records(student_id);
CREATE INDEX idx_attendance_subject_date ON public.attendance_records(subject_id, date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_records TO service_role;

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Students can view their own attendance
CREATE POLICY "Students view own attendance" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Faculty / HOD / Principal / Admin can view all attendance
CREATE POLICY "Staff view all attendance" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'faculty')
    OR public.has_role(auth.uid(), 'hod')
    OR public.has_role(auth.uid(), 'principal')
    OR public.has_role(auth.uid(), 'admin')
  );

-- Faculty (and above) can insert
CREATE POLICY "Staff insert attendance" ON public.attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'faculty')
    OR public.has_role(auth.uid(), 'hod')
    OR public.has_role(auth.uid(), 'principal')
    OR public.has_role(auth.uid(), 'admin')
  );

-- Faculty (and above) can update same-day records
CREATE POLICY "Staff update attendance" ON public.attendance_records
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'faculty')
    OR public.has_role(auth.uid(), 'hod')
    OR public.has_role(auth.uid(), 'principal')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'faculty')
    OR public.has_role(auth.uid(), 'hod')
    OR public.has_role(auth.uid(), 'principal')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Staff delete attendance" ON public.attendance_records
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'faculty')
    OR public.has_role(auth.uid(), 'hod')
    OR public.has_role(auth.uid(), 'principal')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER trg_attendance_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed a few subjects per existing department
INSERT INTO public.subjects (name, code, department_id)
SELECT s.name, d.code || '-' || s.code, d.id
FROM public.departments d
CROSS JOIN (VALUES
  ('Mathematics','MATH101'),
  ('Data Structures','DS201'),
  ('Communication Skills','ENG101'),
  ('Physics','PHY101')
) AS s(name, code)
ON CONFLICT (code) DO NOTHING;
