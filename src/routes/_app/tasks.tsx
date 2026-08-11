import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  ListChecks,
  Paperclip,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useStaff } from "@/lib/queries";
import { openMedia, uploadMedia } from "@/lib/upload";
import {
  PRIORITY_LABELS,
  PRIORITY_TONES,
  TASK_STATUS_LABELS,
  formatDate,
} from "@/lib/constants";
import { EmptyState, PageHeader, StatCard, StatusPill } from "@/components/page-parts";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/tasks")({
  head: () => ({
    meta: [
      { title: "المهام — مقرأة حبل الله المتين" },
      { name: "description", content: "لوحة كانبان لتوزيع المهام الداخلية على الكادر ومتابعة إنجازها." },
      { property: "og:title", content: "المهام — مقرأة حبل الله المتين" },
      { property: "og:description", content: "لوحة كانبان لتوزيع المهام ومتابعة إنجازها." },
    ],
  }),
  component: TasksPage,
});

type Subtask = { title: string; done: boolean };

const COLUMNS: { key: string; label: string; icon: typeof CircleDashed; ring: string }[] = [
  { key: "in_progress", label: "قيد التنفيذ", icon: CircleDashed, ring: "border-warning/40" },
  { key: "done", label: "تم الإنجاز", icon: CheckCircle2, ring: "border-success/40" },
  { key: "not_done", label: "لم يتم", icon: XCircle, ring: "border-destructive/40" },
];

const emptyForm = {
  title: "",
  description: "",
  assignee_id: "",
  coordinator_id: "",
  due_date: "",
  priority: "normal",
  notes: "",
};

function parseSubtasks(value: unknown): Subtask[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s) => ({ title: String(s["title"] ?? ""), done: Boolean(s["done"]) }))
    .filter((s) => s.title);
}

