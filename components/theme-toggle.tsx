"use client";

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  function toggleTheme() {
    const nextTheme = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextTheme);
    localStorage.setItem("taskmgr-theme", nextTheme ? "dark" : "light");
  }

  return (
    <Button
      variant="outline"
      size="icon-lg"
      className="rounded-full bg-background/60 shadow-sm backdrop-blur-xl"
      onClick={toggleTheme}
      aria-label="Alternar tema claro e escuro"
      title="Alternar tema"
    >
      <HugeiconsIcon icon={Moon02Icon} size={18} strokeWidth={1.8} className="dark:hidden" />
      <HugeiconsIcon icon={Sun03Icon} size={18} strokeWidth={1.8} className="hidden dark:block" />
    </Button>
  );
}
