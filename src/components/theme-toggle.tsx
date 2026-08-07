import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

function apply(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("maqraah-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = (localStorage.getItem("maqraah-theme") as "light" | "dark" | null) ?? "light";
    setTheme(stored);
    apply(stored);
  }, []);

  return (
    <button
      type="button"
      aria-label="تبديل الوضع الليلي"
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        apply(next);
      }}
      className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
