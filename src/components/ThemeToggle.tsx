import React, { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { STORAGE_KEYS } from "@/config/app.config";

/**
 * A simple Dark/Light mode toggle button that:
 * 1. Reads the initial preference from `localStorage` (key: "theme") or the OS preference.
 * 2. Applies or removes the `dark` class on the document's `<html>` element.
 * 3. Persists the user's choice back to `localStorage` so that it survives reloads.
 */

const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(false);

  // Apply the theme on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME) as
      | "light"
      | "dark"
      | null;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
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

  const toggleTheme = (checked: boolean) => {
    setIsDark(checked);
    syncHtmlClass(checked);
    localStorage.setItem(STORAGE_KEYS.THEME, checked ? "dark" : "light");
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        checked={isDark}
        onCheckedChange={toggleTheme}
        aria-label="Toggle theme"
        className="data-[state=checked]:bg-yellow-500 data-[state=unchecked]:bg-slate-600"
      />
    </div>
  );
};

export default ThemeToggle;
