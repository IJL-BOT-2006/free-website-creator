import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./constants";

type Profile = {
  id: string;
  full_name: string;
  username: string;
  phone: string | null;
  phone_code: string | null;
  birth_date: string | null;
  education_level: string | null;
  occupation: string | null;
  origin_country: string | null;
  residence_country: string | null;
  status: string;
  notes: string | null;
  avatar_url: string | null;
  notify_announcements: boolean;
  notify_tasks: boolean;
  notify_requests: boolean;
};

type AuthValue = {
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  role: AppRole | null;
  isAdmin: boolean;
  isManager: boolean;
  isSupervisor: boolean;
  isTeacher: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const userId = session?.user?.id ?? null;

  const { data, isLoading: meLoading } = useQuery({
    queryKey: ["me", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId!).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId!),
      ]);
      return {
        profile: (profile as Profile | null) ?? null,
        role: ((roles?.[0]?.role as AppRole) ?? null) as AppRole | null,
      };
    },
  });

  const value = useMemo<AuthValue>(() => {
    const role = data?.role ?? null;
    return {
      session,
      loading: loading || (!!userId && meLoading),
      profile: data?.profile ?? null,
      role,
      isAdmin: role === "manager" || role === "deputy",
      isManager: role === "manager",
      isSupervisor: role === "supervisor",
      isTeacher: role === "teacher",
      signOut: async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        await supabase.auth.signOut();
      },
    };
  }, [session, loading, meLoading, data, userId, queryClient]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
