import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * A simple Dark/Light mode toggle button that:
 * 1. Reads the initial preference from `localStorage` (key: "theme") or the OS preference.
 * 2. Applies or removes the `dark` class on the document's `<html>` element.
 * 3. Persists the user's choice back to `localStorage` so that it survives reloads.
 */
const STORAGE_KEY = "theme" as const;

const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(false);

  // Apply the theme on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = saved ? saved === "dark" : prefersDark;
    setIsDark(shouldUseDark);
    syncHtmlClass(shouldUseDark);
  }, []);

  /**
   * Adds or removes the `dark` class from the root html element.
   */
  const syncHtmlClass = (dark: boolean) => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    syncHtmlClass(next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className="rounded-full border border-border hover:bg-accent hover:text-accent-foreground"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
};

export default ThemeToggle;
