import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "./constants";

type Profile = {
  id: string;
  full_name: string;
  username: string;
  username_display: string | null;
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

/** مدة عدم النشاط قبل تسجيل الخروج التلقائي (٣٠ دقيقة) */
const IDLE_LIMIT_MS = 30 * 60 * 1000;
const ACTIVITY_KEY = "maqraah:last-activity";

function readActivity() {
  try {
    return Number(localStorage.getItem(ACTIVITY_KEY) ?? 0);
  } catch {
    return 0;
  }
}
function markActivity() {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
  } catch {
    /* تجاهل */
  }
}
function clearActivity() {
  try {
    localStorage.removeItem(ACTIVITY_KEY);
  } catch {
    /* تجاهل */
  }
}
function isIdleExpired() {
  const last = readActivity();
  return last > 0 && Date.now() - last > IDLE_LIMIT_MS;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const hadSession = useRef(false);

  const signOut = useCallback(async () => {
    clearActivity();
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
  }, [queryClient]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "SIGNED_IN" && !hadSession.current) markActivity();
      hadSession.current = !!next;
      setSession(next);
      window.setTimeout(() => queryClient.invalidateQueries({ queryKey: ["me"] }), 0);
    });
    const guard = window.setTimeout(() => setLoading(false), 8000);
    supabase.auth
      .getSession()
      .then(({ data }) => {
        hadSession.current = hadSession.current || !!data.session;
        setSession(data.session);
      })
      .catch(() => undefined)
      .finally(() => {
        window.clearTimeout(guard);
        setLoading(false);
      });
    return () => {
      window.clearTimeout(guard);
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const userId = session?.user?.id ?? null;

  const { data, isLoading: meLoading } = useQuery({
    queryKey: ["me", userId],
    enabled: !!userId,
    retry: 1,
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId!).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId!),
      ]);
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      return {
        profile: (p.data as Profile | null) ?? null,
        role: ((r.data?.[0]?.role as AppRole) ?? null) as AppRole | null,
      };
    },
  });

  // حساب موقوف أو بدون ملف: تسجيل خروج
  useEffect(() => {
    if (!userId || !data) return;
    if (!data.profile || data.profile.status !== "active") void signOut();
  }, [userId, data, signOut]);

  // قفل تلقائي عند عدم النشاط أو عند العودة بعد غياب طويل
  useEffect(() => {
    if (!userId) return;
    if (isIdleExpired()) {
      void signOut();
      return;
    }
    markActivity();
    let lastWrite = Date.now();
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite > 15_000) {
        lastWrite = now;
        markActivity();
      }
    };
    const events = ["pointerdown", "keydown", "touchstart", "scroll", "mousemove"] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const onVisible = () => {
      if (document.visibilityState === "visible" && isIdleExpired()) void signOut();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => {
      if (isIdleExpired()) void signOut();
    }, 60_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [userId, signOut]);

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
      signOut,
    };
  }, [session, loading, meLoading, data, userId, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
