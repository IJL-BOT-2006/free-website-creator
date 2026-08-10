import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BookOpenText, CalendarCheck, GraduationCap, Inbox, TrendingUp, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS, STUDENT_STATUS_LABELS } from "@/lib/constants";
import { PageHeader, StatCard } from "@/components/page-parts";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم — مقرأة حبل الله المتين" },
      { name: "description", content: "نظرة شاملة على الطالبات والحلقات والحضور والإنجاز." },
      { property: "og:title", content: "لوحة التحكم — مقرأة حبل الله المتين" },
      { property: "og:description", content: "إحصائيات المقرأة والرسوم البيانية." },
    ],
  }),
  component: DashboardPage,
});

const PIE_COLORS = ["var(--color-primary)", "var(--color-success)", "var(--color-warning)", "var(--color-destructive)"];

function lastDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

function DashboardPage() {
  const { profile, role } = useAuth();
  const days = lastDays(14);

  const { data } = useQuery({
    queryKey: ["dashboard-full"],
    queryFn: async () => {
      const [students, circles, staff, requests, attendance, reports] = await Promise.all([
        supabase.from("students").select("id, status, circle_id"),
        supabase.from("circles").select("id, name, status"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("requests").select("status"),
        supabase
          .from("student_attendance")
          .select("session_date, status")
          .gte("session_date", days[0]!),
        supabase
          .from("memorization_reports")
          .select("report_date, approved")
          .gte("report_date", days[0]!),
      ]);
      return {
        students: students.data ?? [],
        circles: circles.data ?? [],
        staffCount: staff.count ?? 0,
        requests: requests.data ?? [],
        attendance: attendance.data ?? [],
        reports: reports.data ?? [],
      };
    },
  });

  const students = data?.students ?? [];
  const attendance = data?.attendance ?? [];
  const present = attendance.filter((a) => a.status === "present").length;
  const attendanceRate = attendance.length ? Math.round((present / attendance.length) * 100) : 0;
  const pendingRequests = (data?.requests ?? []).filter((r) => r.status === "pending").length;

  const statusData = Object.entries(STUDENT_STATUS_LABELS).map(([key, label]) => ({
    name: label,
    value: students.filter((s) => s.status === key).length,
  }));

  const trend = days.map((d) => {
    const rows = attendance.filter((a) => a.session_date === d);
    const p = rows.filter((a) => a.status === "present").length;
    return {
      day: new Date(d).toLocaleDateString("ar", { day: "numeric", month: "short" }),
      نسبة: rows.length ? Math.round((p / rows.length) * 100) : 0,
      تقارير: (data?.reports ?? []).filter((r) => r.report_date === d).length,
    };
  });

  const perCircle = (data?.circles ?? []).map((c) => ({
    name: c.name,
    طالبات: students.filter((s) => s.circle_id === c.id).length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`أهلًا ${profile?.full_name ?? ""}`}
        description={`لوحة تحكم ${role ? ROLE_LABELS[role] : ""} — نظرة شاملة على المقرأة اليوم.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="الطالبات" value={students.length} icon={<GraduationCap className="size-5" />} />
        <StatCard
          label="الحلقات"
          value={(data?.circles ?? []).length}
          hint={`${(data?.circles ?? []).filter((c) => c.status === "active").length} حلقة نشطة`}
          icon={<BookOpenText className="size-5" />}
          tone="success"
        />
        <StatCard label="الكادر" value={data?.staffCount ?? 0} icon={<Users className="size-5" />} tone="warning" />
        <StatCard
          label="طلبات بانتظار المراجعة"
          value={pendingRequests}
          icon={<Inbox className="size-5" />}
          tone="danger"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-panel p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            <p className="font-semibold">نسبة الحضور خلال أسبوعين</p>
            <span className="mr-auto rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              المتوسط {attendanceRate}%
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="att" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} reversed />
                <YAxis tick={{ fontSize: 11 }} orientation="right" domain={[0, 100]} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="نسبة"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#att)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-panel p-5">
          <p className="mb-4 font-semibold">توزيع حالات الطالبات</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {statusData.map((s, i) => (
              <span key={s.name} className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                {s.name} ({s.value})
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-panel p-5">
          <p className="mb-4 font-semibold">عدد الطالبات في كل حلقة</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perCircle}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} reversed />
                <YAxis tick={{ fontSize: 11 }} orientation="right" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="طالبات" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-panel p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarCheck className="size-4 text-success" />
            <p className="font-semibold">تقارير الحفظ اليومية</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} reversed />
                <YAxis tick={{ fontSize: 11 }} orientation="right" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="تقارير" fill="var(--color-success)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
