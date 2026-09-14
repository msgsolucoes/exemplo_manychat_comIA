"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";

export function ThemeToggle() {
  useEffect(() => {
    const saved = window.localStorage.getItem("uaiflow-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const enabled = saved ? saved === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", enabled);
  }, []);

  function toggleTheme() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("uaiflow-theme", next ? "dark" : "light");
  }

  return (
    <button className="icon-button" type="button" onClick={toggleTheme} aria-label="Alternar tema" title="Alternar tema">
      <Moon className="dark:hidden" size={18} />
      <Sun className="hidden dark:block" size={18} />
    </button>
  );
}
