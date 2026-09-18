import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function monthBounds(offset: number) {
  const base = new Date();
  const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const toIso = (x: Date) => x.toISOString().slice(0, 10);
  const label = `${d.getFullYear()}/${d.getMonth() + 1}/1`.replace(/\d+/g, (n) =>
    Number(n).toLocaleString("ar"),
  );
  return { start: toIso(start), end: toIso(end), label };
}

function Row({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${tone}`}>
        {value.toLocaleString("ar")} / {total.toLocaleString("ar")}
      </span>
    </div>
  );
}

function TrendLine({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null || previous == null) return null;
  const diff = current - previous;
  if (diff === 0)
    return <p className="text-xs text-muted-foreground">— بدون تغيير عن الشهر الماضي</p>;
  const up = diff > 0;
  return (
    <p className={`flex items-center gap-1 text-xs font-medium ${up ? "text-success" : "text-destructive"}`}>
      {up ? "🔼" : "🔽"} {Math.abs(diff).toLocaleString("ar")}٪ عن الشهر الماضي
    </p>
  );
}

export function StudentMonthlyDialog({
  studentId,
  open,
  onOpenChange,
}: {
  studentId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [offset, setOffset] = useState(0);
  const { start, end, label } = useMemo(() => monthBounds(offset), [offset]);
  const { start: pStart, end: pEnd } = useMemo(() => monthBounds(offset - 1), [offset]);

  const current = useQuery({
    queryKey: ["student-month-attendance", studentId, start],
    enabled: open && !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_attendance")
        .select("status")
        .eq("student_id", studentId!)
        .gte("session_date", start)
        .lte("session_date", end);
      if (error) throw error;
      return data;
    },
  });

  const previous = useQuery({
    queryKey: ["student-month-attendance", studentId, pStart],
    enabled: open && !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_attendance")
        .select("status")
        .eq("student_id", studentId!)
        .gte("session_date", pStart)
        .lte("session_date", pEnd);
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    const rows = current.data ?? [];
    const total = rows.length;
    const present = rows.filter((r) => r.status === "present").length;
    const excused = rows.filter((r) => r.status === "excused").length;
    const unexcused = rows.filter((r) => r.status === "unexcused").length;
    const rate = total ? Math.round((present / total) * 100) : null;
    return { total, present, excused, unexcused, rate };
  }, [current.data]);

  const prevRate = useMemo(() => {
    const rows = previous.data ?? [];
    const total = rows.length;
    const present = rows.filter((r) => r.status === "present").length;
    return total ? Math.round((present / total) * 100) : null;
  }, [previous.data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>سجل الحضور الشهري</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-2 py-2">
          <Button size="icon" variant="ghost" onClick={() => setOffset((o) => o + 1)}>
            <ChevronRight className="size-4" />
          </Button>
          <span className="text-sm font-medium" dir="ltr">
            {label}
          </span>
          <Button size="icon" variant="ghost" disabled={offset >= 0} onClick={() => setOffset((o) => Math.min(o - 1, 0))}>
            <ChevronLeft className="size-4" />
          </Button>
        </div>

        {stats.total === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">لا توجد سجلات حضور لهذا الشهر.</p>
        ) : (
          <div className="space-y-2">
            <Row label="حاضرة" value={stats.present} total={stats.total} tone="text-success" />
            <Row label="غياب بعذر" value={stats.excused} total={stats.total} tone="text-warning" />
            <Row label="غياب بدون عذر" value={stats.unexcused} total={stats.total} tone="text-destructive" />
            <TrendLine current={stats.rate} previous={prevRate} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function TeacherMonthlyDialog({
  teacherId,
  open,
  onOpenChange,
}: {
  teacherId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [offset, setOffset] = useState(0);
  const { start, end, label } = useMemo(() => monthBounds(offset), [offset]);
  const { start: pStart, end: pEnd } = useMemo(() => monthBounds(offset - 1), [offset]);

  const current = useQuery({
    queryKey: ["teacher-month-attendance", teacherId, start],
    enabled: open && !!teacherId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_attendance")
        .select("status")
        .eq("teacher_id", teacherId!)
        .gte("session_date", start)
        .lte("session_date", end);
      if (error) throw error;
      return data;
    },
  });

  const previous = useQuery({
    queryKey: ["teacher-month-attendance", teacherId, pStart],
    enabled: open && !!teacherId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_attendance")
        .select("status")
        .eq("teacher_id", teacherId!)
        .gte("session_date", pStart)
        .lte("session_date", pEnd);
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    const rows = current.data ?? [];
    const total = rows.length;
    const present = rows.filter((r) => r.status === "present").length;
    const absent = total - present;
    const rate = total ? Math.round((present / total) * 100) : null;
    return { total, present, absent, rate };
  }, [current.data]);

  const prevRate = useMemo(() => {
    const rows = previous.data ?? [];
    const total = rows.length;
    const present = rows.filter((r) => r.status === "present").length;
    return total ? Math.round((present / total) * 100) : null;
  }, [previous.data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>سجل الحضور الشهري</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-2 py-2">
          <Button size="icon" variant="ghost" onClick={() => setOffset((o) => o + 1)}>
            <ChevronRight className="size-4" />
          </Button>
          <span className="text-sm font-medium" dir="ltr">
            {label}
          </span>
          <Button size="icon" variant="ghost" disabled={offset >= 0} onClick={() => setOffset((o) => Math.min(o - 1, 0))}>
            <ChevronLeft className="size-4" />
          </Button>
        </div>

        {stats.total === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">لا توجد سجلات حضور لهذا الشهر.</p>
        ) : (
          <div className="space-y-2">
            <Row label="حضور" value={stats.present} total={stats.total} tone="text-success" />
            <Row label="غياب" value={stats.absent} total={stats.total} tone="text-destructive" />
            <TrendLine current={stats.rate} previous={prevRate} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
