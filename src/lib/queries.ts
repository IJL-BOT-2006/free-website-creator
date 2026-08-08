import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./constants";

export type StaffRow = {
  id: string;
  full_name: string;
  username: string;
  phone: string | null;
  status: string;
  notes: string | null;
  role: AppRole | null;
};

export function useCircles() {
  return useQuery({
    queryKey: ["circles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("circles").select("*").order("name");
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
