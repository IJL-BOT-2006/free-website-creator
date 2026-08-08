import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, History, Plus, Search, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCircles, useStudents } from "@/lib/queries";
import { STUDENT_STATUS_LABELS, formatDate, formatDateTime } from "@/lib/constants";
import { EmptyState, PageHeader, StatusPill } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/students")({
  head: () => ({
    meta: [
      { title: "الطالبات — مقرأة حبل الله المتين" },
      { name: "description", content: "سجل الطالبات، الحلقات، التنبيهات والتعهدات والحالة." },
      { property: "og:title", content: "الطالبات — مقرأة حبل الله المتين" },
      { property: "og:description", content: "سجل الطالبات والتنبيهات والتعهدات." },
    ],
  }),
  component: StudentsPage,
});

type Form = {
  id?: string;
  full_name: string;
  phone: string;
  country: string;
  level: string;
  circle_id: string;
  status: string;
  notes: string;
};

const EMPTY: Form = {
  full_name: "",
  phone: "",
  country: "",
  level: "",
  circle_id: "none",
  status: "active",
  notes: "",
};

function StudentsPage() {
  const { isAdmin, profile } = useAuth();
  const qc = useQueryClient();
  const students = useStudents();
  const circles = useCircles();
  const [q, setQ] = useState("");
  const [circleFilter, setCircleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState<Form | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [eventFor, setEventFor] = useState<{ id: string; type: "warning" | "pledge" } | null>(null);
  const [eventReason, setEventReason] = useState("");

  const circleName = useMemo(() => {
    const m = new Map((circles.data ?? []).map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? (m.get(id) ?? "—") : "بدون حلقة");
  }, [circles.data]);

  const rows = (students.data ?? []).filter(
    (s) =>
      (!q || s.full_name.includes(q) || (s.phone ?? "").includes(q)) &&
      (circleFilter === "all" || s.circle_id === circleFilter) &&
      (statusFilter === "all" || s.status === statusFilter),
  );

  const save = useMutation({
    mutationFn: async (f: Form) => {
      const payload = {
        full_name: f.full_name,
        phone: f.phone || null,
        country: f.country || null,
        level: f.level || null,
        circle_id: f.circle_id === "none" ? null : f.circle_id,
        status: f.status as "active",
        notes: f.notes || null,
      };
      if (f.id) {
        const { error } = await supabase.from("students").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("students").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("تم الحفظ");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addEvent = useMutation({
    mutationFn: async ({ id, type, reason }: { id: string; type: "warning" | "pledge"; reason: string }) => {
      const student = students.data?.find((s) => s.id === id);
      if (!student) throw new Error("الطالبة غير موجودة");
      const { error } = await supabase.from("student_events").insert({
        student_id: id,
        event_type: type,
        reason,
        actor_id: profile?.id ?? null,
      });
      if (error) throw error;
      const patch =
        type === "warning"
          ? { warnings_count: student.warnings_count + 1, status: "warned" as const }
          : { pledges_count: student.pledges_count + 1 };
      await supabase.from("students").update(patch).eq("id", id);
    },
    onSuccess: () => {
      toast.success("تم التسجيل");
      setEventFor(null);
      setEventReason("");
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["student-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const events = useQuery({
    queryKey: ["student-events", historyId],
    enabled: !!historyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_events")
        .select("*")
        .eq("student_id", historyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <PageHeader
        title="الطالبات"
        description="سجل الطالبات مع الحلقة والحالة وعدد التنبيهات والتعهدات."
        actions={
          <Button onClick={() => setForm(EMPTY)}>
            <UserRoundPlus className="size-4" /> إضافة طالبة
          </Button>
        }
      />

      <div className="card-panel mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث بالاسم أو الجوال"
            className="pr-9"
          />
        </div>
        <Select value={circleFilter} onValueChange={setCircleFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="الحلقة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحلقات</SelectItem>
            {(circles.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {Object.entries(STUDENT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length ? (
        <div className="card-panel overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">الاسم</th>
                <th className="px-4 py-3 font-medium">الحلقة</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3 font-medium">تنبيهات</th>
                <th className="px-4 py-3 font-medium">تعهدات</th>
                <th className="px-4 py-3 font-medium">الانضمام</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground">{s.phone ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{circleName(s.circle_id)}</td>
                  <td className="px-4 py-3">
                    <StatusPill
                      label={STUDENT_STATUS_LABELS[s.status] ?? s.status}
                      tone={
                        s.status === "active"
                          ? "success"
                          : s.status === "warned"
                            ? "warning"
                            : s.status === "expelled"
                              ? "danger"
                              : "default"
                      }
                    />
                  </td>
                  <td className="px-4 py-3">{s.warnings_count}</td>
                  <td className="px-4 py-3">{s.pledges_count}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(s.enrolled_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setHistoryId(s.id)}>
                        <History className="size-3.5" /> السجل
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEventFor({ id: s.id, type: "warning" })}
                      >
                        <AlertTriangle className="size-3.5" /> تنبيه
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEventFor({ id: s.id, type: "pledge" })}
                      >
                        <Plus className="size-3.5" /> تعهد
                      </Button>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setForm({
                              id: s.id,
                              full_name: s.full_name,
                              phone: s.phone ?? "",
                              country: s.country ?? "",
                              level: s.level ?? "",
                              circle_id: s.circle_id ?? "none",
                              status: s.status,
                              notes: s.notes ?? "",
                            })
                          }
                        >
                          تعديل
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="لا توجد طالبات مطابقة" description="جرّبي تغيير عوامل التصفية أو أضيفي طالبة." />
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id ? "تعديل بيانات الطالبة" : "طالبة جديدة"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>الاسم الكامل</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>الجوال</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>الدولة</Label>
                <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>المستوى</Label>
                <Input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STUDENT_STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>الحلقة</Label>
                <Select value={form.circle_id} onValueChange={(v) => setForm({ ...form, circle_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون حلقة</SelectItem>
                    {(circles.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>ملاحظات</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => form && save.mutate(form)} disabled={save.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!eventFor} onOpenChange={(o) => !o && setEventFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{eventFor?.type === "warning" ? "تسجيل تنبيه" : "تسجيل تعهد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>السبب</Label>
            <Textarea value={eventReason} onChange={(e) => setEventReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              disabled={addEvent.isPending}
              onClick={() =>
                eventFor && addEvent.mutate({ id: eventFor.id, type: eventFor.type, reason: eventReason })
              }
            >
              تسجيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyId} onOpenChange={(o) => !o && setHistoryId(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>السجل الإداري للطالبة</DialogTitle>
          </DialogHeader>
          {events.data?.length ? (
            <ul className="space-y-3">
              {events.data.map((e) => (
                <li key={e.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">
                      {e.event_type === "warning"
                        ? "تنبيه"
                        : e.event_type === "pledge"
                          ? "تعهد"
                          : e.event_type}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(e.created_at)}</span>
                  </div>
                  {e.reason && <p className="mt-1 text-muted-foreground">{e.reason}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">لا يوجد سجل بعد.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
