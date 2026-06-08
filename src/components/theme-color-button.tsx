"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";

const STORAGE_KEY = "acheix-theme";
type AppTheme = "dark" | "light";

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  root.classList.toggle("theme-light", theme === "light");
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme === "light" ? "light" : "dark";
}

export function ThemeColorButton() {
  const [theme, setTheme] = useState<AppTheme>("dark");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  function toggleTheme() {
    const nextTheme: AppTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-yellow-300/50 hover:bg-yellow-300/10 hover:text-yellow-300"
      aria-label={theme === "dark" ? "Mudar para tema branco" : "Mudar para tema preto"}
      title={theme === "dark" ? "Tema branco" : "Tema preto"}
    >
      <Palette size={18} strokeWidth={2.5} />
    </button>
  );
}
