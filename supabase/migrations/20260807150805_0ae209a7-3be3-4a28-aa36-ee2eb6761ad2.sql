-- ========= ENUMS =========
create type public.app_role as enum ('manager','deputy','supervisor','teacher');
create type public.account_status as enum ('active','suspended','archived');
create type public.student_status as enum ('active','paused','warned','expelled');
create type public.circle_status as enum ('active','paused','closed');
create type public.attendance_status as enum ('present','excused','unexcused');
create type public.request_status as enum ('pending','approved','rejected','archived');
create type public.task_status as enum ('in_progress','done','not_done');

-- ========= PROFILES =========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  username text not null unique,
  phone text,
  status public.account_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

-- public directory for the login name picker
create table public.login_directory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  username text not null unique,
  active boolean not null default true
);
grant select on public.login_directory to anon, authenticated;
grant all on public.login_directory to service_role;
alter table public.login_directory enable row level security;
create policy "login directory is readable by everyone"
  on public.login_directory for select to anon, authenticated using (active);

-- ========= HELPERS =========
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('manager','deputy'))
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

-- ========= CIRCLES =========
create table public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  circle_type text not null default 'قرآن كريم',
  level text,
  days text[] not null default '{}',
  time_text text,
  status public.circle_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.circles to authenticated;
grant all on public.circles to service_role;
alter table public.circles enable row level security;

create table public.circle_teachers (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (circle_id, teacher_id)
);
grant select, insert, update, delete on public.circle_teachers to authenticated;
grant all on public.circle_teachers to service_role;
alter table public.circle_teachers enable row level security;

create table public.circle_supervisors (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  supervisor_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (circle_id, supervisor_id)
);
grant select, insert, update, delete on public.circle_supervisors to authenticated;
grant all on public.circle_supervisors to service_role;
alter table public.circle_supervisors enable row level security;

create or replace function public.teaches_circle(_user_id uuid, _circle_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.circle_teachers where teacher_id = _user_id and circle_id = _circle_id)
$$;

create or replace function public.supervises_circle(_user_id uuid, _circle_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.circle_supervisors where supervisor_id = _user_id and circle_id = _circle_id)
$$;

create or replace function public.can_view_circle(_user_id uuid, _circle_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin(_user_id)
      or public.teaches_circle(_user_id, _circle_id)
      or public.supervises_circle(_user_id, _circle_id)
$$;

-- ========= STUDENTS =========
create table public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  country text,
  circle_id uuid references public.circles(id) on delete set null,
  level text,
  enrolled_at date not null default current_date,
  status public.student_status not null default 'active',
  warnings_count int not null default 0,
  pledges_count int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.students to authenticated;
grant all on public.students to service_role;
alter table public.students enable row level security;

create table public.student_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  event_type text not null, -- status_change | warning | pledge | transfer | note
  from_value text,
  to_value text,
  reason text,
  notes text,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert on public.student_events to authenticated;
grant all on public.student_events to service_role;
alter table public.student_events enable row level security;

-- ========= ATTENDANCE =========
create table public.student_attendance (
  id uuid primary key default gen_random_uuid(),
  session_date date not null default current_date,
  circle_id uuid not null references public.circles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status public.attendance_status not null,
  notes text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_date, circle_id, student_id)
);
grant select, insert, update, delete on public.student_attendance to authenticated;
grant all on public.student_attendance to service_role;
alter table public.student_attendance enable row level security;

create table public.teacher_attendance (
  id uuid primary key default gen_random_uuid(),
  session_date date not null default current_date,
  circle_id uuid not null references public.circles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  status public.attendance_status not null,
  makeup_date date,
  makeup_done boolean not null default false,
  reason text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (session_date, circle_id, teacher_id)
);
grant select, insert, update, delete on public.teacher_attendance to authenticated;
grant all on public.teacher_attendance to service_role;
alter table public.teacher_attendance enable row level security;

