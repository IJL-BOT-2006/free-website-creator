import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { changeMyPassword } from "@/lib/admin.functions";
import { ROLE_LABELS } from "@/lib/constants";
import { PageHeader } from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "حسابي — مقرأة حبل الله المتين" },
      { name: "description", content: "بيانات الحساب الشخصي وتغيير كلمة المرور." },
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

  const change = useMutation({
    mutationFn: async () => changeFn({ data: { password } }),
    onSuccess: () => {
      toast.success("تم تغيير كلمة المرور");
      setPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-xl">
      <PageHeader title="حسابي" description="بياناتك الشخصية وكلمة المرور." />
      <div className="card-panel space-y-4 p-6">
        <div>
          <p className="text-xs text-muted-foreground">الاسم</p>
          <p className="font-semibold">{profile?.full_name ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">اسم الدخول</p>
          <p className="font-semibold">{profile?.username ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">الرتبة</p>
          <p className="font-semibold">{role ? ROLE_LABELS[role] : "—"}</p>
        </div>
      </div>

      <div className="card-panel mt-6 space-y-4 p-6">
        <h2 className="font-semibold">تغيير كلمة المرور</h2>
        <div className="space-y-2">
          <Label>كلمة المرور الجديدة</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button onClick={() => change.mutate()} disabled={change.isPending || password.length < 6}>
          حفظ
        </Button>
      </div>
    </div>
  );
}
