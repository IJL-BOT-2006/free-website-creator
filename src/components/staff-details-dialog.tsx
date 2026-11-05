import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCircles } from "@/lib/queries";
import { ACCOUNT_STATUS_LABELS, ROLE_LABELS, formatDate, type AppRole } from "@/lib/constants";
import { flagOf } from "@/lib/countries";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function ageOf(birth: string | null) {
  if (!birth) return null;
  const b = new Date(birth);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  return age;
}

function Item({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <div className={`rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 ${wide ? "sm:col-span-2" : ""}`}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-sm font-medium">{value && value.trim() ? value : "—"}</p>
    </div>
  );
}

export function StaffDetailsDialog({
  userId,
  open,
  onOpenChange,
}: {
  userId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const circles = useCircles(true);
  const detail = useQuery({
    queryKey: ["staff-detail", userId],
    enabled: open && !!userId,
    queryFn: async () => {
      const [p, r, l] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId!).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId!).limit(1).maybeSingle(),
        supabase.from("circle_teachers").select("circle_id").eq("teacher_id", userId!),
      ]);
      if (p.error) throw p.error;
      return {
        profile: p.data,
        role: (r.data?.role ?? null) as AppRole | null,
        circleIds: (l.data ?? []).map((x) => x.circle_id),
      };
    },
  });

  const p = detail.data?.profile;
  const nameById = new Map((circles.data ?? []).map((c) => [c.id, c.name]));
  const circleNames = (detail.data?.circleIds ?? []).map((id) => nameById.get(id) ?? "—").join("، ");
  const age = ageOf(p?.birth_date ?? null);
  const country = (c: string | null | undefined) => (c ? `${flagOf(c)} ${c}` : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>بيانات الحساب</DialogTitle>
        </DialogHeader>
        {detail.isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">جارٍ التحميل…</p>
        ) : !p ? (
          <p className="py-6 text-center text-sm text-muted-foreground">تعذر عرض بيانات هذا الحساب.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Item label="الاسم الكامل" value={p.full_name} />
            <Item label="اسم الدخول" value={p.username_display ?? p.full_name} />
            <Item label="الرتبة" value={detail.data?.role ? ROLE_LABELS[detail.data.role] : null} />
            <Item label="حالة الحساب" value={ACCOUNT_STATUS_LABELS[p.status] ?? p.status} />
            <Item label="الجوال" value={p.phone} />
            <Item
              label="تاريخ الميلاد"
              value={p.birth_date ? `${formatDate(p.birth_date)}${age != null ? ` (${age} سنة)` : ""}` : null}
            />
            <Item label="المستوى التعليمي والتخصص" value={p.education_level} />
            <Item label="المهنة" value={p.occupation} />
            <Item label="الدولة الأصلية" value={country(p.origin_country)} />
            <Item label="دولة الإقامة" value={country(p.residence_country)} />
            <Item label="الحلقات المكلّفة بها" value={circleNames} wide />
            <Item label="تاريخ إنشاء الحساب" value={formatDate(p.created_at)} wide />
            <Item label="ملاحظات" value={p.notes} wide />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
