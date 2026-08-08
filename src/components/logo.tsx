import logo from "@/assets/logo.jpg.asset.json";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={logo.url}
      alt="شعار مقرأة حبل الله المتين"
      className={cn("rounded-xl bg-white object-contain", className)}
      loading="lazy"
    />
  );
}
