"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read persisted preference; fall back to dark
    const stored = localStorage.getItem("peroot-theme") as Theme | null;
    const resolved: Theme = stored === "light" ? "light" : "dark";

    queueMicrotask(() => {
      setTheme(resolved);
      applyTheme(resolved);
      setMounted(true);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem("peroot-theme", next);
      if (document.startViewTransition) {
        document.startViewTransition(() => applyTheme(next));
      } else {
        applyTheme(next);
      }
      return next;
    });
  }, []);

  // A fresh object here re-rendered every theme consumer on every render of
  // this provider, which sits at the root of the tree.
  const value = useMemo(
    () => ({ theme: mounted ? theme : ("dark" as Theme), toggleTheme }),
    [mounted, theme, toggleTheme],
  );

  // Render children immediately so SSR output matches the server-rendered html
  // (which has className="dark"). The useEffect above reconciles on the client.
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
}
