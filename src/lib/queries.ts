import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./constants";

export type StaffRow = {
  id: string;
  full_name: string;
  username: string;
  username_display: string | null;
  phone: string | null;
  status: string;
  notes: string | null;
  role: AppRole | null;
};


export function useCircles(includeArchived = false) {
  return useQuery({
    queryKey: ["circles", includeArchived],
    queryFn: async () => {
      let q = supabase.from("circles").select("*").order("name");
      if (!includeArchived) q = q.eq("archived", false);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}


export function useStaff() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: async (): Promise<StaffRow[]> => {
      const [{ data: profiles, error }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      const map = new Map((roles ?? []).map((r) => [r.user_id, r.role as AppRole]));
      return (profiles ?? []).map((p) => ({ ...p, role: map.get(p.id) ?? null }));
    },
  });
}

export type RateMap = Record<string, { present: number; total: number; rate: number }>;

function toRates(rows: { key: string; status: string }[]): RateMap {
  const acc: RateMap = {};
  for (const r of rows) {
    const cur = acc[r.key] ?? { present: 0, total: 0, rate: 0 };
    cur.total += 1;
    if (r.status === "present") cur.present += 1;
    cur.rate = Math.round((cur.present / cur.total) * 100);
    acc[r.key] = cur;
  }
  return acc;
}

/** نسبة الحضور لكل طالبة (اختياريًا ضمن شهر بصيغة YYYY-MM). */
export function useStudentAttendanceRates(month?: string) {
  return useQuery({
    queryKey: ["student-attendance-rates", month ?? "all"],
    queryFn: async (): Promise<RateMap> => {
      let q = supabase.from("student_attendance").select("student_id, status, session_date");
      if (month) q = q.gte("session_date", `${month}-01`).lte("session_date", `${month}-31`);
      const { data, error } = await q;
      if (error) throw error;
      return toRates((data ?? []).map((r) => ({ key: r.student_id, status: r.status })));
    },
  });
}

/** نسبة الحضور لكل معلمة. */
export function useTeacherAttendanceRates(month?: string) {
  return useQuery({
    queryKey: ["teacher-attendance-rates", month ?? "all"],
    queryFn: async (): Promise<RateMap> => {
      let q = supabase.from("teacher_attendance").select("teacher_id, status, session_date");
      if (month) q = q.gte("session_date", `${month}-01`).lte("session_date", `${month}-31`);
      const { data, error } = await q;
      if (error) throw error;
      return toRates((data ?? []).map((r) => ({ key: r.teacher_id, status: r.status })));
    },
  });
}

export function useStudents() {
  return useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
  });
}
