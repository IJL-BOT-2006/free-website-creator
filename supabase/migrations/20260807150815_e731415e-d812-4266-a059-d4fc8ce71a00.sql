revoke execute on function public.has_role(uuid, public.app_role) from anon, authenticated;
revoke execute on function public.is_admin(uuid) from anon, authenticated;
revoke execute on function public.is_staff(uuid) from anon, authenticated;
revoke execute on function public.teaches_circle(uuid, uuid) from anon, authenticated;
revoke execute on function public.supervises_circle(uuid, uuid) from anon, authenticated;
revoke execute on function public.can_view_circle(uuid, uuid) from anon, authenticated;
revoke execute on function public.touch_updated_at() from anon, authenticated;
revoke execute on function public.sync_login_directory() from anon, authenticated;
revoke execute on function public.log_student_status_change() from anon, authenticated;