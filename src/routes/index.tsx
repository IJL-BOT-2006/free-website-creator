import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { KeyRound, Loader2, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { bootstrapManager, loginDirectory, needsBootstrap } from "@/lib/admin.functions";
import { usernameToEmail } from "@/lib/constants";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — مقرأة حبل الله المتين" },
      {
        name: "description",
        content: "بوابة الدخول لنظام إدارة مقرأة حبل الله المتين للمعلمات والمشرفات والإدارة.",
      },
      { property: "og:title", content: "تسجيل الدخول — مقرأة حبل الله المتين" },
      {
        property: "og:description",
        content: "بوابة الدخول لنظام إدارة مقرأة حبل الله المتين.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const directoryFn = useServerFn(loginDirectory);
  const setupCheckFn = useServerFn(needsBootstrap);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  const setupQuery = useQuery({ queryKey: ["needs-setup"], queryFn: () => setupCheckFn({}) });
  const dirQuery = useQuery({
    queryKey: ["login-directory"],
    queryFn: () => directoryFn({}),
    enabled: setupQuery.data?.needsSetup === false,
  });

  return (
    <main className="surface-hero relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div aria-hidden className="pattern-arabesque pointer-events-none absolute inset-0 opacity-40" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-1/2 size-96 translate-x-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-sidebar-primary)_28%,transparent)_0%,transparent_70%)] blur-2xl"
      />
      <div className="absolute top-5 left-5 z-10">
        <ThemeToggle />
      </div>
      <div className="page-enter relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo className="mx-auto mb-4 size-28" glow />
          <h1 className="font-thuluth text-4xl font-bold leading-relaxed text-gradient-gold sm:text-5xl">
            مقرأة حبل الله المتين
          </h1>
          <div className="gold-divider mx-auto mt-3 w-32" />
          <p className="mt-3 text-sm text-muted-foreground">نظام الإدارة الداخلي</p>
        </div>

        <div className="glass-panel p-6 sm:p-7">
          {setupQuery.isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : setupQuery.data?.needsSetup ? (
            <SetupForm onDone={() => setupQuery.refetch()} />
          ) : (
            <SignInForm accounts={dirQuery.data ?? []} loadingAccounts={dirQuery.isLoading} />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          الحسابات تُنشأ من قبل الإدارة فقط — لا يوجد تسجيل ذاتي.
        </p>
      </div>
    </main>
  );
}


function SignInForm({
  accounts,
  loadingAccounts,
}: {
  accounts: { full_name: string; username: string; username_display?: string | null }[];
  loadingAccounts: boolean;
}) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username) {
      toast.error("اختاري اسمك من القائمة");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    setBusy(false);
    if (error) {
      toast.error("كلمة المرور غير صحيحة");
      return;
    }
    toast.success("مرحبًا بكِ");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <UserRound className="size-4 text-primary" /> الاسم
        </Label>
        <Select value={username} onValueChange={setUsername} disabled={loadingAccounts}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={loadingAccounts ? "جارٍ التحميل..." : "اختاري اسمكِ"} />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.username} value={a.username}>
                {a.username_display ?? a.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-2" htmlFor="password">
          <KeyRound className="size-4 text-primary" /> كلمة المرور
        </Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : "دخول"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        نسيتِ كلمة المرور؟ تواصلي مع المديرة لإعادة تعيينها.
      </p>
    </form>
  );
}

function SetupForm({ onDone }: { onDone: () => void }) {
  const bootstrap = useServerFn(bootstrapManager);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await bootstrap({ data: { fullName, username, password } });
      toast.success("تم إنشاء حساب المديرة، يمكنكِ الدخول الآن");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذر إنشاء الحساب");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
        <ShieldCheck className="size-4" /> الإعداد الأول: أنشئي حساب المديرة
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">الاسم الكامل</Label>
        <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="user">اسم الدخول (بالعربية)</Label>
        <Input
          id="user"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="مثال: المديرة"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pass">كلمة المرور</Label>
        <Input
          id="pass"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : "إنشاء الحساب"}
      </Button>
    </form>
  );
}
