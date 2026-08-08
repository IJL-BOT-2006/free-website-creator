import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AUDIENCE_LABELS, formatDateTime } from "@/lib/constants";
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

export const Route = createFileRoute("/_app/announcements")({
  head: () => ({
    meta: [
      { title: "الإعلانات — مقرأة حبل الله المتين" },
      { name: "description", content: "إعلانات الإدارة الموجهة للمعلمات والمشرفات." },
      { property: "og:title", content: "الإعلانات — مقرأة حبل الله المتين" },
      { property: "og:description", content: "إعلانات الإدارة الداخلية." },
    ],
  }),
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const { profile, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", audience: "all", published: true });

  const list = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcements").insert({
        title: form.title,
        content: form.content,
        audience: form.audience,
        published: form.published,
        created_by: profile?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم نشر الإعلان");
      setOpen(false);
      setForm({ title: "", content: "", audience: "all", published: true });
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="الإعلانات"
        description="إعلانات الإدارة الداخلية موجهة حسب الفئة."
        actions={
          isAdmin && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> إعلان جديد
            </Button>
          )
        }
      />

      {list.data?.length ? (
        <div className="space-y-3">
          {list.data.map((a) => (
            <div key={a.id} className="card-panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-semibold">
                  <BellRing className="size-4 text-primary" /> {a.title}
                </p>
                <StatusPill label={AUDIENCE_LABELS[a.audience] ?? a.audience} tone="info" />
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{a.content}</p>
              <p className="mt-3 text-xs text-muted-foreground">{formatDateTime(a.created_at)}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد إعلانات" />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>إعلان جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>العنوان</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>الفئة المستهدفة</Label>
              <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AUDIENCE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المحتوى</Label>
              <Textarea
                rows={5}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>نشر</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
