import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AUDIENCE_LABELS, RESOURCE_CATEGORIES } from "@/lib/constants";
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

export const Route = createFileRoute("/_app/resources")({
  head: () => ({
    meta: [
      { title: "المكتبة — مقرأة حبل الله المتين" },
      { name: "description", content: "مكتبة المناهج والنماذج والملفات الإدارية للمقرأة." },
      { property: "og:title", content: "المكتبة — مقرأة حبل الله المتين" },
      { property: "og:description", content: "مكتبة المناهج والنماذج والملفات." },
    ],
  }),
  component: ResourcesPage,
});

function ResourcesPage() {
  const { profile, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "منهج",
    url: "",
    audience: "all",
    notes: "",
  });

  const list = useQuery({
    queryKey: ["resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("resources").insert({
        name: form.name,
        category: form.category,
        url: form.url || null,
        audience: form.audience,
        notes: form.notes || null,
        created_by: profile?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تمت الإضافة");
      setOpen(false);
      setForm({ name: "", category: "منهج", url: "", audience: "all", notes: "" });
      qc.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="المكتبة"
        description="المناهج والنماذج والروابط والملفات الإدارية."
        actions={
          isAdmin && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> إضافة عنصر
            </Button>
          )
        }
      />

      {list.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.data.map((r) => (
            <div key={r.id} className="card-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="flex items-center gap-2 font-semibold">
                  <FolderOpen className="size-4 text-primary" /> {r.name}
                </p>
                <StatusPill label={r.category} tone="info" />
              </div>
              {r.notes && <p className="mt-2 text-sm text-muted-foreground">{r.notes}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                {AUDIENCE_LABELS[r.audience] ?? r.audience}
              </p>
              {r.url && (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                >
                  فتح الرابط
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="المكتبة فارغة" description="أضيفي المناهج والنماذج هنا." />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>عنصر جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>التصنيف</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RESOURCE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </div>
            <div className="space-y-2">
              <Label>الرابط</Label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
