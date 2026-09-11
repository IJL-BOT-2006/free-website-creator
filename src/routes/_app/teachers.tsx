import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useStaff, useTeacherAttendanceRates } from "@/lib/queries";
import { RateBadge } from "@/components/mini-charts";
import { changeAccountRole, createAccount, resetAccountPassword } from "@/lib/admin.functions";
import {
  ACCOUNT_STATUS_LABELS,
  EDUCATION_LEVELS,
  ROLE_LABELS,
  ROLE_ORDER,
  type AppRole,
} from "@/lib/constants";
import { CountrySelect, PhoneInput } from "@/components/phone-input";
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

export const Route = createFileRoute("/_app/teachers")({
  head: () => ({
    meta: [
      { title: "المعلمات والمشرفات — مقرأة حبل الله المتين" },
      { name: "description", content: "إدارة حسابات الكادر: المعلمات والمشرفات والرتب وكلمات المرور." },
      { property: "og:title", content: "المعلمات والمشرفات — مقرأة حبل الله المتين" },
      { property: "og:description", content: "إدارة حسابات الكادر والرتب." },
    ],
  }),
  component: TeachersPage,
});

function TeachersPage() {
  const { isAdmin, isManager } = useAuth();
  const qc = useQueryClient();
  const staff = useStaff();
  const rates = useTeacherAttendanceRates();
  const createFn = useServerFn(createAccount);
  const resetFn = useServerFn(resetAccountPassword);
  const roleFn = useServerFn(changeAccountRole);

  const [open, setOpen] = useState(false);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [newPass, setNewPass] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    password: "",
    phoneCode: "+966",
    phone: "",
    birthDate: "",
    educationLevel: "",
    occupation: "",
    originCountry: "",
    residenceCountry: "",
    role: "teacher" as AppRole,
    notes: "",
  });

  const emptyForm = {
    fullName: "",
    username: "",
    password: "",
    phoneCode: "+966",
    phone: "",
    birthDate: "",
    educationLevel: "",
    occupation: "",
    originCountry: "",
    residenceCountry: "",
    role: "teacher" as AppRole,
    notes: "",
  };

  const create = useMutation({
    mutationFn: async () =>
      createFn({ data: { ...form, phone: form.phone ? `${form.phoneCode}${form.phone}` : "" } }),
    onSuccess: () => {
      toast.success("تم إنشاء الحساب");
      setOpen(false);
      setForm(emptyForm);

      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = useMutation({
    mutationFn: async () => resetFn({ data: { userId: resetFor!, password: newPass } }),
    onSuccess: () => {
      toast.success("تم تحديث كلمة المرور");
      setResetFor(null);
      setNewPass("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeRole = useMutation({
    mutationFn: async (v: { userId: string; role: AppRole }) => roleFn({ data: v }),
    onSuccess: () => {
      toast.success("تم تغيير الرتبة");
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (v: { id: string; status: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status: v.status as "active" })
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث الحالة");
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="المعلمات والمشرفات"
        description="حسابات الكادر مع الرتب والحالة وإدارة كلمات المرور."
        actions={
          isAdmin && (
            <Button onClick={() => setOpen(true)}>
              <UserPlus className="size-4" /> حساب جديد
            </Button>
          )
        }
      />

      {staff.data?.length ? (
        <div className="card-panel overflow-x-auto">
          <table className="table-elegant w-full text-right text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">الاسم</th>
                <th className="px-4 py-3 font-medium">اسم الدخول</th>
                <th className="px-4 py-3 font-medium">نسبة الحضور</th>
                <th className="px-4 py-3 font-medium">الرتبة</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {staff.data.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground">{s.phone ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.username_display ?? s.full_name}
                  </td>
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
                  <td className="px-4 py-3">
                    {isManager ? (
                      <Select
                        value={s.role ?? "teacher"}
                        onValueChange={(v) => changeRole.mutate({ userId: s.id, role: v as AppRole })}
                      >
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLE_ORDER.map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <StatusPill label={s.role ? ROLE_LABELS[s.role] : "—"} tone="info" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill
                      label={ACCOUNT_STATUS_LABELS[s.status] ?? s.status}
                      tone={s.status === "active" ? "success" : "warning"}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin && (
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setResetFor(s.id)}>
                          <KeyRound className="size-3.5" /> كلمة المرور
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setStatus.mutate({
                              id: s.id,
                              status: s.status === "active" ? "suspended" : "active",
                            })
                          }
                        >
                          {s.status === "active" ? "إيقاف" : "تفعيل"}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="لا توجد حسابات" description="أنشئي أول حساب للكادر." />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" /> إنشاء حساب جديد
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>الاسم الكامل</Label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>اسم الدخول (بالعربية)</Label>
              <Input
                value={form.username}
                placeholder="مثال: أم عبدالله"
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>الجوال</Label>
              <PhoneInput
                code={form.phoneCode}
                phone={form.phone}
                onCode={(v) => setForm({ ...form, phoneCode: v })}
                onPhone={(v) => setForm({ ...form, phone: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>تاريخ الميلاد</Label>
              <Input
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>المستوى التعليمي</Label>
              <Select
                value={form.educationLevel}
                onValueChange={(v) => setForm({ ...form, educationLevel: v })}
              >
                <SelectTrigger><SelectValue placeholder="اختاري المستوى" /></SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المهنة</Label>
              <Input
                value={form.occupation}
                onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>الدولة الأصلية</Label>
              <CountrySelect
                value={form.originCountry}
                onChange={(v) => setForm({ ...form, originCountry: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>دولة الإقامة</Label>
              <CountrySelect
                value={form.residenceCountry}
                onChange={(v) => setForm({ ...form, residenceCountry: v })}
              />
            </div>

            <div className="space-y-2">
              <Label>الرتبة</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_ORDER.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>ملاحظات</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>إنشاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetFor} onOpenChange={(o) => !o && setResetFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إعادة تعيين كلمة المرور</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>كلمة المرور الجديدة</Label>
            <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={() => reset.mutate()} disabled={reset.isPending || newPass.length < 6}>
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
