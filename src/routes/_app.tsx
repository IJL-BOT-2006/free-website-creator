import { useEffect, useState } from "react";
import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BellRing,
  BookOpenText,
  CalendarCheck,
  ClipboardList,
  FileBarChart,
  FolderOpen,
  Gauge,
  GraduationCap,
  Inbox,
  ListChecks,
  Loader2,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { ROLE_LABELS, type AppRole } from "@/lib/constants";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

type NavItem = {
  to: string;
  label: string;
  icon: typeof Gauge;
  roles?: AppRole[];
};

const NAV: NavItem[] = [
  { to: "/dashboard", label: "لوحة التحكم", icon: Gauge },
  { to: "/circles", label: "الحلقات", icon: BookOpenText },
  { to: "/students", label: "الطالبات", icon: GraduationCap },
  { to: "/attendance", label: "الحضور والغياب", icon: CalendarCheck },
  { to: "/reports", label: "تقارير الحفظ", icon: FileBarChart },
  { to: "/teachers", label: "المعلمات والمشرفات", icon: Users, roles: ["manager", "deputy", "supervisor"] },
  { to: "/requests", label: "الطلبات", icon: Inbox },
  { to: "/tasks", label: "المهام", icon: ListChecks },
  { to: "/announcements", label: "الإعلانات", icon: BellRing },
  { to: "/resources", label: "المكتبة", icon: FolderOpen },
  { to: "/assistant", label: "المساعد الذكي", icon: Sparkles },
  { to: "/logs", label: "سجل النظام", icon: ScrollText, roles: ["manager", "deputy"] },
  { to: "/settings", label: "حسابي", icon: Settings },
];

/** لمسة لون مميزة لكل صفحة، مبنية على نفس نظام OKLCH للهوية */
const PAGE_ACCENT: Record<string, string> = {
  "/dashboard": "oklch(0.45 0.1 160)",
  "/circles": "oklch(0.5 0.11 190)",
  "/students": "oklch(0.55 0.12 300)",
  "/attendance": "oklch(0.58 0.11 230)",
  "/reports": "oklch(0.62 0.13 85)",
  "/teachers": "oklch(0.52 0.12 20)",
  "/requests": "oklch(0.55 0.12 265)",
  "/tasks": "oklch(0.55 0.13 135)",
  "/announcements": "oklch(0.62 0.14 55)",
  "/resources": "oklch(0.5 0.09 210)",
  "/assistant": "oklch(0.56 0.13 320)",
  "/logs": "oklch(0.48 0.05 175)",
  "/settings": "oklch(0.5 0.08 160)",
};

function accentFor(pathname: string) {
  const key = Object.keys(PAGE_ACCENT).find(
    (k) => pathname === k || pathname.startsWith(`${k}/`),
  );
  return key ? PAGE_ACCENT[key] : "var(--color-primary)";
}


function AppLayout() {
  const { session, loading, profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/", replace: true });
  }, [loading, session, navigate]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    let startX: number | null = null;
    let startY = 0;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      startY = t.clientY;
      startX = window.innerWidth - t.clientX < 32 ? t.clientX : null;
    };
    const onEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (startX === null || !t) return;
      const dx = startX - t.clientX;
      if (dx > 60 && Math.abs(t.clientY - startY) < 70) setOpen(true);
      startX = null;
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  if (loading || !session) {
    return (
      <div className="surface-hero flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Logo className="size-20 animate-pulse" glow />
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  const items = NAV.filter((item) => !item.roles || (role && item.roles.includes(role)));

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-72 overflow-y-auto border-l border-sidebar-border bg-sidebar bg-[linear-gradient(190deg,color-mix(in_oklab,var(--color-sidebar-accent)_60%,var(--color-sidebar))_0%,var(--color-sidebar)_45%)] px-4 py-6 text-sidebar-foreground shadow-[var(--shadow-lift)] transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        )}
      >
        <div className="mb-6 flex items-center gap-3 px-2">
          <Logo className="size-14 shrink-0" />
          <div className="leading-tight">
            <p className="font-display text-base font-bold">حبل الله المتين</p>
            <p className="text-xs text-sidebar-foreground/70">نظام إدارة المقرأة</p>
          </div>
          <button
            type="button"
            className="mr-auto lg:hidden"
            aria-label="إغلاق القائمة"
            onClick={() => setOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="gold-divider mb-5" />

        <nav className="space-y-1">
          {items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/75 hover:translate-x-[-2px] hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-y-1.5 right-0 w-1 rounded-full bg-sidebar-primary transition-opacity",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
                <item.icon
                  className={cn(
                    "size-4.5 shrink-0 transition-colors",
                    active ? "text-sidebar-primary" : "",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>


        <button
          type="button"
          onClick={async () => {
            await signOut();
            navigate({ to: "/", replace: true });
          }}
          className="mt-8 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60"
        >
          <LogOut className="size-4.5" />
          تسجيل الخروج
        </button>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="lg:pr-72">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur-xl lg:px-8">
          <button
            type="button"
            className="lg:hidden"
            aria-label="فتح القائمة"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <Logo className="size-10 shrink-0" />
          <div className="flex items-center gap-2 text-sm">
            <ClipboardList className="hidden size-4 text-primary sm:block" />
            <span className="font-semibold">{profile?.full_name ?? "—"}</span>
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
              {role ? ROLE_LABELS[role] : "بدون رتبة"}
            </span>
          </div>
          <div className="mr-auto">
            <ThemeToggle />
          </div>
        </header>
        <main key={pathname} className="page-enter px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

    </div>
  );
}
