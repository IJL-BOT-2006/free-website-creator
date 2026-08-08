import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FilePlus2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCircles, useStudents } from "@/lib/queries";
import { formatDate } from "@/lib/constants";
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

export const Route = createFileRoute("/_app/reports")({
  head: () => ({
    meta: [
      { title: "تقارير الحفظ — مقرأة حبل الله المتين" },
      { name: "description", content: "تقارير حفظ الطالبات اليومية واعتمادها من المشرفات." },
      { property: "og:title", content: "تقارير الحفظ — مقرأة حبل الله المتين" },
      { property: "og:description", content: "تقارير حفظ الطالبات واعتمادها." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { profile, isSupervisorPlus } = useAuth();
  const qc = useQueryClient();
  const circles = useCircles();
  const students = useStudents();
  const [open, setOpen] = useState(false);
  const [filterCircle, setFilterCircle] = useState("all");
  const [form, setForm] = useState({
    student_id: "",
    report_date: new Date().toISOString().slice(0, 10),
    curriculum: "",
    amount: "",
    evaluation: "ممتاز",
    notes: "",
  });

  const reports = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memorization_reports")
        .select("*")
        .order("report_date", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });

  const names = useMemo(() => {
    const s = new Map((students.data ?? []).map((x) => [x.id, x.full_name]));
    const c = new Map((circles.data ?? []).map((x) => [x.id, x.name]));
    return { student: (id: string) => s.get(id) ?? "—", circle: (id: string) => c.get(id) ?? "—" };
  }, [students.data, circles.data]);

  const create = useMutation({
    mutationFn: async () => {
      const student = students.data?.find((s) => s.id === form.student_id);
      if (!student?.circle_id) throw new Error("اختاري طالبة مسجلة في حلقة");
      const { error } = await supabase.from("memorization_reports").insert({
        student_id: form.student_id,
        circle_id: student.circle_id,
        teacher_id: profile?.id ?? null,
        report_date: form.report_date,
        curriculum: form.curriculum || null,
        amount: form.amount || null,
        evaluation: form.evaluation,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم إضافة التقرير");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("memorization_reports")
        .update({ approved: true, approved_at: new Date().toISOString(), approved_by: profile?.id ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم اعتماد التقرير");
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (reports.data ?? []).filter(
    (r) => filterCircle === "all" || r.circle_id === filterCircle,
  );

  return (
    <div>
      <PageHeader
        title="تقارير الحفظ"
        description="تقارير المعلمات اليومية عن حفظ الطالبات ومتابعة اعتمادها."
        actions={
          <Button onClick={() => setOpen(true)}>
            <FilePlus2 className="size-4" /> تقرير جديد
          </Button>
        }
      />

      <div className="card-panel mb-4 p-4">
        <Select value={filterCircle} onValueChange={setFilterCircle}>
          <SelectTrigger className="w-56"><SelectValue placeholder="الحلقة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحلقات</SelectItem>
            {(circles.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length ? (
        <div className="card-panel overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">الطالبة</th>
                <th className="px-4 py-3 font-medium">الحلقة</th>
                <th className="px-4 py-3 font-medium">التاريخ</th>
                <th className="px-4 py-3 font-medium">المقرر</th>
                <th className="px-4 py-3 font-medium">التقييم</th>
                <th className="px-4 py-3 font-medium">الاعتماد</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{names.student(r.student_id)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{names.circle(r.circle_id)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.report_date)}</td>
                  <td className="px-4 py-3">
                    {r.curriculum ?? "—"}
                    {r.amount ? ` · ${r.amount}` : ""}
                  </td>
                  <td className="px-4 py-3">{r.evaluation ?? "—"}</td>
                  <td className="px-4 py-3">
                    {r.approved ? (
                      <StatusPill label="معتمد" tone="success" />
                    ) : isSupervisorPlus ? (
                      <Button size="sm" variant="secondary" onClick={() => approve.mutate(r.id)}>
                        <CheckCircle2 className="size-3.5" /> اعتماد
                      </Button>
                    ) : (
                      <StatusPill label="بانتظار الاعتماد" tone="warning" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="لا توجد تقارير" description="أضيفي أول تقرير حفظ." />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>تقرير حفظ جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>التاريخ</Label>
                <Input
                  type="date"
                  value={form.report_date}
                  onChange={(e) => setForm({ ...form, report_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>التقييم</Label>
                <Select value={form.evaluation} onValueChange={(v) => setForm({ ...form, evaluation: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["ممتاز", "جيد جدًا", "جيد", "يحتاج مراجعة"].map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>المقرر</Label>
                <Input
                  value={form.curriculum}
                  placeholder="سورة البقرة"
                  onChange={(e) => setForm({ ...form, curriculum: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>المقدار</Label>
                <Input
                  value={form.amount}
                  placeholder="من آية ١ إلى ١٠"
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>حفظ التقرير</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
