
UPDATE public.courses SET name = 'Computer Science & Engineering (Core)'
WHERE code = 'CSE';

INSERT INTO public.courses (department_id, name, code, duration_years)
SELECT d.id, v.name, v.code, 4
FROM public.departments d
CROSS JOIN (VALUES
  ('Computer Science & Engineering (Cyber Security)','CSECS'),
  ('Computer Science & Engineering (Artificial Intelligence & Machine Learning)','CSEAIML'),
  ('Computer Science & Engineering (Data Science)','CSEDS')
) AS v(name, code)
WHERE d.code = 'CSE'
  AND NOT EXISTS (SELECT 1 FROM public.courses c WHERE c.code = v.code);

INSERT INTO public.sections (course_id, semester, name)
SELECT c.id, s.sem, n.nm
FROM public.courses c
CROSS JOIN generate_series(1,8) AS s(sem)
CROSS JOIN (VALUES ('A'),('B'),('C'),('D')) AS n(nm)
WHERE c.code IN ('CSE','CSECS','CSEAIML','CSEDS')
  AND NOT EXISTS (
    SELECT 1 FROM public.sections x
    WHERE x.course_id = c.id AND x.semester = s.sem AND x.name = n.nm
  );
