import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="relative mb-7">
      <div aria-hidden className="page-aura" />
      <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-start">
        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:order-first sm:shrink-0">
            {actions}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-extrabold tracking-tight sm:text-[1.7rem]">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="accent-divider relative z-10 mt-4" />
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const tones = {
    default: "accent-chip",
    success: "text-success bg-success/10 ring-1 ring-success/15",
    warning: "text-warning bg-warning/15 ring-1 ring-warning/20",
    danger: "text-destructive bg-destructive/10 ring-1 ring-destructive/15",
  } as const;
  return (
    <div className="card-luxe rise-in relative flex items-center gap-4 overflow-hidden p-4 transition-transform duration-200 hover:-translate-y-0.5">
      {icon && (
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl",
            tones[tone],
          )}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-bold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}



export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="card-panel px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

/** بطاقة رسم بياني مع حالة فارغة أنيقة بدل المحاور الفارغة. */
export function ChartCard({
  title,
  badge,
  icon,
  isEmpty,
  emptyText = "لا توجد بيانات كافية بعد لعرض الرسم.",
  className,
  children,
}: {
  title: string;
  badge?: ReactNode;
  icon?: ReactNode;
  isEmpty?: boolean;
  emptyText?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("card-panel p-4 sm:p-5", className)}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {icon}
        <p className="text-sm font-semibold">{title}</p>
        {badge && <span className="mr-auto">{badge}</span>}
      </div>
      {isEmpty ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border/70 px-4 text-center text-xs text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="h-56 sm:h-64">{children}</div>
      )}
    </div>
  );
}

export function StatusPill({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    default: "bg-secondary text-secondary-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning",
    danger: "bg-destructive/15 text-destructive",
    info: "bg-info/15 text-info",
  } as const;
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", tones[tone])}>{label}</span>
  );
}
