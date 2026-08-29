import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";

type DashboardTheme = "light" | "dark";

type DashboardThemeValue = {
  theme: DashboardTheme;
  toggleTheme: () => void;
};

const STORAGE_KEY = "awexen-dashboard-theme";

function initialTheme(): DashboardTheme {
  if (typeof window === "undefined") return "light";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

const DashboardThemeContext = createContext<DashboardThemeValue>({
  theme: "light",
  toggleTheme: () => {},
});

export function DashboardThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<DashboardTheme>(initialTheme);
  const value = useMemo<DashboardThemeValue>(() => ({
    theme,
    toggleTheme: () => setTheme((current) => {
      const next = current === "light" ? "dark" : "light";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* Storage can be unavailable in private browsing. */
      }
      return next;
    }),
  }), [theme]);

  return <DashboardThemeContext.Provider value={value}>{children}</DashboardThemeContext.Provider>;
}

export function useDashboardTheme() {
  return useContext(DashboardThemeContext);
}

export function DashboardThemeToggle() {
  const { theme, toggleTheme } = useDashboardTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="dashboard-theme-toggle"
      aria-label={dark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
      title={dark ? "الوضع الفاتح" : "الوضع الداكن"}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
