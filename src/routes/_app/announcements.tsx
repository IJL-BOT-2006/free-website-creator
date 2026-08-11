import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { signedUrl, uploadMedia } from "@/lib/upload";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/announcements")({
  head: () => ({
    meta: [
      { title: "الإعلانات — مقرأة حبل الله المتين" },
      { name: "description", content: "إعلانات الإدارة الموجهة للمعلمات والمشرفات مع صور الغلاف والتثبيت." },
      { property: "og:title", content: "الإعلانات — مقرأة حبل الله المتين" },
      { property: "og:description", content: "إعلانات الإدارة الداخلية." },
    ],
  }),
  component: AnnouncementsPage,
});

const emptyForm = {
  title: "",
  content: "",
  audience: "all",
  pinned: false,
  publish_date: "",
};

function CoverImage({ path }: { path: string }) {
  const { data } = useQuery({
    queryKey: ["signed", path],
    queryFn: () => signedUrl(path),
    staleTime: 1000 * 60 * 30,
  });
  if (!data) return <div className="h-44 w-full animate-pulse bg-muted" />;
  return <img src={data} alt="غلاف الإعلان" loading="lazy" className="h-44 w-full object-cover" />;
}

function AnnouncementsPage() {
  const { profile, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [cover, setCover] = useState<File | null>(null);
  const [audience, setAudience] = useState("all");

  const list = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const rows = useMemo(
    () => (list.data ?? []).filter((a) => audience === "all" || a.audience === audience),
    [list.data, audience],
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.content.trim()) throw new Error("العنوان والمحتوى مطلوبان");
      const cover_url = cover ? await uploadMedia(cover, "announcements") : null;
      const { error } = await supabase.from("announcements").insert({
        title: form.title,
        content: form.content,
        audience: form.audience,
        pinned: form.pinned,
        publish_date: form.publish_date || null,
        cover_url,
        published: true,
        created_by: profile?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم نشر الإعلان");
      setOpen(false);
      setForm(emptyForm);
      setCover(null);
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePin = useMutation({
    mutationFn: async (v: { id: string; pinned: boolean }) => {
      const { error } = await supabase.from("announcements").update({ pinned: v.pinned }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف الإعلان");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="الإعلانات"
        description="إعلانات الإدارة الداخلية موجهة حسب الفئة، مع إمكانية التثبيت وإرفاق صورة."
        actions={
          isAdmin && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> إعلان جديد
            </Button>
          )
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {[["all", "الجميع"], ...Object.entries(AUDIENCE_LABELS).filter(([k]) => k !== "all")].map(
          ([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => setAudience(k)}
              className={cn(
                "rounded-full px-4 py-2 text-sm transition-colors",
                audience === k
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {v}
            </button>
          ),
        )}
      </div>

      {rows.length ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {rows.map((a) => (
            <article
              key={a.id}
              className={cn(
                "card-panel overflow-hidden text-right transition-shadow hover:shadow-md",
                a.pinned && "ring-1 ring-primary/40",
              )}
            >
              {a.cover_url && <CoverImage path={a.cover_url} />}
              <div className="space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                    {a.pinned ? (
                      <Pin className="size-4 text-primary" />
                    ) : (
                      <BellRing className="size-4 text-primary" />
                    )}
                    {a.title}
                  </h2>
                  <StatusPill label={AUDIENCE_LABELS[a.audience] ?? a.audience} tone="info" />
                </div>
                <p className="text-sm leading-7 whitespace-pre-wrap">{a.content}</p>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>{formatDateTime(a.publish_date ?? a.created_at)}</span>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => togglePin.mutate({ id: a.id, pinned: !a.pinned })}
                      >
                        {a.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                        {a.pinned ? "إلغاء التثبيت" : "تثبيت"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove.mutate(a.id)}>
                        <Trash2 className="size-3.5 text-destructive" /> حذف
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد إعلانات" description="أضيفي أول إعلان للكادر." />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>إعلان جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>العنوان</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
                <Label>تاريخ النشر</Label>
                <Input
                  type="date"
                  value={form.publish_date}
                  onChange={(e) => setForm({ ...form, publish_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>المحتوى</Label>
              <Textarea
                rows={5}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>صورة الغلاف (اختياري)</Label>
              <Input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-[var(--primary)]"
                checked={form.pinned}
                onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
              />
              تثبيت الإعلان في الأعلى
            </label>
          </div>
          <DialogFooter>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>نشر</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
