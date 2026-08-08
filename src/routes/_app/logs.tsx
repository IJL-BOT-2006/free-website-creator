import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/constants";
import { EmptyState, PageHeader } from "@/components/page-parts";

export const Route = createFileRoute("/_app/logs")({
  head: () => ({
    meta: [
      { title: "سجل النظام — مقرأة حبل الله المتين" },
      { name: "description", content: "سجل العمليات الإدارية داخل نظام إدارة المقرأة." },
      { property: "og:title", content: "سجل النظام — مقرأة حبل الله المتين" },
      { property: "og:description", content: "سجل العمليات الإدارية داخل النظام." },
    ],
  }),
  component: LogsPage,
});

function LogsPage() {
  const logs = useQuery({
    queryKey: ["system-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <PageHeader title="سجل النظام" description="آخر ٢٠٠ عملية مسجّلة في النظام." />
      {logs.data?.length ? (
        <div className="card-panel divide-y divide-border">
          {logs.data.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="font-medium">{l.action}</span>
              <span className="text-xs text-muted-foreground">
                {l.module} · {formatDateTime(l.created_at)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="لا يوجد سجل بعد" />
      )}
    </div>
  );
}
