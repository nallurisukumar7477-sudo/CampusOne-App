-- Period slots
CREATE TABLE public.timetable_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position integer NOT NULL UNIQUE,
  label text NOT NULL,
  kind text NOT NULL DEFAULT 'class',
  period_no integer,
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.timetable_slots TO authenticated;
GRANT ALL ON public.timetable_slots TO service_role;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can view slots" ON public.timetable_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage slots" ON public.timetable_slots FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.timetable_slots (position, label, kind, period_no, start_time, end_time) VALUES
 (1,'1st Hour','class',1,'09:20','10:10'),
 (2,'2nd Hour','class',2,'10:10','11:00'),
 (3,'Break','break',NULL,'11:00','11:10'),
 (4,'3rd Hour','class',3,'11:10','12:00'),
 (5,'Lunch','lunch',NULL,'12:00','13:10'),
 (6,'4th Hour','class',4,'13:10','14:10'),
 (7,'5th Hour','class',5,'14:10','15:10'),
 (8,'Break','break',NULL,'15:10','15:20'),
 (9,'6th Hour','class',6,'15:20','16:20');

-- Timetables (one per section)
CREATE TABLE public.timetables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL UNIQUE REFERENCES public.sections(id) ON DELETE CASCADE,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timetables TO authenticated;
GRANT ALL ON public.timetables TO service_role;
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view published timetables" ON public.timetables FOR SELECT TO authenticated
  USING (published = true);
CREATE POLICY "Staff view all timetables" ON public.timetables FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'faculty'::app_role) OR has_role(auth.uid(),'hod'::app_role) OR has_role(auth.uid(),'principal'::app_role) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff manage timetables" ON public.timetables FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'faculty'::app_role) OR has_role(auth.uid(),'hod'::app_role) OR has_role(auth.uid(),'principal'::app_role) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff update timetables" ON public.timetables FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'faculty'::app_role) OR has_role(auth.uid(),'hod'::app_role) OR has_role(auth.uid(),'principal'::app_role) OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'faculty'::app_role) OR has_role(auth.uid(),'hod'::app_role) OR has_role(auth.uid(),'principal'::app_role) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff delete timetables" ON public.timetables FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER timetables_updated_at BEFORE UPDATE ON public.timetables FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Entries
CREATE TABLE public.timetable_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timetable_id uuid NOT NULL REFERENCES public.timetables(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 6),
  slot_id uuid NOT NULL REFERENCES public.timetable_slots(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  faculty_id uuid,
  room text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (timetable_id, day_of_week, slot_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timetable_entries TO authenticated;
GRANT ALL ON public.timetable_entries TO service_role;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View entries of published timetables" ON public.timetable_entries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.timetables t WHERE t.id = timetable_id AND t.published = true));
CREATE POLICY "Staff view all entries" ON public.timetable_entries FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'faculty'::app_role) OR has_role(auth.uid(),'hod'::app_role) OR has_role(auth.uid(),'principal'::app_role) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff insert entries" ON public.timetable_entries FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'faculty'::app_role) OR has_role(auth.uid(),'hod'::app_role) OR has_role(auth.uid(),'principal'::app_role) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff update entries" ON public.timetable_entries FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'faculty'::app_role) OR has_role(auth.uid(),'hod'::app_role) OR has_role(auth.uid(),'principal'::app_role) OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'faculty'::app_role) OR has_role(auth.uid(),'hod'::app_role) OR has_role(auth.uid(),'principal'::app_role) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff delete entries" ON public.timetable_entries FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'faculty'::app_role) OR has_role(auth.uid(),'hod'::app_role) OR has_role(auth.uid(),'principal'::app_role) OR has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER timetable_entries_updated_at BEFORE UPDATE ON public.timetable_entries FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed subjects
INSERT INTO public.subjects (name, code)
SELECT v.name, v.code FROM (VALUES
  ('Computational Mathematics','CM'),
  ('Web Development','WD'),
  ('Python Programming','PP'),
  ('Professional Communication','PC'),
  ('Critical Thinking and Logical Reasoning','CTLR')
) AS v(name, code)
WHERE NOT EXISTS (SELECT 1 FROM public.subjects s WHERE s.code = v.code);