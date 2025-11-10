"use client";

import { Command } from "cmdk";
import {
  BarChart4,
  Brain,
  Calculator,
  FileText,
  Home,
  ScrollText,
  Search,
  Sparkles,
  UploadCloud,
  Utensils,
  Zap
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  function navigate(path: string) {
    router.push(path);
    setOpen(false);
    setQuery("");
  }

  async function askClaude() {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/ai/deep-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extracted_data: {
            soru: query,
            context: "Command Palette Quick Query"
          }
        }),
      });
      const data = await res.json();

      // Create a modal-like display for the answer
      const answer = data.data?.analiz || data.data?.cevap || JSON.stringify(data.data, null, 2);

      // For now, we'll use alert - you can replace with a modal later
      alert(`Claude Sonnet 4.5 Cevabı:\n\n${answer}`);
    } catch (error) {
      alert("Bir hata oluştu: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
    } finally {
      setLoading(false);
      setOpen(false);
      setQuery("");
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={() => setOpen(false)}
      />

      {/* Command Palette */}
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-2xl z-50 px-4">
        <Command
          className="glass-card border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden"
          label="Command Menu"
        >
          <div className="flex items-center border-b border-slate-700/50 px-4">
            <Search className="w-5 h-5 text-indigo-400 mr-3" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Ara veya komut yaz... (ör. 'monitor' / 'rapor oluştur')"
              className="flex-1 bg-transparent border-0 outline-none py-4 text-gray-100 placeholder:text-gray-500"
              autoFocus
            />
            <kbd className="hidden sm:block px-2 py-1 text-xs text-gray-400 bg-slate-800 rounded border border-slate-700">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-gray-400">
              Sonuç bulunamadı.
            </Command.Empty>

            <Command.Group heading="Navigasyon" className="text-gray-400 text-xs font-semibold px-2 py-2">
              <Command.Item
                onSelect={() => navigate("/")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-800/50 text-gray-300 transition-colors"
              >
                <Home className="w-4 h-4 text-gray-400" />
                <span>Ana Sayfa</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigate("/monitor")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-800/50 text-gray-300 transition-colors"
              >
                <BarChart4 className="w-4 h-4 text-cyan-400" />
                <span>Monitoring Dashboard</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigate("/logs")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-800/50 text-gray-300 transition-colors"
              >
                <ScrollText className="w-4 h-4 text-purple-400" />
                <span>Log Kayıtları</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigate("/auto")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-800/50 text-gray-300 transition-colors"
              >
                <Zap className="w-4 h-4 text-yellow-400" />
                <span>⚡ Oto-Analiz Pipeline</span>
                <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-linear-to-r from-yellow-500 to-orange-500 text-white rounded">NEW</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigate("/ihale/workspace")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-800/50 text-gray-300 transition-colors"
              >
                <UploadCloud className="w-4 h-4 text-indigo-400" />
                <span>Yeni İhale Analizi</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigate("/menu-parser")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-800/50 text-gray-300 transition-colors"
              >
                <Utensils className="w-4 h-4 text-emerald-400" />
                <span>Menü Parser</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigate("/cost-analysis")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-800/50 text-gray-300 transition-colors"
              >
                <Calculator className="w-4 h-4 text-amber-400" />
                <span>Maliyet Analizi</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigate("/decision")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-800/50 text-gray-300 transition-colors"
              >
                <Brain className="w-4 h-4 text-pink-400" />
                <span>Karar Motoru</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigate("/reports")}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-800/50 text-gray-300 transition-colors"
              >
                <FileText className="w-4 h-4 text-violet-400" />
                <span>Raporlar</span>
              </Command.Item>
            </Command.Group>

            {query.trim() && (
              <Command.Group heading="AI Komutları" className="text-gray-400 text-xs font-semibold px-2 py-2 mt-2">
                <Command.Item
                  onSelect={askClaude}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-indigo-900/30 text-gray-300 transition-colors border border-indigo-500/30"
                  disabled={loading}
                >
                  {loading ? (
                    <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                  ) : (
                    <Brain className="w-4 h-4 text-indigo-400" />
                  )}
                  <span className="flex-1">
                    {loading ? "Claude düşünüyor..." : `Claude'a sor: "${query}"`}
                  </span>
                  <kbd className="px-2 py-1 text-xs text-indigo-400 bg-indigo-950 rounded border border-indigo-700">
                    ↵
                  </kbd>
                </Command.Item>
              </Command.Group>
            )}
          </Command.List>

          <div className="border-t border-slate-700/50 px-4 py-3 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span>↑↓ Gezin</span>
              <span>↵ Seç</span>
              <span>ESC Kapat</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700">⌘</kbd>
              <span>+</span>
              <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700">K</kbd>
            </div>
          </div>
        </Command>
      </div>
    </>
  );
}
