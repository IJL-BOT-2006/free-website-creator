import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Save, UserCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCircles, useStaff, useStudents } from "@/lib/queries";
import { ATTENDANCE_LABELS } from "@/lib/constants";
import { EmptyState, PageHeader, StatCard } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/attendance")({
  head: () => ({
    meta: [
      { title: "الحضور والغياب — مقرأة حبل الله المتين" },
      { name: "description", content: "تسجيل حضور الطالبات والمعلمات يوميًا حسب الحلقة." },
      { property: "og:title", content: "الحضور والغياب — مقرأة حبل الله المتين" },
      { property: "og:description", content: "تسجيل حضور الطالبات والمعلمات يوميًا." },
    ],
  }),
  component: AttendancePage,
});

const STATUSES = ["present", "excused", "unexcused"] as const;
type Status = (typeof STATUSES)[number];

const TONES: Record<Status, string> = {
  present: "var(--color-success)",
  excused: "var(--color-warning)",
  unexcused: "var(--color-destructive)",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function AttendancePage() {
  const { profile, isAdmin, isSupervisor } = useAuth();
  const qc = useQueryClient();
  const circles = useCircles();
  const students = useStudents();
  const staff = useStaff();
  const [circleId, setCircleId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [statusFilter, setStatusFilter] = useState("all");
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [teacherMarks, setTeacherMarks] = useState<Record<string, Status>>({});
  const [makeup, setMakeup] = useState("");

  useEffect(() => {
    if (!circleId && circles.data?.length) setCircleId(circles.data[0]!.id);
  }, [circles.data, circleId]);

  const existing = useQuery({
    queryKey: ["attendance", circleId, date],
    enabled: !!circleId,
    queryFn: async () => {
      const [s, t, ct] = await Promise.all([
        supabase
          .from("student_attendance")
          .select("*")
          .eq("circle_id", circleId)
          .eq("session_date", date),
        supabase
          .from("teacher_attendance")
          .select("*")
          .eq("circle_id", circleId)
          .eq("session_date", date),
        supabase.from("circle_teachers").select("teacher_id").eq("circle_id", circleId),
      ]);
      return {
        students: s.data ?? [],
        teachers: t.data ?? [],
        circleTeachers: (ct.data ?? []).map((x) => x.teacher_id),
      };
    },
  });

  useEffect(() => {
    if (!existing.data) return;
    setMarks(
      Object.fromEntries(existing.data.students.map((r) => [r.student_id, r.status as Status])),
    );
    setTeacherMarks(
      Object.fromEntries(existing.data.teachers.map((r) => [r.teacher_id, r.status as Status])),
    );
    const mine = existing.data.teachers.find((r) => r.teacher_id === profile?.id);
    setMakeup(mine?.makeup_date ?? "");
  }, [existing.data, profile?.id]);

  const history = useQuery({
    queryKey: ["attendance-history", circleId],
    enabled: !!circleId,
    queryFn: async () => {
      const since = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("student_attendance")
        .select("session_date, status")
        .eq("circle_id", circleId)
        .gte("session_date", since)
        .order("session_date");
      if (error) throw error;
      return data;
    },
  });

  const chart = useMemo(() => {
    const map = new Map<string, { day: string; حاضرة: number; بعذر: number; "بدون عذر": number }>();
    for (const r of history.data ?? []) {
      const key = r.session_date;
      const row = map.get(key) ?? { day: key.slice(5), حاضرة: 0, بعذر: 0, "بدون عذر": 0 };
      if (r.status === "present") row["حاضرة"] += 1;
      else if (r.status === "excused") row["بعذر"] += 1;
      else row["بدون عذر"] += 1;
      map.set(key, row);
    }
    return [...map.values()].slice(-14);
  }, [history.data]);

  const totals = useMemo(() => {
    const t = { present: 0, excused: 0, unexcused: 0 };
    for (const r of history.data ?? []) t[r.status as Status] += 1;
    return t;
  }, [history.data]);

  const totalAll = totals.present + totals.excused + totals.unexcused;
  const pie = STATUSES.map((s) => ({ name: ATTENDANCE_LABELS[s], value: totals[s], key: s }));

  const isMyCircle = (existing.data?.circleTeachers ?? []).includes(profile?.id ?? "");
  const canRecord = isAdmin || isSupervisor || isMyCircle;

  const rows = (students.data ?? [])
    .filter((s) => s.circle_id === circleId && s.status !== "expelled")
    .filter((s) => statusFilter === "all" || marks[s.id] === statusFilter);

  const teacherRows = (staff.data ?? []).filter((s) =>
    (existing.data?.circleTeachers ?? []).includes(s.id),
  );

  const save = useMutation({
    mutationFn: async () => {
      if (!canRecord) throw new Error("لا تملكين صلاحية التسجيل في هذه الحلقة");
      const studentRows = Object.entries(marks).map(([student_id, status]) => ({
        student_id,
        circle_id: circleId,
        session_date: date,
        status,
        recorded_by: profile?.id ?? null,
      }));
      if (studentRows.length) {
        const { error } = await supabase
          .from("student_attendance")
          .upsert(studentRows, { onConflict: "student_id,session_date" });
        if (error) throw error;
      }
      const editableTeachers =
        isAdmin || isSupervisor
          ? Object.entries(teacherMarks)
          : Object.entries(teacherMarks).filter(([id]) => id === profile?.id);
      const tRows = editableTeachers.map(([teacher_id, status]) => ({
        teacher_id,
        circle_id: circleId,
        session_date: date,
        status,
        makeup_date: teacher_id === profile?.id && makeup ? makeup : null,
        recorded_by: profile?.id ?? null,
      }));
      if (tRows.length) {
        const { error } = await supabase
          .from("teacher_attendance")
          .upsert(tRows, { onConflict: "teacher_id,circle_id,session_date" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("تم حفظ التحضير");
      qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["attendance-history"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="الحضور والغياب"
        description="اختاري الحلقة والتاريخ ثم سجّلي حضورك وحضور طالباتك."
        actions={
          <Button onClick={() => save.mutate()} disabled={save.isPending || !circleId || !canRecord}>
            <Save className="size-4" /> حفظ التحضير
          </Button>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="نسبة الحضور (٣٠ يومًا)"
          value={totalAll ? `${Math.round((totals.present / totalAll) * 100)}%` : "—"}
          tone="success"
        />
        <StatCard label="حضور مسجّل" value={totals.present} />
        <StatCard label="غياب بعذر" value={totals.excused} tone="warning" />
        <StatCard label="غياب بدون عذر" value={totals.unexcused} tone="danger" />
      </div>

      <div className="card-panel mb-4 flex flex-wrap items-end gap-4 p-4">
        <div className="space-y-2">
          <Label>الحلقة</Label>
          <Select value={circleId} onValueChange={setCircleId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="اختاري الحلقة" />
            </SelectTrigger>
            <SelectContent>
              {(circles.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>التاريخ</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="space-y-2">
          <Label>تصفية الحالة</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {ATTENDANCE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!canRecord && (
        <p className="mb-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          يمكنك الاطلاع فقط — التسجيل متاح لمعلمات هذه الحلقة والمشرفات والإدارة.
        </p>
      )}

      {profile && isMyCircle && (
        <div className="card-panel mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <UserCheck className="size-4 text-primary" /> حضوري اليوم
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusButtons
              value={teacherMarks[profile.id]}
              onChange={(v) => setTeacherMarks({ ...teacherMarks, [profile.id]: v })}
            />
            {teacherMarks[profile.id] && teacherMarks[profile.id] !== "present" && (
              <div className="flex items-center gap-2">
                <Label className="text-xs">تاريخ التعويض</Label>
                <Input
                  type="date"
                  value={makeup}
                  onChange={(e) => setMakeup(e.target.value)}
                  className="w-40"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {rows.length ? (
        <div className="card-panel divide-y divide-border">
          {rows.map((s) => (
            <Row
              key={s.id}
              name={s.full_name}
              value={marks[s.id]}
              disabled={!canRecord}
              onChange={(v) => setMarks({ ...marks, [s.id]: v })}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="لا توجد طالبات مطابقة"
          description="جرّبي تغيير التصفية أو أضيفي الطالبات من صفحة الطالبات."
        />
      )}

      {teacherRows.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 flex items-center gap-2 font-semibold">
            <CalendarCheck className="size-4 text-primary" /> حضور المعلمات
          </h2>
          <div className="card-panel divide-y divide-border">
            {teacherRows.map((t) => (
              <Row
                key={t.id}
                name={t.full_name}
                value={teacherMarks[t.id]}
                disabled={!(isAdmin || isSupervisor || t.id === profile?.id)}
                onChange={(v) => setTeacherMarks({ ...teacherMarks, [t.id]: v })}
              />
            ))}
          </div>
        </>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="card-panel p-5 lg:col-span-2">
          <p className="mb-4 text-sm font-semibold">حضور الطالبات آخر ١٤ جلسة</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="حاضرة" stackId="a" fill="var(--color-success)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="بعذر" stackId="a" fill="var(--color-warning)" />
                <Bar dataKey="بدون عذر" stackId="a" fill="var(--color-destructive)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-panel p-5">
          <p className="mb-4 text-sm font-semibold">توزيع الحالات</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85}>
                  {pie.map((p) => (
                    <Cell key={p.key} fill={TONES[p.key]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusButtons({
  value,
  onChange,
  disabled,
}: {
  value?: Status | undefined;
  onChange: (v: Status) => void;
  disabled?: boolean | undefined;
}) {
  return (
    <div className="flex gap-1">
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => onChange(s)}
          className={cn(
            "rounded-full border border-border px-3 py-1 text-xs transition-colors disabled:opacity-50",
            value === s
              ? s === "present"
                ? "bg-success text-white"
                : s === "excused"
                  ? "bg-warning text-white"
                  : "bg-destructive text-white"
              : "hover:bg-accent",
          )}
        >
          {ATTENDANCE_LABELS[s]}
        </button>
      ))}
    </div>
  );
}

function Row({
  name,
  value,
  onChange,
  disabled,
}: {
  name: string;
  value?: Status | undefined;
  onChange: (v: Status) => void;
  disabled?: boolean | undefined;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <span className="text-sm font-medium">{name}</span>
      <StatusButtons value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}
