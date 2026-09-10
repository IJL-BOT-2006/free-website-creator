import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, Download, FileText, Folder, FolderOpen, Grid2X2, Link2, List, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { openMedia, uploadMedia } from "@/lib/upload";
import { AUDIENCE_LABELS, RESOURCE_CATEGORIES, RESOURCE_FOLDERS } from "@/lib/constants";
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

export const Route = createFileRoute("/_app/resources")({
  head: () => ({
    meta: [
      { title: "المكتبة — مقرأة حبل الله المتين" },
      { name: "description", content: "مكتبة المناهج والنماذج والشهادات والملفات الإدارية مقسّمة إلى مجلدات." },
      { property: "og:title", content: "المكتبة — مقرأة حبل الله المتين" },
      { property: "og:description", content: "مكتبة المناهج والنماذج والملفات." },
    ],
  }),
  component: ResourcesPage,
});

const emptyForm = {
  name: "",
  category: "منهج",
  folder: RESOURCE_FOLDERS[0]!,
  url: "",
  audience: "all",
  notes: "",
};

function ResourcesPage() {
  const { profile, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [folder, setFolder] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [view, setView] = useState<"cards" | "table">("cards");

  const list = useQuery({
    queryKey: ["resources", showArchived],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("archived", showArchived)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const folders = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of RESOURCE_FOLDERS) counts.set(f, 0);
    for (const r of list.data ?? []) {
      const key = r.folder ?? "ملفات عامة";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()];
  }, [list.data]);

  const rows = useMemo(
    () => (list.data ?? []).filter((r) => !folder || (r.folder ?? "ملفات عامة") === folder),
    [list.data, folder],
  );

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("اسم العنصر مطلوب");
      const file_url = file ? await uploadMedia(file, "resources") : null;
      const { error } = await supabase.from("resources").insert({
        name: form.name,
        category: form.category,
        folder: form.folder,
        url: form.url || null,
        file_url,
        audience: form.audience,
        notes: form.notes || null,
        created_by: profile?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تمت الإضافة");
      setOpen(false);
      setForm(emptyForm);
      setFile(null);
      qc.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setArchived = useMutation({
    mutationFn: async (v: { id: string; archived: boolean }) => {
      const { error } = await supabase.from("resources").update({ archived: v.archived }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      toast.success(v.archived ? "تمت الأرشفة" : "تمت الاستعادة");
      qc.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="المكتبة"
        description="المناهج والنماذج والروابط والملفات الإدارية مرتّبة في مجلدات."
        actions={
          isAdmin && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> إضافة عنصر
            </Button>
          )
        }
      />

      <div className="mb-4 flex items-center justify-end gap-2">
        <Button variant="outline" size="icon" onClick={() => setView(view === "cards" ? "table" : "cards")} title={view === "cards" ? "عرض جدولي" : "عرض بطاقات"}>
          {view === "cards" ? <List className="size-4" /> : <Grid2X2 className="size-4" />}
        </Button>
        {isAdmin && (
          <Button variant={showArchived ? "secondary" : "outline"} onClick={() => setShowArchived((value) => !value)}>
            {showArchived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
            {showArchived ? "عرض النشطة" : "عرض المؤرشف"}
          </Button>
        )}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <button
          type="button"
          onClick={() => setFolder(null)}
          className={cn(
            "card-panel flex items-center gap-3 p-4 text-right transition-colors",
            !folder && "ring-1 ring-primary/50",
          )}
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FolderOpen className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold">كل الملفات</span>
            <span className="block text-xs text-muted-foreground">{list.data?.length ?? 0} عنصر</span>
          </span>
        </button>
        {folders.map(([name, count]) => (
          <button
            key={name}
            type="button"
            onClick={() => setFolder(name)}
            className={cn(
              "card-panel flex items-center gap-3 p-4 text-right transition-colors",
              folder === name && "ring-1 ring-primary/50",
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent/40 text-primary">
              <Folder className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{name}</span>
              <span className="block text-xs text-muted-foreground">{count} عنصر</span>
            </span>
          </button>
        ))}
      </div>

      {rows.length && view === "table" ? (
        <div className="card-panel overflow-x-auto">
          <table className="table-elegant">
            <thead><tr><th>الاسم</th><th>المجلد</th><th>التصنيف</th><th>الفئة</th><th>الإجراء</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{r.name}</td><td>{r.folder ?? "ملفات عامة"}</td><td>{r.category}</td>
                <td>{AUDIENCE_LABELS[r.audience] ?? r.audience}</td>
                <td><div className="flex gap-1">
                  {r.file_url && <Button size="sm" variant="ghost" onClick={() => openMedia(r.file_url!)}><Download className="size-3.5" /> فتح</Button>}
                  {isAdmin && <Button size="sm" variant="ghost" onClick={() => setArchived.mutate({ id: r.id, archived: !showArchived })}>{showArchived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}{showArchived ? "استعادة" : "أرشفة"}</Button>}
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : rows.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <div key={r.id} className="card-panel p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <p className="flex items-center gap-2 font-semibold">
                  <FileText className="size-4 shrink-0 text-primary" /> {r.name}
                </p>
                <StatusPill label={r.category} tone="info" />
              </div>
              {r.notes && <p className="mt-2 text-sm leading-6 text-muted-foreground">{r.notes}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                {r.folder ?? "ملفات عامة"} · {AUDIENCE_LABELS[r.audience] ?? r.audience}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {r.file_url && (
                  <Button size="sm" variant="secondary" onClick={() => openMedia(r.file_url!)}>
                    <Download className="size-3.5" /> فتح الملف
                  </Button>
                )}
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    <Link2 className="size-3.5" /> فتح الرابط
                  </a>
                )}
                {isAdmin && (
                  <Button size="sm" variant="ghost" className="mr-auto" onClick={() => setArchived.mutate({ id: r.id, archived: !showArchived })}>
                    {showArchived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
                    {showArchived ? "استعادة" : "أرشفة"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد عناصر" description="أضيفي المناهج والنماذج والملفات هنا." />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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
                <Label>المجلد</Label>
                <Select value={form.folder} onValueChange={(v) => setForm({ ...form, folder: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RESOURCE_FOLDERS.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              <div className="space-y-2">
                <Label>رابط خارجي (اختياري)</Label>
                <Input dir="ltr" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>رفع ملف من الجهاز</Label>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
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
