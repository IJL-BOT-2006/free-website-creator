import logoPng from "@/assets/logo.png.asset.json";
import logoJpg from "@/assets/logo.jpg.asset.json";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  framed = false,
  glow = false,
}: {
  className?: string;
  /** Adds a soft circular plate behind the mark (useful over dark surfaces). */
  framed?: boolean;
  /** Adds a golden halo behind the mark. */
  glow?: boolean;
}) {
  const img = (
    <img
      src={logoPng.url}
      alt="شعار مقرأة حبل الله المتين"
      onError={(e) => {
        const el = e.currentTarget;
        if (el.src !== logoJpg.url) el.src = logoJpg.url;
      }}
      className={cn("size-full object-contain drop-shadow-sm", !framed && className)}
    />
  );

  if (!framed && !glow) return img;

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center",
        framed &&
          "rounded-full bg-[color-mix(in_oklab,var(--color-card)_92%,transparent)] p-1.5 ring-1 ring-[color-mix(in_oklab,var(--color-sidebar-primary)_45%,transparent)]",
        className,
      )}
    >
                  {glow && (
        <>
          <span
            aria-hidden
            className="absolute -inset-4 -z-10 animate-pulse rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-sidebar-primary)_85%,transparent)_0%,color-mix(in_oklab,var(--color-sidebar-primary)_35%,transparent)_45%,transparent_75%)] blur-2xl [animation-duration:3s]"
          />
          <span
            aria-hidden
            className="absolute -inset-1.5 -z-10 rounded-full ring-2 ring-[color-mix(in_oklab,var(--color-sidebar-primary)_65%,transparent)]"
          />
        </>
      )}

      {img}
    </span>
  );
}
