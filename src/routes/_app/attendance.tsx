import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Save } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCircles, useStaff, useStudents } from "@/lib/queries";
import { ATTENDANCE_LABELS } from "@/lib/constants";
import { EmptyState, PageHeader } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function AttendancePage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const circles = useCircles();
  const students = useStudents();
  const staff = useStaff();
  const [circleId, setCircleId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [teacherMarks, setTeacherMarks] = useState<Record<string, Status>>({});

  useEffect(() => {
    if (!circleId && circles.data?.length) setCircleId(circles.data[0]!.id);
  }, [circles.data, circleId]);

  const existing = useQuery({
    queryKey: ["attendance", circleId, date],
    enabled: !!circleId,
    queryFn: async () => {
      const [s, t, ct] = await Promise.all([
        supabase.from("student_attendance").select("*").eq("circle_id", circleId).eq("session_date", date),
        supabase.from("teacher_attendance").select("*").eq("circle_id", circleId).eq("session_date", date),
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
    setMarks(Object.fromEntries(existing.data.students.map((r) => [r.student_id, r.status as Status])));
    setTeacherMarks(
      Object.fromEntries(existing.data.teachers.map((r) => [r.teacher_id, r.status as Status])),
    );
  }, [existing.data]);

  const rows = (students.data ?? []).filter((s) => s.circle_id === circleId && s.status !== "expelled");
  const teacherRows = (staff.data ?? []).filter((s) =>
    (existing.data?.circleTeachers ?? []).includes(s.id),
  );

  const save = useMutation({
    mutationFn: async () => {
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
      const tRows = Object.entries(teacherMarks).map(([teacher_id, status]) => ({
        teacher_id,
        circle_id: circleId,
        session_date: date,
        status,
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
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="الحضور والغياب"
        description="اختاري الحلقة والتاريخ ثم سجّلي حضور الطالبات والمعلمات."
        actions={
          <Button onClick={() => save.mutate()} disabled={save.isPending || !circleId}>
            <Save className="size-4" /> حفظ التحضير
          </Button>
        }
      />

      <div className="card-panel mb-4 flex flex-wrap items-end gap-4 p-4">
        <div className="space-y-2">
          <Label>الحلقة</Label>
          <Select value={circleId} onValueChange={setCircleId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="اختاري الحلقة" /></SelectTrigger>
            <SelectContent>
              {(circles.data ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>التاريخ</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        </div>
      </div>

      {rows.length ? (
        <div className="card-panel divide-y divide-border">
          {rows.map((s) => (
            <Row
              key={s.id}
              name={s.full_name}
              value={marks[s.id]}
              onChange={(v) => setMarks({ ...marks, [s.id]: v })}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد طالبات في هذه الحلقة" description="أضيفي الطالبات من صفحة الطالبات." />
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
                onChange={(v) => setTeacherMarks({ ...teacherMarks, [t.id]: v })}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Row({
  name,
  value,
  onChange,
}: {
  name: string;
  value?: Status;
  onChange: (v: Status) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <span className="text-sm font-medium">{name}</span>
      <div className="flex gap-1">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={cn(
              "rounded-full border border-border px-3 py-1 text-xs transition-colors",
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
    </div>
  );
}
