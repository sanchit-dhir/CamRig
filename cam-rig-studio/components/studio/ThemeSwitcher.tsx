"use client";

import { Moon, Palette, SunMedium } from "lucide-react";
import { type StudioThemeId, useStudioTheme } from "./StudioThemeContext";

const THEMES: { id: StudioThemeId; label: string; sub: string; icon: typeof Moon }[] = [
  { id: "dark-ai", label: "Pro", sub: "Dark AI", icon: Moon },
  { id: "creative", label: "Neon", sub: "Creator", icon: Palette },
  { id: "minimal", label: "Clean", sub: "Light", icon: SunMedium },
];

export default function ThemeSwitcher() {
  const { theme, setTheme, isTransitioning } = useStudioTheme();

  return (
    <div
      className="studio-glass studio-border-subtle flex items-center gap-1 rounded-2xl p-1 shadow-[var(--studio-shadow-elev)]"
      role="group"
      aria-label="Theme"
    >
      {THEMES.map(({ id, label, sub, icon: Icon }) => {
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTheme(id)}
            title={`${sub} theme`}
            className={`relative flex min-w-[4.25rem] flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-[10px] font-semibold tracking-wide transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-accent)] ${
              active
                ? "studio-accent-glow text-[var(--studio-text)] shadow-[var(--studio-glow-soft)]"
                : "text-[var(--studio-muted)] hover:text-[var(--studio-text)] hover:brightness-110"
            } ${active && id === "creative" ? "studio-neon-border" : ""}`}
            style={{
              background: active ? "var(--studio-surface-elev)" : "transparent",
            }}
          >
            <Icon className="h-3.5 w-3.5 opacity-90" strokeWidth={2} />
            <span className="leading-none">{label}</span>
            {isTransitioning && active && (
              <span className="pointer-events-none absolute inset-0 rounded-xl bg-[var(--studio-accent)] opacity-[0.08] blur-[1px]" />
            )}
          </button>
        );
      })}
    </div>
  );
}