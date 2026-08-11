import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Save, UserRound } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { changeMyPassword } from "@/lib/admin.functions";
import { EDUCATION_LEVELS, ROLE_LABELS } from "@/lib/constants";
import { CountrySelect, PhoneInput } from "@/components/phone-input";
import { PageHeader } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "حسابي — مقرأة حبل الله المتين" },
      { name: "description", content: "بياناتك الشخصية الكاملة وتغيير كلمة المرور في نظام إدارة المقرأة." },
      { property: "og:title", content: "حسابي — مقرأة حبل الله المتين" },
      { property: "og:description", content: "بيانات الحساب الشخصي وكلمة المرور." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, role } = useAuth();
  const changeFn = useServerFn(changeMyPassword);
  const [password, setPassword] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    phone_code: "+963",
    phone: "",
    birth_date: "",
    education_level: "",
    occupation: "",
    origin_country: "",
    residence_country: "",
    notes: "",
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      phone_code: profile.phone_code ?? "+963",
      phone: profile.phone ?? "",
      birth_date: profile.birth_date ?? "",
      education_level: profile.education_level ?? "",
      occupation: profile.occupation ?? "",
      origin_country: profile.origin_country ?? "",
      residence_country: profile.residence_country ?? "",
      notes: profile.notes ?? "",
    });
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          phone_code: form.phone_code || null,
          phone: form.phone || null,
          birth_date: form.birth_date || null,
          education_level: form.education_level || null,
          occupation: form.occupation || null,
          origin_country: form.origin_country || null,
          residence_country: form.residence_country || null,
          notes: form.notes || null,
        })
        .eq("id", profile!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حفظ البيانات");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const change = useMutation({
    mutationFn: async () => changeFn({ data: { password } }),
    onSuccess: () => {
      toast.success("تم تغيير كلمة المرور");
      setPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl">
      <PageHeader title="حسابي" description="بياناتك الشخصية الكاملة وإعدادات الأمان." />

      <div className="card-panel mb-6 flex flex-wrap items-center gap-4 p-6">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <UserRound className="size-7" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg font-bold">{profile?.full_name ?? "—"}</p>
          <p className="text-sm text-muted-foreground">
            {profile?.username ?? "—"} · {role ? ROLE_LABELS[role] : "بدون رتبة"}
          </p>
        </div>
      </div>

      <div className="card-panel space-y-4 p-6">
        <h2 className="font-semibold">البيانات الشخصية</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>الاسم الكامل</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>تاريخ الميلاد</Label>
            <Input
              type="date"
              value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>رقم الهاتف</Label>
            <PhoneInput
              code={form.phone_code}
              phone={form.phone}
              onCode={(v) => setForm({ ...form, phone_code: v })}
              onPhone={(v) => setForm({ ...form, phone: v })}
            />
          </div>
          <div className="space-y-2">
            <Label>المستوى التعليمي</Label>
            <Select
              value={form.education_level}
              onValueChange={(v) => setForm({ ...form, education_level: v })}
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
            <Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>الدولة الأصلية</Label>
            <CountrySelect
              value={form.origin_country}
              onChange={(v) => setForm({ ...form, origin_country: v })}
            />
          </div>
          <div className="space-y-2">
            <Label>دولة الإقامة</Label>
            <CountrySelect
              value={form.residence_country}
              onChange={(v) => setForm({ ...form, residence_country: v })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>ملاحظات</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          <Save className="size-4" /> حفظ البيانات
        </Button>
      </div>

      <div className="card-panel mt-6 space-y-4 p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <KeyRound className="size-4 text-primary" /> تغيير كلمة المرور
        </h2>
        <div className="space-y-2 sm:max-w-sm">
          <Label>كلمة المرور الجديدة</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button onClick={() => change.mutate()} disabled={change.isPending || password.length < 6}>
          حفظ كلمة المرور
        </Button>
      </div>
    </div>
  );
}