-- ========= MEMORIZATION REPORTS =========
create table public.memorization_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null default current_date,
  student_id uuid not null references public.students(id) on delete cascade,
  circle_id uuid not null references public.circles(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  curriculum text,
  amount text,
  evaluation text,
  notes text,
  approved boolean not null default false,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.memorization_reports to authenticated;
grant all on public.memorization_reports to service_role;
alter table public.memorization_reports enable row level security;

-- ========= REQUESTS =========
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  request_no bigint generated always as identity,
  request_type text not null, -- expel_student | transfer_teacher | other
  student_id uuid references public.students(id) on delete set null,
  teacher_id uuid references public.profiles(id) on delete set null,
  circle_id uuid references public.circles(id) on delete set null,
  target_circle_id uuid references public.circles(id) on delete set null,
  reason text not null,
  notes text,
  status public.request_status not null default 'pending',
  created_by uuid not null references public.profiles(id) on delete cascade,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  decision_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.requests to authenticated;
grant all on public.requests to service_role;
alter table public.requests enable row level security;

-- ========= TASKS =========
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  task_no bigint generated always as identity,
  title text not null,
  description text,
  assignee_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  status public.task_status not null default 'in_progress',
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;
alter table public.tasks enable row level security;

-- ========= ANNOUNCEMENTS =========
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  audience text not null default 'all', -- all | teachers | supervisors | admin
  published boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.announcements to authenticated;
grant all on public.announcements to service_role;
alter table public.announcements enable row level security;

-- ========= RESOURCES =========
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'منهج',
  url text,
  audience text not null default 'all',
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.resources to authenticated;
grant all on public.resources to service_role;
alter table public.resources enable row level security;

-- ========= SYSTEM LOG =========
create table public.system_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  module text not null,
  action text not null,
  result text not null default 'success',
  details jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.system_logs to authenticated;
grant all on public.system_logs to service_role;
alter table public.system_logs enable row level security;

-- ========= POLICIES =========
-- profiles
create policy "staff read profiles" on public.profiles for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "self update profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "admins manage profiles" on public.profiles for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- user_roles
create policy "staff read roles" on public.user_roles for select to authenticated
  using (public.is_staff(auth.uid()));

-- circles
create policy "staff read circles" on public.circles for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "admins manage circles" on public.circles for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "staff read circle teachers" on public.circle_teachers for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "admins manage circle teachers" on public.circle_teachers for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "staff read circle supervisors" on public.circle_supervisors for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "admins manage circle supervisors" on public.circle_supervisors for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- students
create policy "view students in own circles" on public.students for select to authenticated
  using (public.is_admin(auth.uid()) or (circle_id is not null and public.can_view_circle(auth.uid(), circle_id)));
create policy "admins manage students" on public.students for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "supervisors update own students" on public.students for update to authenticated
  using (circle_id is not null and public.supervises_circle(auth.uid(), circle_id))
  with check (true);

-- student events
create policy "view student events" on public.student_events for select to authenticated
  using (exists (select 1 from public.students s where s.id = student_id
    and (public.is_admin(auth.uid()) or (s.circle_id is not null and public.can_view_circle(auth.uid(), s.circle_id)))));
create policy "staff add student events" on public.student_events for insert to authenticated
  with check (public.is_staff(auth.uid()) and actor_id = auth.uid());

-- student attendance
create policy "view attendance of own circles" on public.student_attendance for select to authenticated
  using (public.can_view_circle(auth.uid(), circle_id));
create policy "record attendance of own circles" on public.student_attendance for insert to authenticated
  with check (public.can_view_circle(auth.uid(), circle_id));
create policy "update attendance of own circles" on public.student_attendance for update to authenticated
  using (public.can_view_circle(auth.uid(), circle_id)) with check (public.can_view_circle(auth.uid(), circle_id));
create policy "admins delete attendance" on public.student_attendance for delete to authenticated
  using (public.is_admin(auth.uid()));

-- teacher attendance
create policy "view teacher attendance" on public.teacher_attendance for select to authenticated
  using (public.can_view_circle(auth.uid(), circle_id) or teacher_id = auth.uid());
create policy "manage teacher attendance" on public.teacher_attendance for all to authenticated
  using (public.is_admin(auth.uid()) or public.supervises_circle(auth.uid(), circle_id))
  with check (public.is_admin(auth.uid()) or public.supervises_circle(auth.uid(), circle_id));

-- memorization reports
create policy "view reports of own circles" on public.memorization_reports for select to authenticated
  using (public.can_view_circle(auth.uid(), circle_id));
create policy "write reports of own circles" on public.memorization_reports for insert to authenticated
  with check (public.can_view_circle(auth.uid(), circle_id));
create policy "update reports of own circles" on public.memorization_reports for update to authenticated
  using (public.can_view_circle(auth.uid(), circle_id)) with check (public.can_view_circle(auth.uid(), circle_id));
create policy "admins delete reports" on public.memorization_reports for delete to authenticated
  using (public.is_admin(auth.uid()));

-- requests
create policy "view requests" on public.requests for select to authenticated
  using (public.is_admin(auth.uid()) or created_by = auth.uid());
create policy "create requests" on public.requests for insert to authenticated
  with check (public.is_staff(auth.uid()) and created_by = auth.uid());
create policy "admins decide requests" on public.requests for update to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- tasks
create policy "view own or managed tasks" on public.tasks for select to authenticated
  using (public.is_admin(auth.uid()) or assignee_id = auth.uid() or created_by = auth.uid());
create policy "create tasks" on public.tasks for insert to authenticated
  with check (public.is_staff(auth.uid()) and created_by = auth.uid());
create policy "update own or managed tasks" on public.tasks for update to authenticated
  using (public.is_admin(auth.uid()) or assignee_id = auth.uid() or created_by = auth.uid())
  with check (true);
create policy "admins delete tasks" on public.tasks for delete to authenticated
  using (public.is_admin(auth.uid()));

-- announcements
create policy "staff read announcements" on public.announcements for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "admins manage announcements" on public.announcements for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- resources
create policy "staff read resources" on public.resources for select to authenticated
  using (public.is_staff(auth.uid()));
create policy "admins manage resources" on public.resources for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- system logs
create policy "admins read logs" on public.system_logs for select to authenticated
  using (public.is_admin(auth.uid()));
create policy "staff write logs" on public.system_logs for insert to authenticated
  with check (public.is_staff(auth.uid()));

-- ========= TRIGGERS =========
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create trigger t_profiles_updated before update on public.profiles for each row execute function public.touch_updated_at();
create trigger t_circles_updated before update on public.circles for each row execute function public.touch_updated_at();
create trigger t_students_updated before update on public.students for each row execute function public.touch_updated_at();
create trigger t_attendance_updated before update on public.student_attendance for each row execute function public.touch_updated_at();
create trigger t_reports_updated before update on public.memorization_reports for each row execute function public.touch_updated_at();
create trigger t_requests_updated before update on public.requests for each row execute function public.touch_updated_at();
create trigger t_tasks_updated before update on public.tasks for each row execute function public.touch_updated_at();
create trigger t_ann_updated before update on public.announcements for each row execute function public.touch_updated_at();

-- keep login directory in sync with profiles
create or replace function public.sync_login_directory()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.login_directory (user_id, full_name, username, active)
  values (new.id, new.full_name, new.username, new.status = 'active')
  on conflict (user_id) do update
    set full_name = excluded.full_name,
        username = excluded.username,
        active = excluded.active;
  return new;
end; $$;

create trigger t_profiles_sync_directory
after insert or update of full_name, username, status on public.profiles
for each row execute function public.sync_login_directory();

-- student status change logging
create or replace function public.log_student_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.student_events (student_id, event_type, from_value, to_value, actor_id)
    values (new.id, 'status_change', old.status::text, new.status::text, auth.uid());
  end if;
  if new.circle_id is distinct from old.circle_id then
    insert into public.student_events (student_id, event_type, from_value, to_value, actor_id)
    values (new.id, 'transfer', old.circle_id::text, new.circle_id::text, auth.uid());
  end if;
  return new;
end; $$;

create trigger t_students_status_log
after update on public.students
for each row execute function public.log_student_status_change();

create index idx_students_circle on public.students(circle_id);
create index idx_attendance_circle_date on public.student_attendance(circle_id, session_date);
create index idx_reports_circle_date on public.memorization_reports(circle_id, report_date);
create index idx_tasks_assignee on public.tasks(assignee_id);