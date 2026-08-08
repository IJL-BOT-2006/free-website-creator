import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Inbox, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCircles, useStaff, useStudents } from "@/lib/queries";
import {
  REQUEST_STATUS_LABELS,
  REQUEST_TYPE_LABELS,
  formatDateTime,
} from "@/lib/constants";
import { EmptyState, PageHeader, StatusPill } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/_app/requests")({
  head: () => ({
    meta: [
      { title: "الطلبات — مقرأة حبل الله المتين" },
      { name: "description", content: "الطلبات الإدارية: فصل طالبة، نقل معلمة، وطلبات أخرى." },
      { property: "og:title", content: "الطلبات — مقرأة حبل الله المتين" },
      { property: "og:description", content: "الطلبات الإدارية ومتابعة قراراتها." },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const { profile, isAdmin } = useAuth();
  const qc = useQueryClient();
  const students = useStudents();
  const staff = useStaff();
  const circles = useCircles();
  const [open, setOpen] = useState(false);
  const [decide, setDecide] = useState<{ id: string; approve: boolean } | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [form, setForm] = useState({
    request_type: "expel_student",
    student_id: "",
    teacher_id: "",
    target_circle_id: "",
    reason: "",
  });

  const requests = useQuery({
    queryKey: ["requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const names = useMemo(() => {
    const s = new Map((students.data ?? []).map((x) => [x.id, x.full_name]));
    const t = new Map((staff.data ?? []).map((x) => [x.id, x.full_name]));
    const c = new Map((circles.data ?? []).map((x) => [x.id, x.name]));
    return {
      student: (id: string | null) => (id ? (s.get(id) ?? "—") : "—"),
      staff: (id: string | null) => (id ? (t.get(id) ?? "—") : "—"),
      circle: (id: string | null) => (id ? (c.get(id) ?? "—") : "—"),
    };
  }, [students.data, staff.data, circles.data]);

  const create = useMutation({
    mutationFn: async () => {
      if (!form.reason.trim()) throw new Error("اكتبي سبب الطلب");
      const { error } = await supabase.from("requests").insert({
        request_type: form.request_type,
        student_id: form.student_id || null,
        teacher_id: form.teacher_id || null,
        target_circle_id: form.target_circle_id || null,
        reason: form.reason,
        created_by: profile!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم إرسال الطلب");
      setOpen(false);
      setForm({ request_type: "expel_student", student_id: "", teacher_id: "", target_circle_id: "", reason: "" });
      qc.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decideMut = useMutation({
    mutationFn: async () => {
      const req = requests.data?.find((r) => r.id === decide!.id);
      const { error } = await supabase
        .from("requests")
        .update({
          status: decide!.approve ? "approved" : "rejected",
          decision_notes: decisionNotes || null,
          decided_at: new Date().toISOString(),
          decided_by: profile?.id ?? null,
        })
        .eq("id", decide!.id);
      if (error) throw error;
      if (decide!.approve && req) {
        if (req.request_type === "expel_student" && req.student_id) {
          await supabase.from("students").update({ status: "expelled" }).eq("id", req.student_id);
        }
        if (req.request_type === "transfer_teacher" && req.teacher_id && req.target_circle_id) {
          await supabase
            .from("circle_teachers")
            .insert({ circle_id: req.target_circle_id, teacher_id: req.teacher_id });
        }
      }
    },
    onSuccess: () => {
      toast.success("تم تنفيذ القرار");
      setDecide(null);
      setDecisionNotes("");
      qc.invalidateQueries({ queryKey: ["requests"] });
      qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="الطلبات"
        description="رفع الطلبات الإدارية ومتابعة قرارات الإدارة عليها."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> طلب جديد
          </Button>
        }
      />

      {requests.data?.length ? (
        <div className="space-y-3">
          {requests.data.map((r) => (
            <div key={r.id} className="card-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    #{r.request_no} · {REQUEST_TYPE_LABELS[r.request_type] ?? r.request_type}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.student_id ? `الطالبة: ${names.student(r.student_id)} · ` : ""}
                    {r.teacher_id ? `المعلمة: ${names.staff(r.teacher_id)} · ` : ""}
                    {r.target_circle_id ? `الحلقة المستهدفة: ${names.circle(r.target_circle_id)} · ` : ""}
                    {formatDateTime(r.created_at)}
                  </p>
                </div>
                <StatusPill
                  label={REQUEST_STATUS_LABELS[r.status] ?? r.status}
                  tone={
                    r.status === "approved"
                      ? "success"
                      : r.status === "rejected"
                        ? "danger"
                        : r.status === "pending"
                          ? "warning"
                          : "default"
                  }
                />
              </div>
              <p className="mt-3 text-sm">{r.reason}</p>
              {r.decision_notes && (
                <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  قرار الإدارة: {r.decision_notes}
                </p>
              )}
              {isAdmin && r.status === "pending" && (
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={() => setDecide({ id: r.id, approve: true })}>
                    <Check className="size-3.5" /> موافقة
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setDecide({ id: r.id, approve: false })}>
                    <X className="size-3.5" /> رفض
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد طلبات" description="ارفعي طلبًا جديدًا عند الحاجة." />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Inbox className="size-4 text-primary" /> طلب جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>نوع الطلب</Label>
              <Select
                value={form.request_type}
                onValueChange={(v) => setForm({ ...form, request_type: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(REQUEST_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.request_type === "expel_student" && (
              <div className="space-y-2">
                <Label>الطالبة</Label>
                <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختاري الطالبة" /></SelectTrigger>
                  <SelectContent>
                    {(students.data ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.request_type === "transfer_teacher" && (
              <>
                <div className="space-y-2">
                  <Label>المعلمة</Label>
                  <Select value={form.teacher_id} onValueChange={(v) => setForm({ ...form, teacher_id: v })}>
                    <SelectTrigger><SelectValue placeholder="اختاري المعلمة" /></SelectTrigger>
                    <SelectContent>
                      {(staff.data ?? [])
                        .filter((s) => s.role === "teacher")
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الحلقة المستهدفة</Label>
                  <Select
                    value={form.target_circle_id}
                    onValueChange={(v) => setForm({ ...form, target_circle_id: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="اختاري الحلقة" /></SelectTrigger>
                    <SelectContent>
                      {(circles.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>سبب الطلب</Label>
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>إرسال</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!decide} onOpenChange={(o) => !o && setDecide(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{decide?.approve ? "الموافقة على الطلب" : "رفض الطلب"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>ملاحظات القرار</Label>
            <Textarea value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={() => decideMut.mutate()} disabled={decideMut.isPending}>تأكيد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
