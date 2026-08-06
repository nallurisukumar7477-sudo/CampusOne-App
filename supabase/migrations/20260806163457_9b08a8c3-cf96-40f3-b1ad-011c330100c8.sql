
REVOKE ALL ON FUNCTION public.current_user_department_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_course_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_department_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_course_id() TO authenticated;
