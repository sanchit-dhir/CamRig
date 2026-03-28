"use client";

import { useMemo, useState, useCallback } from "react";
import { characters, animations } from "../../lib/assets";
import {
  Download,
  Grid3x3,
  LayoutList,
  Library,
  Search,
  Sparkles,
} from "lucide-react";
import { useStudioTheme } from "./StudioThemeContext";

interface RightPanelProps {
  onSelectCharacter: (url: string) => void;
  onSelectAnimation: (url: string) => void;
  panelWidth: number;
}

type Tab = "character" | "animations";

export default function RightPanel({
  onSelectCharacter,
  onSelectAnimation,
  panelWidth,
}: RightPanelProps) {
  const { theme } = useStudioTheme();
  const [activeTab, setActiveTab] = useState<Tab>("character");
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [selectedAnim, setSelectedAnim] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [libraryOpen, setLibraryOpen] = useState(true);

  const items = activeTab === "character" ? characters : animations;
  const selected = activeTab === "character" ? selectedChar : selectedAnim;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, query]);

  const handleSelect = (url: string) => {
    if (activeTab === "character") {
      setSelectedChar(url);
      onSelectCharacter(url);
    } else {
      setSelectedAnim(url);
      onSelectAnimation(url);
    }
  };

  const handleDownloadAsset = async (e: React.MouseEvent, url: string, name: string) => {
    e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${name}.fbx`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to download asset:", err);
    }
  };

  const onDragStart = useCallback(
    (e: React.DragEvent, url: string, name: string) => {
      const kind = activeTab === "character" ? "character" : "animation";
      const payload = JSON.stringify({ kind, url, name });
      e.dataTransfer.setData("application/camrig-asset", payload);
      e.dataTransfer.setData("text/plain", payload);
      e.dataTransfer.effectAllowed = "copy";
    },
    [activeTab],
  );

  const listGridClass =
    layout === "grid"
      ? "grid grid-cols-2 gap-2.5"
      : "flex flex-col gap-2";

  return (
    <aside
      className="relative z-20 flex h-full shrink-0 flex-col overflow-hidden border-l border-[var(--studio-border)] shadow-[var(--studio-shadow-elev)] studio-glass transition-[width,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ width: panelWidth }}
    >
      <div className="studio-noise-overlay pointer-events-none opacity-70" />

      <div className="relative flex h-full min-h-0 flex-col gap-0 p-3 pl-2">
        <div
          className={`mb-2 flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 studio-border-subtle transition-shadow duration-300 ${
            theme === "creative"
              ? "shadow-[0_0_24px_rgba(139,92,246,0.12)]"
              : ""
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--studio-accent)_16%,transparent)] text-[var(--studio-accent)]">
              <Library className="h-4 w-4" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--studio-text)]">
                Library
              </div>
              <div className="truncate text-[10px] text-[var(--studio-muted)]">
                Drag into the viewport
              </div>
            </div>
          </div>
          <Sparkles className="h-4 w-4 shrink-0 text-[var(--studio-highlight)] opacity-80" />
        </div>

        <div className="studio-border-subtle mb-2 flex gap-1 rounded-xl p-1 studio-glass">
          {(["character", "animations"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              data-studio-tip={tab === "character" ? "Character rigs" : "Clip library"}
              className={`relative flex-1 rounded-lg py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-accent)] ${
                activeTab === tab
                  ? "bg-[color-mix(in_oklab,var(--studio-accent)_22%,transparent)] text-[var(--studio-text)] shadow-[var(--studio-glow-soft)]"
                  : "text-[var(--studio-muted)] hover:bg-[color-mix(in_oklab,var(--studio-surface)_55%,transparent)] hover:text-[var(--studio-text)]"
              }`}
            >
              {tab === "character" ? "Rigs" : "Motion"}
            </button>
          ))}
        </div>

        <div className="studio-scrollbar sticky top-0 z-10 mb-2 space-y-2 bg-[color-mix(in_oklab,var(--studio-bg)_72%,transparent)] pb-1 pt-0.5 backdrop-blur-md">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--studio-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assets…"
              className="w-full rounded-xl border border-[var(--studio-border)] bg-[color-mix(in_oklab,var(--studio-surface)_40%,transparent)] py-2 pl-8 pr-3 text-xs text-[var(--studio-text)] placeholder:text-[color-mix(in_oklab,var(--studio-muted)_55%,transparent)] outline-none transition-[box-shadow,border-color] duration-300 focus:border-[var(--studio-border-strong)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--studio-highlight)_16%,transparent)]"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setLibraryOpen((o) => !o)}
              className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--studio-muted)] transition-colors hover:text-[var(--studio-text)]"
            >
              {libraryOpen ? "Hide browser" : "Show browser"}
            </button>
            <div className="flex rounded-lg border border-[var(--studio-border)] p-0.5">
              <button
                type="button"
                data-studio-tip="Grid view"
                onClick={() => setLayout("grid")}
                className={`rounded-md p-1.5 transition-all duration-300 ${
                  layout === "grid"
                    ? "bg-[color-mix(in_oklab,var(--studio-accent)_20%,transparent)] text-[var(--studio-text)] shadow-[var(--studio-glow-soft)]"
                    : "text-[var(--studio-muted)] hover:text-[var(--studio-text)]"
                }`}
              >
                <Grid3x3 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                data-studio-tip="List view"
                onClick={() => setLayout("list")}
                className={`rounded-md p-1.5 transition-all duration-300 ${
                  layout === "list"
                    ? "bg-[color-mix(in_oklab,var(--studio-accent)_20%,transparent)] text-[var(--studio-text)] shadow-[var(--studio-glow-soft)]"
                    : "text-[var(--studio-muted)] hover:text-[var(--studio-text)]"
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div
          className={`studio-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 ${listGridClass} transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            libraryOpen ? "opacity-100" : "pointer-events-none max-h-0 opacity-0"
          }`}
        >
          {filtered.map((item) => {
            const isActive = selected === item.url;
            return (
              <div
                key={item.name}
                role="button"
                tabIndex={0}
                draggable
                onDragStart={(e) => onDragStart(e, item.url, item.name)}
                onClick={() => handleSelect(item.url)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(item.url);
                  }
                }}
                className={`group/card relative cursor-grab overflow-hidden rounded-xl border text-left shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-[var(--studio-highlight)] ${
                  isActive
                    ? "border-[var(--studio-highlight)] bg-[color-mix(in_oklab,var(--studio-accent)_12%,transparent)] shadow-[0_0_26px_color-mix(in_oklab,var(--studio-highlight)_22%,transparent)]"
                    : "border-[var(--studio-border)] bg-[color-mix(in_oklab,var(--studio-surface)_35%,transparent)] hover:-translate-y-0.5 hover:border-[var(--studio-border-strong)] hover:shadow-[var(--studio-shadow-elev)]"
                } ${theme === "creative" && isActive ? "studio-neon-border" : ""} ${
                  layout === "list" ? "flex flex-row items-stretch gap-3" : "flex flex-col"
                }`}
              >
                <div
                  className={`relative overflow-hidden bg-black/30 ${
                    layout === "list" ? "aspect-square w-24 shrink-0" : "aspect-video w-full"
                  }`}
                >
                  <img
                    src={item.thumb}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className={`h-full w-full object-cover transition-[transform,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:scale-[1.04] group-hover/card:brightness-110 ${
                      isActive ? "scale-105" : ""
                    }`}
                  />
                  {isActive && (
                    <div className="pointer-events-none absolute inset-0 ring-2 ring-[color-mix(in_oklab,var(--studio-highlight)_55%,transparent)] ring-inset" />
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleDownloadAsset(e, item.url, item.name)}
                    data-studio-tip="Download FBX"
                    className="absolute right-1.5 top-1.5 rounded-lg border border-[var(--studio-border)] bg-[color-mix(in_oklab,var(--studio-bg)_55%,transparent)] p-1.5 text-[var(--studio-text)] opacity-0 shadow-md backdrop-blur-md transition-all duration-300 hover:border-[var(--studio-border-strong)] group-hover/card:opacity-100"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div
                  className={`flex min-w-0 flex-1 flex-col justify-center ${
                    layout === "list" ? "py-2 pr-2" : "px-2.5 pb-2 pt-1.5"
                  }`}
                >
                  <div
                    className={`truncate font-semibold uppercase tracking-[0.12em] text-[11px] ${
                      isActive ? "text-[var(--studio-text)]" : "text-[var(--studio-muted)]"
                    }`}
                  >
                    {item.name}
                  </div>
                  <div className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-[color-mix(in_oklab,var(--studio-muted)_75%,transparent)]">
                    {activeTab === "character" ? "Rig" : "Animation"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="studio-border-subtle relative z-10 mt-auto rounded-xl px-2.5 py-2 studio-glass">
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--studio-muted)]">
            Active
          </div>
          <div className="mt-1 truncate text-[11px] text-[var(--studio-accent)]">
            {activeTab === "character"
              ? (selectedChar?.split("/").pop() ?? "—")
              : (selectedAnim?.split("/").pop() ?? "—")}
          </div>
        </div>
      </div>
    </aside>
  );
}