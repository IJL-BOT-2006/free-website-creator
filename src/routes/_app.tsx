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

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const items = NAV.filter((item) => !item.roles || (role && item.roles.includes(role)));

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-72 overflow-y-auto bg-sidebar px-4 py-6 text-sidebar-foreground transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        )}
      >
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <BookOpenText className="size-5" />
          </div>
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

        <nav className="space-y-1">
          {items.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4.5 shrink-0" />
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
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur lg:px-8">
          <button
            type="button"
            className="lg:hidden"
            aria-label="فتح القائمة"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2 text-sm">
            <ClipboardList className="size-4 text-primary" />
            <span className="font-semibold">{profile?.full_name ?? "—"}</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {role ? ROLE_LABELS[role] : "بدون رتبة"}
            </span>
          </div>
          <div className="mr-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
