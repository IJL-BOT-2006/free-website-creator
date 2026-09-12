import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, Camera, KeyRound, ListChecks, Save, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { changeMyPassword } from "@/lib/admin.functions";
import { EDUCATION_LEVELS, ROLE_LABELS, formatDate } from "@/lib/constants";
import { CountrySelect, PhoneInput } from "@/components/phone-input";
import { PageHeader } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { signedUrl, uploadMedia } from "@/lib/upload";
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

type NotifyKey = "notify_announcements" | "notify_tasks" | "notify_requests";

const NOTIFY_FIELDS: { key: NotifyKey; label: string }[] = [
  { key: "notify_announcements", label: "إشعارات الإعلانات" },
  { key: "notify_tasks", label: "إشعارات المهام" },
  { key: "notify_requests", label: "إشعارات الطلبات" },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  manager: [
    "إدارة كل الحسابات والرتب",
    "إضافة وأرشفة الحلقات والطالبات",
    "اعتماد الطلبات ومتابعة كل التقارير",
    "الاطلاع على سجل النظام",
  ],
  deputy: [
    "إدارة الحسابات ما عدا رتبة المديرة",
    "إضافة وأرشفة الحلقات والطالبات",
    "اعتماد الطلبات ومتابعة التقارير",
    "الاطلاع على سجل النظام",
  ],
  supervisor: [
    "متابعة حلقاتها ومعلماتها",
    "تسجيل الحضور وتقارير الحفظ",
    "رفع الطلبات ومتابعة المهام",
  ],
  teacher: [
    "تسجيل حضورها وحضور طالباتها",
    "إدخال تقارير الحفظ لحلقتها",
    "رفع الطلبات ومتابعة مهامها",
  ],
};

function SettingsPage() {
  const { profile, role } = useAuth();
  const qc = useQueryClient();
  const changeFn = useServerFn(changeMyPassword);
  const [uploading, setUploading] = useState(false);
  const [password, setPassword] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    phone_code: "",
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
      phone_code: profile.phone_code ?? "",
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

  const avatar = useQuery({
    queryKey: ["my-avatar", profile?.avatar_url],
    enabled: Boolean(profile?.avatar_url),
    queryFn: async () => signedUrl(profile!.avatar_url!),
  });

  const myTasks = useQuery({
    queryKey: ["my-tasks", profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, due_date, status")
        .eq("assignee_id", profile!.id)
        .neq("status", "done")
        .order("due_date", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const saveNotify = useMutation({
    mutationFn: async ({ key, value }: { key: NotifyKey; value: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ [key]: value })
        .eq("id", profile!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  async function uploadAvatar(file: File) {
    if (!profile) return;
    setUploading(true);
    try {
      const path = await uploadMedia(file, "avatars");
      const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", profile.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("تم تحديث الصورة الشخصية");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="حسابي" description="بياناتك الشخصية الكاملة وإعدادات الأمان." />

      <div className="card-panel mb-6 flex flex-wrap items-center gap-4 p-6">
        <label className="group relative size-16 shrink-0 cursor-pointer overflow-hidden rounded-2xl bg-primary/10 text-primary">
          {avatar.data ? (
            <img src={avatar.data} alt="الصورة الشخصية" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center">
              <UserRound className="size-7" />
            </span>
          )}
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-foreground/60 py-1 text-background opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="size-3.5" />
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadAvatar(file);
              e.target.value = "";
            }}
          />
        </label>
        <div className="min-w-0">
          <p className="font-display text-lg font-bold">{profile?.full_name ?? "—"}</p>
          <p className="text-sm text-muted-foreground">
            {profile?.username_display ?? profile?.username ?? "—"} ·{" "}
            {role ? ROLE_LABELS[role] : "بدون رتبة"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {uploading ? "جارٍ رفع الصورة…" : "اضغطي على الصورة لتغييرها"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card-panel space-y-4 p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <BellRing className="size-4 text-primary" /> الإشعارات
          </h2>
          {NOTIFY_FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-3">
              <Label className="text-sm font-normal">{f.label}</Label>
              <Switch
                checked={Boolean(profile?.[f.key])}
                onCheckedChange={(v) => saveNotify.mutate({ key: f.key, value: v })}
              />
            </div>
          ))}
        </div>

        <div className="card-panel space-y-3 p-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-4 text-primary" /> صلاحياتي
          </h2>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {(role ? (ROLE_PERMISSIONS[role] ?? []) : []).map((p) => (
              <li key={p} className="flex gap-2">
                <span className="text-primary">•</span>
                {p}
              </li>
            ))}
            {!role && <li>لم تُسند لك رتبة بعد.</li>}
          </ul>
        </div>
      </div>

      <div className="card-panel my-6 p-6">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <ListChecks className="size-4 text-primary" /> المهام الموكلة إليّ
        </h2>
        {myTasks.data?.length ? (
          <ul className="divide-y divide-border text-sm">
            {myTasks.data.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="font-medium">{t.title}</span>
                <span className="text-xs text-muted-foreground">
                  {t.due_date ? formatDate(t.due_date) : "بدون موعد"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">لا توجد مهام موكلة إليك حاليًا.</p>
        )}
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
