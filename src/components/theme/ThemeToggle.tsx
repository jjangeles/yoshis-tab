"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200/80 bg-slate-100 px-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
