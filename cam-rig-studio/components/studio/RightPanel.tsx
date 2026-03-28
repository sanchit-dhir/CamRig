import { useState } from "react";
import { characters, animations } from "../../lib/assets";

interface RightPanelProps {
  onSelectCharacter: (url: string) => void;
  onSelectAnimation: (url: string) => void;
}

export default function RightPanel({ onSelectCharacter, onSelectAnimation }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<"character" | "animations">("character");
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [selectedAnim, setSelectedAnim] = useState<string | null>(null);

  const items = activeTab === "character" ? characters : animations;
  const selected = activeTab === "character" ? selectedChar : selectedAnim;

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
    e.stopPropagation(); // prevent triggering handleSelect
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

  return (
    <div className="flex flex-col h-full bg-[#050505] border-l border-cyan-900/50 p-5 w-[220px] text-cyan-400 font-mono text-sm shadow-2xl">
      {/* Header */}
      <div className="border border-cyan-500/30 bg-black/80 rounded-lg text-center py-3 font-bold mb-5 tracking-widest text-cyan-300 text-xs relative overflow-hidden">
        <span className="relative z-10">ASSET LIBRARY</span>
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(0,255,255,0.03)_3px,rgba(0,255,255,0.03)_4px)] pointer-events-none" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4">
        {(["character", "animations"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded text-[10px] font-bold tracking-wider border transition-all ${activeTab === tab
              ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_8px_rgba(0,255,255,0.4)]"
              : "bg-black border-cyan-900 text-cyan-700 hover:border-cyan-600 hover:text-cyan-400"
              }`}
          >
            {tab === "character" ? "CHARS" : "ANIMS"}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {items.map((item) => {
          const isActive = selected === item.url;
          return (
            <div
              key={item.name}
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(item.url)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(item.url); }}
              className={`group w-full rounded-lg border overflow-hidden transition-all duration-200 flex flex-col items-stretch cursor-pointer ${isActive
                ? "border-cyan-400 shadow-[0_0_12px_rgba(0,255,255,0.35)] bg-cyan-950/40"
                : "border-cyan-900/60 bg-[#08080a] hover:border-cyan-700 hover:bg-cyan-950/20"
                }`}
            >
              {/* Thumbnail */}
              <div className="w-full aspect-video bg-black relative overflow-hidden group/thumb">
                <img
                  src={item.thumb}
                  alt={item.name}
                  className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 ${isActive ? "scale-105" : "group-hover:scale-105"}`}
                />
                
                {/* Download Button Overlay */}
                <button
                  onClick={(e) => handleDownloadAsset(e, item.url, item.name)}
                  className="absolute top-1 right-1 p-1.5 bg-black/60 backdrop-blur-sm border border-cyan-500/50 rounded-md text-cyan-300 opacity-0 group-hover/thumb:opacity-100 hover:bg-cyan-900/80 hover:text-cyan-100 transition-all z-20"
                  title="Download Asset"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                {isActive && (
                  <div className="absolute inset-0 border-2 border-cyan-400/60 rounded pointer-events-none" />
                )}
              </div>
              {/* Label */}
              <div className={`px-2 py-1.5 text-[10px] font-bold tracking-widest text-left transition-colors ${isActive ? "text-cyan-300" : "text-cyan-700 group-hover:text-cyan-500"
                }`}>
                {item.name.toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status */}
      <div className="mt-4 pt-3 border-t border-cyan-900/30">
        <div className="text-[9px] text-cyan-800 tracking-widest mb-1">ACTIVE</div>
        <div className="text-[10px] text-cyan-500 truncate">
          {activeTab === "character"
            ? (selectedChar?.split("/").pop() ?? "—")
            : (selectedAnim?.split("/").pop() ?? "—")}
        </div>
      </div>
    </div>
  );
}