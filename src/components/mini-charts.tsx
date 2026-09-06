import { cn } from "@/lib/utils";

export function ProgressRing({
  value,
  size = 62,
  stroke = 7,
  label,
  tone = "var(--page-accent)",
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  tone?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke="color-mix(in oklab, var(--color-muted-foreground) 22%, transparent)"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={tone}
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-display text-[0.8rem] font-bold">{pct}%</span>
        {label && <span className="mt-0.5 text-[0.55rem] text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}

export function Donut({
  segments,
  size = 108,
  thickness = 16,
  center,
  centerLabel,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  center?: string | number;
  centerLabel?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={thickness}
            stroke="color-mix(in oklab, var(--color-muted-foreground) 15%, transparent)"
          />
          {total > 0 &&
            segments.map((s) => {
              const len = (s.value / total) * c;
              const el = (
                <circle
                  key={s.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  strokeWidth={thickness}
                  stroke={s.color}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-lg font-bold">{center ?? total}</span>
          {centerLabel && <span className="text-[0.6rem] text-muted-foreground">{centerLabel}</span>}
        </div>
      </div>
      <ul className="min-w-0 space-y-1.5 text-xs">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="truncate text-muted-foreground">{s.label}</span>
            <span className="mr-auto font-semibold">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sparkline({
  points,
  className,
  height = 34,
  color = "var(--page-accent)",
}: {
  points: number[];
  className?: string;
  height?: number;
  color?: string;
}) {
  const w = 120;
  const max = Math.max(1, ...points);
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${height - (p / max) * (height - 4) - 2}`)
    .join(" ");
  const area = `${d} L ${w} ${height} L 0 ${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className={cn("w-full", className)} style={{ height }} preserveAspectRatio="none">
      <path d={area} fill={color} opacity={0.14} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function MiniBars({
  bars,
  height = 40,
  color = "var(--page-accent)",
}: {
  bars: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className="flex items-end gap-1.5" style={{ height: height + 16 }}>
      {bars.map((b) => (
        <div key={b.label} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${b.label}: ${b.value}`}>
          <div
            className="w-full rounded-t-md transition-all"
            style={{
              height: Math.max(3, (b.value / max) * height),
              background: `linear-gradient(180deg, ${color}, color-mix(in oklab, ${color} 35%, transparent))`,
            }}
          />
          <span className="truncate text-[0.55rem] text-muted-foreground">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

export function RateBadge({ value }: { value: number }) {
  const v = Math.round(value);
  const tone =
    v >= 85 ? "text-success bg-success/12" : v >= 60 ? "text-warning bg-warning/15" : "text-destructive bg-destructive/12";
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold", tone)}>
      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-current/20">
        <span className="block h-full rounded-full bg-current" style={{ width: `${v}%` }} />
      </span>
      {v}%
    </span>
  );
}
