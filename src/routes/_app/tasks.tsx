import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListChecks, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useStaff } from "@/lib/queries";
import { TASK_STATUS_LABELS, formatDate } from "@/lib/constants";
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

export const Route = createFileRoute("/_app/tasks")({
  head: () => ({
    meta: [
      { title: "المهام — مقرأة حبل الله المتين" },
      { name: "description", content: "توزيع المهام الداخلية على الكادر ومتابعة إنجازها." },
      { property: "og:title", content: "المهام — مقرأة حبل الله المتين" },
      { property: "og:description", content: "توزيع المهام ومتابعة إنجازها." },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  const { profile, isAdmin } = useAuth();
  const qc = useQueryClient();
  const staff = useStaff();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assignee_id: "", due_date: "" });

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
    return (id: string) => m.get(id) ?? "—";
  }, [staff.data]);

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title || !form.assignee_id) throw new Error("العنوان والمكلّفة مطلوبان");
      const { error } = await supabase.from("tasks").insert({
        title: form.title,
        description: form.description || null,
        assignee_id: form.assignee_id,
        due_date: form.due_date || null,
        created_by: profile!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم إنشاء المهمة");
      setOpen(false);
      setForm({ title: "", description: "", assignee_id: "", due_date: "" });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (v: { id: string; status: string }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: v.status as "done" })
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث المهمة");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="المهام"
        description="المهام الداخلية الموكلة للكادر مع حالتها وموعد التسليم."
        actions={
          isAdmin && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> مهمة جديدة
            </Button>
          )
        }
      />

      {tasks.data?.length ? (
        <div className="space-y-3">
          {tasks.data.map((t) => (
            <div key={t.id} className="card-panel flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-semibold">
                  #{t.task_no} · {t.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  المكلّفة: {nameOf(t.assignee_id)} · التسليم: {formatDate(t.due_date)}
                </p>
                {t.description && <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <StatusPill
                  label={TASK_STATUS_LABELS[t.status] ?? t.status}
                  tone={t.status === "done" ? "success" : t.status === "not_done" ? "danger" : "warning"}
                />
                {(isAdmin || t.assignee_id === profile?.id) && (
                  <Select value={t.status} onValueChange={(v) => update.mutate({ id: t.id, status: v })}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد مهام" description="أنشئي مهمة جديدة لتوزيع العمل." />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
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
          </div>
          <DialogFooter>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