function TasksPage() {
  const { profile, isAdmin } = useAuth();
  const qc = useQueryClient();
  const staff = useStaff();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  const tasks = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const nameOf = useMemo(() => {
    const m = new Map((staff.data ?? []).map((s) => [s.id, s.full_name]));
    return (id: string | null) => (id ? (m.get(id) ?? "—") : "—");
  }, [staff.data]);

  const rows = useMemo(() => {
    return (tasks.data ?? []).filter(
      (t) =>
        (filterAssignee === "all" || t.assignee_id === filterAssignee) &&
        (filterPriority === "all" || t.priority === filterPriority),
    );
  }, [tasks.data, filterAssignee, filterPriority]);

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.assignee_id) throw new Error("العنوان والمكلّفة مطلوبان");
      const attachment_url = file ? await uploadMedia(file, "tasks") : null;
      const { error } = await supabase.from("tasks").insert({
        title: form.title,
        description: form.description || null,
        assignee_id: form.assignee_id,
        coordinator_id: form.coordinator_id || null,
        due_date: form.due_date || null,
        priority: form.priority,
        notes: form.notes || null,
        attachment_url,
        subtasks: JSON.parse(JSON.stringify(subtasks)),
        created_by: profile!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم إنشاء المهمة");
      setOpen(false);
      setForm(emptyForm);
      setSubtasks([]);
      setFile(null);
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (v: { id: string; status?: string; subtasks?: Subtask[] }) => {
      const patch: { status?: "in_progress" | "done" | "not_done"; subtasks?: Subtask[] } = {};
      if (v.status) patch.status = v.status as "done";
      if (v.subtasks) patch.subtasks = v.subtasks;
      const { error } = await supabase
        .from("tasks")
        .update(JSON.parse(JSON.stringify(patch)))
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = { in_progress: 0, done: 0, not_done: 0 };
    for (const t of rows) c[t.status] = (c[t.status] ?? 0) + 1;
    return c;
  }, [rows]);

  return (
    <div>
      <PageHeader
        title="المهام"
        description="لوحة كانبان لمتابعة المهام الداخلية بحسب الحالة والأولوية."
        actions={
          isAdmin && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> مهمة جديدة
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="قيد التنفيذ" value={counts["in_progress"] ?? 0} icon={<CircleDashed className="size-5" />} tone="warning" />
        <StatCard label="تم الإنجاز" value={counts["done"] ?? 0} icon={<CheckCircle2 className="size-5" />} tone="success" />
        <StatCard label="لم يتم" value={counts["not_done"] ?? 0} icon={<XCircle className="size-5" />} tone="danger" />
      </div>

      <div className="card-panel mb-6 flex flex-wrap gap-3 p-4">
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-48"><SelectValue placeholder="المكلّفة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الكادر</SelectItem>
            {(staff.data ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-44"><SelectValue placeholder="الأولوية" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأولويات</SelectItem>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {COLUMNS.map((col) => {
            const items = rows.filter((t) => t.status === col.key);
            return (
              <section key={col.key} className={cn("rounded-2xl border-t-4 bg-muted/30 p-3", col.ring)}>
                <header className="mb-3 flex items-center justify-between px-2">
                  <p className="flex items-center gap-2 text-sm font-bold">
                    <col.icon className="size-4 text-primary" /> {col.label}
                  </p>
                  <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                    {items.length}
                  </span>
                </header>
                <div className="space-y-3">
                  {items.map((t) => {
                    const subs = parseSubtasks(t.subtasks);
                    const doneCount = subs.filter((s) => s.done).length;
                    const canEdit = isAdmin || t.assignee_id === profile?.id;
                    return (
                      <article
                        key={t.id}
                        className="card-panel space-y-3 p-4 transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold leading-6">
                            <span className="text-muted-foreground">#{t.task_no}</span> {t.title}
                          </p>
                          <StatusPill
                            label={PRIORITY_LABELS[t.priority] ?? t.priority}
                            tone={PRIORITY_TONES[t.priority] ?? "default"}
                          />
                        </div>
                        {t.description && (
                          <p className="text-xs leading-6 text-muted-foreground">{t.description}</p>
                        )}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>المكلّفة: {nameOf(t.assignee_id)}</span>
                          {t.coordinator_id && <span>المنسقة: {nameOf(t.coordinator_id)}</span>}
                          {t.due_date && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="size-3" /> {formatDate(t.due_date)}
                            </span>
                          )}
                        </div>

                        {subs.length > 0 && (
                          <div className="space-y-1.5 rounded-xl bg-muted/60 p-3">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>المهام الفرعية</span>
                              <span>{doneCount}/{subs.length}</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-background">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${(doneCount / subs.length) * 100}%` }}
                              />
                            </div>
                            {subs.map((s, i) => (
                              <label key={i} className="flex cursor-pointer items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  className="size-3.5 accent-[var(--primary)]"
                                  checked={s.done}
                                  disabled={!canEdit}
                                  onChange={() => {
                                    const next = subs.map((x, xi) =>
                                      xi === i ? { ...x, done: !x.done } : x,
                                    );
                                    update.mutate({ id: t.id, subtasks: next });
                                  }}
                                />
                                <span className={cn(s.done && "text-muted-foreground line-through")}>
                                  {s.title}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          {t.attachment_url && (
                            <Button size="sm" variant="ghost" onClick={() => openMedia(t.attachment_url!)}>
                              <Paperclip className="size-3.5" /> المرفق
                            </Button>
                          )}
                          {canEdit && (
                            <Select
                              value={t.status}
                              onValueChange={(v) => update.mutate({ id: t.id, status: v })}
                            >
                              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </article>
                    );
                  })}
                  {!items.length && (
                    <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                      لا توجد مهام هنا
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState title="لا توجد مهام" description="أنشئي مهمة جديدة لتوزيع العمل." />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="size-4 text-primary" /> مهمة جديدة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>العنوان</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>المكلّفة</Label>
                <Select value={form.assignee_id} onValueChange={(v) => setForm({ ...form, assignee_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختاري" /></SelectTrigger>
                  <SelectContent>
                    {(staff.data ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>المنسقة (اختياري)</Label>
                <Select
                  value={form.coordinator_id}
                  onValueChange={(v) => setForm({ ...form, coordinator_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="اختاري" /></SelectTrigger>
                  <SelectContent>
                    {(staff.data ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الأولوية</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>موعد التسليم</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>المهام الفرعية</Label>
              <div className="flex gap-2">
                <Input
                  value={subtaskDraft}
                  placeholder="أضيفي خطوة..."
                  onChange={(e) => setSubtaskDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && subtaskDraft.trim()) {
                      e.preventDefault();
                      setSubtasks([...subtasks, { title: subtaskDraft.trim(), done: false }]);
                      setSubtaskDraft("");
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (!subtaskDraft.trim()) return;
                    setSubtasks([...subtasks, { title: subtaskDraft.trim(), done: false }]);
                    setSubtaskDraft("");
                  }}
                >
                  إضافة
                </Button>
              </div>
              {subtasks.map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                  {s.title}
                  <button
                    type="button"
                    aria-label="حذف"
                    onClick={() => setSubtasks(subtasks.filter((_, xi) => xi !== i))}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>مرفق (اختياري)</Label>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
