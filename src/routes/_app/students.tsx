import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, History, Pencil, Search, ShieldCheck, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCircles, useStudents } from "@/lib/queries";
import {
  EDUCATION_LEVELS,
  STUDENT_STATUS_LABELS,
  WARNING_LEVEL_LABELS,
  formatDate,
  formatDateTime,
} from "@/lib/constants";
import { flagOf } from "@/lib/countries";
import { CountrySelect, PhoneInput } from "@/components/phone-input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  phone_code: string;
  phone: string;
  birth_date: string;
  education_level: string;
  country: string;
  origin_country: string;
  occupation: string;
  level: string;
  circle_id: string;
  status: string;
  notes: string;
};

const EMPTY: Form = {
  full_name: "",
  phone_code: "+963",
  phone: "",
  birth_date: "",
  education_level: "",
  country: "",
  origin_country: "",
  occupation: "",
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
  const [warnFilter, setWarnFilter] = useState("all");
  const [form, setForm] = useState<Form | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [eventFor, setEventFor] = useState<{ id: string; type: "warning" | "pledge" } | null>(null);
  const [eventReason, setEventReason] = useState("");

  const circleName = useMemo(() => {
    const m = new Map((circles.data ?? []).map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? (m.get(id) ?? "—") : "بدون حلقة");
  }, [circles.data]);

  const all = students.data ?? [];
  const rows = all.filter(
    (s) =>
      (!q || s.full_name.includes(q) || (s.phone ?? "").includes(q)) &&
      (circleFilter === "all" || s.circle_id === circleFilter) &&
      (statusFilter === "all" || s.status === statusFilter) &&
      (warnFilter === "all" ||
        (warnFilter === "3+" ? s.warnings_count >= 3 : s.warnings_count === Number(warnFilter))),
  );

  const save = useMutation({
    mutationFn: async (f: Form) => {
      if (!f.full_name.trim()) throw new Error("الاسم مطلوب");
      const payload = {
        full_name: f.full_name.trim(),
        phone: f.phone ? `${f.phone_code}${f.phone}` : null,
        phone_code: f.phone_code || null,
        birth_date: f.birth_date || null,
        education_level: f.education_level || null,
        country: f.country || null,
        origin_country: f.origin_country || null,
        occupation: f.occupation || null,
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
    mutationFn: async ({
      id,
      type,
      reason,
    }: {
      id: string;
      type: "warning" | "pledge";
      reason: string;
    }) => {
      const student = all.find((s) => s.id === id);
      if (!student) throw new Error("الطالبة غير موجودة");
      const level = type === "warning" ? String(Math.min(student.warnings_count + 1, 3)) : null;
      const { error } = await supabase.from("student_events").insert({
        student_id: id,
        event_type: type,
        reason,
        to_value: level,
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

  const nextLevel = eventFor
    ? Math.min((all.find((s) => s.id === eventFor.id)?.warnings_count ?? 0) + 1, 3)
    : 1;

  function openEdit(id: string) {
    const s = all.find((x) => x.id === id);
    if (!s) return;
    const code = s.phone_code ?? "+963";
    setForm({
      id: s.id,
      full_name: s.full_name,
      phone_code: code,
      phone: (s.phone ?? "").replace(code, ""),
      birth_date: s.birth_date ?? "",
      education_level: s.education_level ?? "",
      country: s.country ?? "",
      origin_country: s.origin_country ?? "",
      occupation: s.occupation ?? "",
      level: s.level ?? "",
      circle_id: s.circle_id ?? "none",
      status: s.status,
      notes: s.notes ?? "",
    });
  }

  return (
    <div>
      <PageHeader
        title="الطالبات"
        description="سجل الطالبات مع الحلقة والحالة والتنبيهات والتعهدات."
        actions={
          <Button onClick={() => setForm(EMPTY)}>
            <UserRoundPlus className="size-4" /> إضافة طالبة
          </Button>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي الطالبات" value={all.length} />
        <StatCard
          label="نشطات"
          value={all.filter((s) => s.status === "active").length}
          tone="success"
        />
        <StatCard
          label="في التنبيه"
          value={all.filter((s) => s.warnings_count > 0).length}
          tone="warning"
        />
        <StatCard
          label="تنبيه ثالث"
          value={all.filter((s) => s.warnings_count >= 3).length}
          tone="danger"
        />
      </div>

      <div className="card-panel mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="البحث باسم الطالبة أو رقم الهاتف"
            className="pr-9"
          />
        </div>
        <Select value={circleFilter} onValueChange={setCircleFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="الحلقة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحلقات</SelectItem>
            {(circles.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {Object.entries(STUDENT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={warnFilter} onValueChange={setWarnFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="مستوى التنبيه" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل مستويات التنبيه</SelectItem>
            <SelectItem value="0">بدون تنبيهات</SelectItem>
            <SelectItem value="1">التنبيه الأول</SelectItem>
            <SelectItem value="2">التنبيه الثاني</SelectItem>
            <SelectItem value="3+">التنبيه الثالث فأكثر</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rows.length ? (
        <div className="card-panel overflow-x-auto">
          <table className="table-elegant">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">الاسم</th>
                <th className="px-4 py-3 font-medium">الحلقة</th>
                <th className="px-4 py-3 font-medium">نسبة الحضور</th>
                <th className="px-4 py-3 font-medium">الإقامة</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3 font-medium">التنبيه</th>
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
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {s.phone ?? "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{circleName(s.circle_id)}</td>
                  <td className="px-4 py-3">
                    {rates.data?.[s.id] ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <RateBadge value={rates.data[s.id]!.rate} />
                        <span>
                          ({rates.data[s.id]!.present}/{rates.data[s.id]!.total})
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.country ? `${flagOf(s.country)} ${s.country}` : "—"}
                  </td>
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
                  <td className="px-4 py-3">
                    {s.warnings_count ? (
                      <StatusPill
                        label={
                          WARNING_LEVEL_LABELS[String(Math.min(s.warnings_count, 3))] ??
                          `${s.warnings_count} تنبيهات`
                        }
                        tone={s.warnings_count >= 3 ? "danger" : "warning"}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{s.pledges_count}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(s.enrolled_at)}
                  </td>
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
                        <ShieldCheck className="size-3.5" /> تعهد
                      </Button>
                      {isAdmin && (
                        <Button size="sm" variant="secondary" onClick={() => openEdit(s.id)}>
                          <Pencil className="size-3.5" /> تعديل
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
        <EmptyState title="لا توجد نتائج" description="جرّبي تعديل البحث أو التصفية." />
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form?.id ? "تعديل بيانات الطالبة" : "إضافة طالبة"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-5">
              <section className="space-y-4 rounded-2xl border border-border/70 bg-muted/30 p-4">
                <p className="text-xs font-semibold text-muted-foreground">البيانات الشخصية</p>
                <div className="space-y-2">
                  <Label>الاسم الثلاثي</Label>
                  <Input
                    value={form.full_name}
                    placeholder="الاسم واسم الأب واسم العائلة"
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>رقم الهاتف</Label>
                    <PhoneInput
                      code={form.phone_code}
                      phone={form.phone}
                      onCode={(v) => setForm({ ...form, phone_code: v })}
                      onPhone={(v) => setForm({ ...form, phone: v })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>تاريخ الميلاد</Label>
                    <Input
                      type="date"
                      value={form.birth_date}
                      onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>دولة الإقامة</Label>
                    <CountrySelect
                      value={form.country}
                      onChange={(v) => setForm({ ...form, country: v })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الدولة الأصلية</Label>
                    <CountrySelect
                      value={form.origin_country}
                      onChange={(v) => setForm({ ...form, origin_country: v })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>آخر مستوى دراسي</Label>
                    <Select
                      value={form.education_level}
                      onValueChange={(v) => setForm({ ...form, education_level: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختاري المستوى" />
                      </SelectTrigger>
                      <SelectContent>
                        {EDUCATION_LEVELS.map((l) => (
                          <SelectItem key={l} value={l}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>المهنة / العمل</Label>
                    <Input
                      value={form.occupation}
                      onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-border/70 p-4">
                <p className="text-xs font-semibold text-muted-foreground">البيانات الدراسية</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>الحلقة</Label>
                    <Select
                      value={form.circle_id}
                      onValueChange={(v) => setForm({ ...form, circle_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختاري الحلقة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون حلقة</SelectItem>
                        {(circles.data ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} — {c.circle_type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>المستوى في المقرأة</Label>
                    <Input
                      value={form.level}
                      onChange={(e) => setForm({ ...form, level: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الحالة</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm({ ...form, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STUDENT_STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ملاحظات</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </section>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => form && save.mutate(form)} disabled={save.isPending}>
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!eventFor} onOpenChange={(o) => !o && setEventFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {eventFor?.type === "warning"
                ? `تسجيل ${WARNING_LEVEL_LABELS[String(nextLevel)]}`
                : "تسجيل تعهد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>السبب</Label>
            <Textarea
              rows={4}
              value={eventReason}
              onChange={(e) => setEventReason(e.target.value)}
              placeholder="اذكري سبب التنبيه أو نص التعهد"
            />
          </div>
          <DialogFooter>
            <Button
              disabled={addEvent.isPending || !eventReason.trim()}
              onClick={() =>
                eventFor &&
                addEvent.mutate({ id: eventFor.id, type: eventFor.type, reason: eventReason })
              }
            >
              تسجيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyId} onOpenChange={(o) => !o && setHistoryId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>السجل الإداري</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(events.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">لا توجد أحداث مسجلة.</p>
            )}
            {(events.data ?? []).map((e) => (
              <div key={e.id} className="rounded-xl border border-border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {e.event_type === "warning"
                      ? (WARNING_LEVEL_LABELS[e.to_value ?? ""] ?? "تنبيه")
                      : e.event_type === "pledge"
                        ? "تعهد"
                        : e.event_type === "status_change"
                          ? "تغيير الحالة"
                          : `نقل: ${circleName(e.from_value)} ← ${circleName(e.to_value)}`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(e.created_at)}
                  </span>
                </div>
                {e.reason && <p className="mt-1 text-muted-foreground">{e.reason}</p>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
