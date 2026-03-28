"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type StudioThemeId = "dark-ai" | "creative" | "minimal";

type StudioThemeContextValue = {
  theme: StudioThemeId;
  setTheme: (t: StudioThemeId) => void;
  isTransitioning: boolean;
};

const StudioThemeContext = createContext<StudioThemeContextValue | null>(null);

const STORAGE_KEY = "camrig-studio-theme";

export function StudioThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<StudioThemeId>("dark-ai");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as StudioThemeId | null;
      if (saved === "dark-ai" || saved === "creative" || saved === "minimal") {
        setThemeState(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setTheme = useCallback((next: StudioThemeId) => {
    setIsTransitioning(true);
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
      transitionTimerRef.current = null;
    }, 520);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, isTransitioning }),
    [theme, setTheme, isTransitioning],
  );

  return (
      <StudioThemeContext.Provider value={value}>
        <div
          className="studio-theme-root h-full min-h-0 w-full min-w-0 flex flex-col [--ease-premium:cubic-bezier(0.22,1,0.36,1)]"
          data-studio-theme={theme}
          data-studio-transition={isTransitioning ? "1" : "0"}
        >
          <div
            className="pointer-events-none fixed inset-0 z-[5000] opacity-0 transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] data-[on]:opacity-100"
            data-on={isTransitioning ? true : undefined}
            aria-hidden
            style={{
              background:
                theme === "creative"
                  ? "radial-gradient(circle at 50% 50%, rgba(139,92,246,0.12), transparent 55%)"
                  : theme === "minimal"
                    ? "radial-gradient(circle at 50% 50%, rgba(37,99,235,0.06), transparent 50%)"
                    : "radial-gradient(circle at 50% 50%, rgba(34,211,238,0.08), transparent 50%)",
            }}
          />
          {children}
        </div>
      </StudioThemeContext.Provider>
  );
}

export function useStudioTheme() {
  const ctx = useContext(StudioThemeContext);
  if (!ctx) {
    throw new Error("useStudioTheme must be used within StudioThemeProvider");
  }
  return ctx;
}