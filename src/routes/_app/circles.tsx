import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenText, GraduationCap, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCircles, useStaff } from "@/lib/queries";
import {
  CIRCLE_STATUS_LABELS,
  CIRCLE_TYPES,
  WEEK_DAYS,
} from "@/lib/constants";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/circles")({
  head: () => ({
    meta: [
      { title: "الحلقات — مقرأة حبل الله المتين" },
      { name: "description", content: "إدارة حلقات المقرأة وأوقاتها ومعلماتها ومشرفاتها." },
      { property: "og:title", content: "الحلقات — مقرأة حبل الله المتين" },
      { property: "og:description", content: "إدارة حلقات المقرأة وأوقاتها ومعلماتها." },
    ],
  }),
  component: CirclesPage,
});

type CircleForm = {
  id?: string;
  name: string;
  circle_type: string;
  level: string;
  time_text: string;
  days: string[];
  status: string;
  notes: string;
  teachers: string[];
  supervisors: string[];
};

const EMPTY: CircleForm = {
  name: "",
  circle_type: "قرآن كريم",
  level: "",
  time_text: "",
  days: [],
  status: "active",
  notes: "",
  teachers: [],
  supervisors: [],
};

function CirclesPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const circles = useCircles();
  const staff = useStaff();
  const [form, setForm] = useState<CircleForm | null>(null);

  const links = useQueryClient();
  void links;

  const save = useMutation({
    mutationFn: async (f: CircleForm) => {
      const payload = {
        name: f.name,
        circle_type: f.circle_type,
        level: f.level || null,
        time_text: f.time_text || null,
        days: f.days,
        status: f.status as "active",
        notes: f.notes || null,
      };
      let id = f.id;
      if (id) {
        const { error } = await supabase.from("circles").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("circles").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      await supabase.from("circle_teachers").delete().eq("circle_id", id!);
      await supabase.from("circle_supervisors").delete().eq("circle_id", id!);
      if (f.teachers.length)
        await supabase
          .from("circle_teachers")
          .insert(f.teachers.map((t) => ({ circle_id: id!, teacher_id: t })));
      if (f.supervisors.length)
        await supabase
          .from("circle_supervisors")
          .insert(f.supervisors.map((s) => ({ circle_id: id!, supervisor_id: s })));
    },
    onSuccess: () => {
      toast.success("تم الحفظ");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["circles"] });
      qc.invalidateQueries({ queryKey: ["circle-links"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("circles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف الحلقة");
      qc.invalidateQueries({ queryKey: ["circles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function openEdit(id: string) {
    const c = circles.data?.find((x) => x.id === id);
    if (!c) return;
    const [{ data: t }, { data: s }] = await Promise.all([
      supabase.from("circle_teachers").select("teacher_id").eq("circle_id", id),
      supabase.from("circle_supervisors").select("supervisor_id").eq("circle_id", id),
    ]);
    setForm({
      id: c.id,
      name: c.name,
      circle_type: c.circle_type,
      level: c.level ?? "",
      time_text: c.time_text ?? "",
      days: c.days ?? [],
      status: c.status,
      notes: c.notes ?? "",
      teachers: (t ?? []).map((x) => x.teacher_id),
      supervisors: (s ?? []).map((x) => x.supervisor_id),
    });
  }

  const stats = useQuery({
    queryKey: ["circle-stats"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const iso = since.toISOString().slice(0, 10);
      const [students, links, attendance] = await Promise.all([
        supabase.from("students").select("id, circle_id, status"),
        supabase.from("circle_teachers").select("circle_id, teacher_id"),
        supabase.from("student_attendance").select("circle_id, status").gte("session_date", iso),
      ]);
      return {
        students: students.data ?? [],
        links: links.data ?? [],
        attendance: attendance.data ?? [],
      };
    },
  });

  const staffNames = useMemo(
    () => new Map((staff.data ?? []).map((s) => [s.id, s.full_name])),
    [staff.data],
  );

  const circleStat = (id: string) => {
    const d = stats.data;
    const studentsCount = (d?.students ?? []).filter((s) => s.circle_id === id).length;
    const teacherNames = (d?.links ?? [])
      .filter((l) => l.circle_id === id)
      .map((l) => staffNames.get(l.teacher_id))
      .filter(Boolean) as string[];
    const att = (d?.attendance ?? []).filter((a) => a.circle_id === id);
    const rate = att.length
      ? Math.round((att.filter((a) => a.status === "present").length / att.length) * 100)
      : 0;
    return { studentsCount, teacherNames, rate };
  };

  const teachers = (staff.data ?? []).filter((s) => s.role === "teacher");
  const supervisors = (staff.data ?? []).filter((s) => s.role === "supervisor");

  return (
    <div>
      <PageHeader
        title="الحلقات"
        description="جميع حلقات المقرأة مع أوقاتها وأيامها والكادر المسؤول عنها."
        actions={
          isAdmin && (
            <Button onClick={() => setForm(EMPTY)}>
              <Plus className="size-4" /> حلقة جديدة
            </Button>
          )
        }
      />

      {circles.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {circles.data.map((c) => (
            <div key={c.id} className="card-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BookOpenText className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.circle_type}
                      {c.level ? ` — ${c.level}` : ""}
                    </p>
                  </div>
                </div>
                <StatusPill
                  label={CIRCLE_STATUS_LABELS[c.status] ?? c.status}
                  tone={c.status === "active" ? "success" : c.status === "paused" ? "warning" : "danger"}
                />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {c.time_text || "بدون وقت محدد"} · {c.days?.length ? c.days.join("، ") : "بدون أيام"}
              </p>
              {(() => {
                const st = circleStat(c.id);
                return (
                  <div className="mt-4 space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1">
                        <GraduationCap className="size-3.5" /> {st.studentsCount} طالبة
                      </span>
                      <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1">
                        <Users className="size-3.5 shrink-0" />
                        <span className="truncate">
                          {st.teacherNames.length ? st.teacherNames.join("، ") : "بدون معلمة"}
                        </span>
                      </span>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>نسبة الحضور (٣٠ يومًا)</span>
                        <span className="font-semibold text-foreground">{st.rate}%</span>
                      </div>
                      <Progress value={st.rate} className="h-2" />
                    </div>
                  </div>
                );
              })()}
              {c.notes && <p className="mt-3 text-xs text-muted-foreground">{c.notes}</p>}
              {isAdmin && (
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(c.id)}>
                    <Pencil className="size-3.5" /> تعديل
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("حذف الحلقة نهائيًا؟")) remove.mutate(c.id);
                    }}
                  >
                    <Trash2 className="size-3.5" /> حذف
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد حلقات بعد" description="أضيفي أول حلقة للبدء." />
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id ? "تعديل الحلقة" : "حلقة جديدة"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اسم الحلقة</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>النوع</Label>
                  <Select
                    value={form.circle_type}
                    onValueChange={(v) => setForm({ ...form, circle_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CIRCLE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                      {!CIRCLE_TYPES.includes(form.circle_type) && form.circle_type !== "أخرى" && (
                        <SelectItem value={form.circle_type}>{form.circle_type}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {(form.circle_type === "أخرى" || !CIRCLE_TYPES.includes(form.circle_type)) && (
                    <Input
                      placeholder="اكتبي نوع الحلقة (مثل: الفقه، الشمائل المحمدية)"
                      value={form.circle_type === "أخرى" ? "" : form.circle_type}
                      onChange={(e) =>
                        setForm({ ...form, circle_type: e.target.value || "أخرى" })
                      }
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>الحالة</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CIRCLE_STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>المستوى</Label>
                  <Input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>الوقت</Label>
                  <Input
                    value={form.time_text}
                    placeholder="٥:٠٠ - ٦:٣٠ مساءً"
                    onChange={(e) => setForm({ ...form, time_text: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>الأيام</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEK_DAYS.map((d) => {
                    const on = form.days.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            days: on ? form.days.filter((x) => x !== d) : [...form.days, d],
                          })
                        }
                        className={cn(
                          "rounded-full border border-border px-3 py-1 text-xs transition-colors",
                          on ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
              <PickList
                title="المعلمات"
                options={teachers}
                value={form.teachers}
                onChange={(v) => setForm({ ...form, teachers: v })}
              />
              <PickList
                title="المشرفات"
                options={supervisors}
                value={form.supervisors}
                onChange={(v) => setForm({ ...form, supervisors: v })}
              />
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => form && save.mutate(form)} disabled={save.isPending}>
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PickList({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { id: string; full_name: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">لا توجد حسابات بهذه الرتبة بعد.</p>
      ) : (
        <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
          {options.map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={value.includes(o.id)}
                onCheckedChange={(c) =>
                  onChange(c ? [...value, o.id] : value.filter((x) => x !== o.id))
                }
              />
              {o.full_name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
