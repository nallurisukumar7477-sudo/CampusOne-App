ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.sections(id) ON DELETE CASCADE;

ALTER TABLE public.attendance_records ALTER COLUMN subject_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_records_section_student_date_key
  ON public.attendance_records (section_id, student_id, date)
  WHERE section_id IS NOT NULL;