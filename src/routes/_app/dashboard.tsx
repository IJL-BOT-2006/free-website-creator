import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpenText, GraduationCap, Inbox, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { PageHeader, StatCard } from "@/components/page-parts";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { profile, role } = useAuth();

  const { data } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [students, circles, teachers, requests] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("circles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);
      return {
        students: students.count ?? 0,
        circles: circles.count ?? 0,
        teachers: teachers.count ?? 0,
        requests: requests.count ?? 0,
      };
    },
  });

  return (
    <div>
      <PageHeader
        title={`أهلًا ${profile?.full_name ?? ""}`}
        description={`لوحة تحكم ${role ? ROLE_LABELS[role] : ""} — نظرة سريعة على المقرأة اليوم.`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="الطالبات"
          value={data?.students ?? 0}
          icon={<GraduationCap className="size-5" />}
        />
        <StatCard
          label="الحلقات"
          value={data?.circles ?? 0}
          icon={<BookOpenText className="size-5" />}
          tone="success"
        />
        <StatCard
          label="الكادر"
          value={data?.teachers ?? 0}
          icon={<Users className="size-5" />}
          tone="warning"
        />
        <StatCard
          label="طلبات بانتظار المراجعة"
          value={data?.requests ?? 0}
          icon={<Inbox className="size-5" />}
          tone="danger"
        />
      </div>
    </div>
  );
}
