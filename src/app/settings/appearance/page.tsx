"use client";

import { ChevronLeft, Palette, Save, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

type Theme = "dark" | "light" | "auto";
type AccentColor = "indigo" | "purple" | "pink" | "blue" | "emerald" | "orange";

export default function AppearanceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [accentColor, setAccentColor] = useState<AccentColor>("indigo");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [glassEffect, setGlassEffect] = useState(true);
  const [fontSize, setFontSize] = useState(14);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/settings?category=appearance");
      const data = await res.json();

      if (data.success && !data.isDefault) {
        setTheme(data.settings.theme);
        setAccentColor(data.settings.accentColor);
        setSidebarCollapsed(data.settings.sidebarCollapsed);
        setCompactMode(data.settings.compactMode);
        setAnimationsEnabled(data.settings.animationsEnabled);
        setGlassEffect(data.settings.glassEffect);
        setFontSize(data.settings.fontSize);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const accentColors: { value: AccentColor; label: string; gradient: string }[] = [
    {
      value: "indigo",
      label: "Indigo",
      gradient: "from-indigo-500 to-purple-600",
    },
    {
      value: "purple",
      label: "Mor",
      gradient: "from-purple-500 to-pink-600",
    },
    {
      value: "pink",
      label: "Pembe",
      gradient: "from-pink-500 to-rose-600",
    },
    {
      value: "blue",
      label: "Mavi",
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      value: "emerald",
      label: "Yeşil",
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      value: "orange",
      label: "Turuncu",
      gradient: "from-orange-500 to-amber-600",
    },
  ];

  const handleSave = async () => {
    try {
      setSaving(true);
      const settings = {
        theme,
        accentColor,
        sidebarCollapsed,
        compactMode,
        animationsEnabled,
        glassEffect,
        fontSize,
      };

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "appearance", settings })
      });

      const data = await res.json();

      if (data.success) {
        // Apply immediately
        document.documentElement.style.fontSize = `${fontSize}px`;
        alert("✅ " + data.message);
      } else {
        alert("❌ " + data.error);
      }
    } catch (error) {
      alert("❌ Görünüm ayarları kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-indigo-300 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Ayarlara Dön
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center shadow-lg shadow-indigo-500/30">
            <Palette className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Görünüm</h1>
            <p className="text-gray-400">Tema ve UI tercihleri</p>
          </div>
        </div>
      </div>

      {/* Theme Selection */}
      <div className="glass-card mb-6">
        <h2 className="h2 mb-4">Tema</h2>

        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setTheme("dark")}
            className={`p-4 rounded-lg border-2 transition-all ${
              theme === "dark"
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-white/10 bg-white/5 hover:border-white/20"
            }`}
          >
            <div className="h-16 rounded bg-gradient-to-br from-slate-900 to-slate-950 mb-3 border border-white/10"></div>
            <p className="text-sm font-medium text-gray-200">Koyu</p>
          </button>

          <button
            onClick={() => setTheme("light")}
            className={`p-4 rounded-lg border-2 transition-all ${
              theme === "light"
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-white/10 bg-white/5 hover:border-white/20"
            }`}
          >
            <div className="h-16 rounded bg-gradient-to-br from-gray-100 to-white mb-3 border border-gray-300"></div>
            <p className="text-sm font-medium text-gray-200">Açık</p>
          </button>

          <button
            onClick={() => setTheme("auto")}
            className={`p-4 rounded-lg border-2 transition-all ${
              theme === "auto"
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-white/10 bg-white/5 hover:border-white/20"
            }`}
          >
            <div className="h-16 rounded bg-gradient-to-r from-slate-900 via-gray-500 to-gray-100 mb-3"></div>
            <p className="text-sm font-medium text-gray-200">Otomatik</p>
          </button>
        </div>
      </div>

      {/* Accent Color */}
      <div className="glass-card mb-6">
        <h2 className="h2 mb-4">Vurgu Rengi</h2>

        <div className="grid grid-cols-3 gap-4">
          {accentColors.map((color) => (
            <button
              key={color.value}
              onClick={() => setAccentColor(color.value)}
              className={`p-4 rounded-lg border-2 transition-all ${
                accentColor === color.value
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <div
                className={`h-12 rounded-lg bg-gradient-to-r ${color.gradient} mb-3 shadow-lg`}
              ></div>
              <p className="text-sm font-medium text-gray-200">{color.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* UI Preferences */}
      <div className="glass-card mb-6">
        <h2 className="h2 mb-4">Arayüz Tercihleri</h2>

        <div className="space-y-4">
          {/* Sidebar Default State */}
          <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:border-indigo-500/30 transition-all">
            <div>
              <p className="font-medium text-gray-200">Sidebar Başlangıçta Daraltılmış</p>
              <p className="text-sm text-gray-500">Sidebar açılışta küçük gösterilsin</p>
            </div>
            <input
              type="checkbox"
              checked={sidebarCollapsed}
              onChange={(e) => setSidebarCollapsed(e.target.checked)}
              className="w-4 h-4 text-indigo-500 bg-white/5 border-white/10 rounded focus:ring-indigo-500"
            />
          </label>

          {/* Compact Mode */}
          <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:border-indigo-500/30 transition-all">
            <div>
              <p className="font-medium text-gray-200">Kompakt Mod</p>
              <p className="text-sm text-gray-500">Daha az boşluk, daha fazla içerik</p>
            </div>
            <input
              type="checkbox"
              checked={compactMode}
              onChange={(e) => setCompactMode(e.target.checked)}
              className="w-4 h-4 text-indigo-500 bg-white/5 border-white/10 rounded focus:ring-indigo-500"
            />
          </label>

          {/* Animations */}
          <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:border-indigo-500/30 transition-all">
            <div>
              <p className="font-medium text-gray-200">Animasyonlar</p>
              <p className="text-sm text-gray-500">Geçişler ve efektler</p>
            </div>
            <input
              type="checkbox"
              checked={animationsEnabled}
              onChange={(e) => setAnimationsEnabled(e.target.checked)}
              className="w-4 h-4 text-indigo-500 bg-white/5 border-white/10 rounded focus:ring-indigo-500"
            />
          </label>

          {/* Glass Effect */}
          <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:border-indigo-500/30 transition-all">
            <div>
              <p className="font-medium text-gray-200">Cam Efekti (Glassmorphism)</p>
              <p className="text-sm text-gray-500">Şeffaf blur efektli kartlar</p>
            </div>
            <input
              type="checkbox"
              checked={glassEffect}
              onChange={(e) => setGlassEffect(e.target.checked)}
              className="w-4 h-4 text-indigo-500 bg-white/5 border-white/10 rounded focus:ring-indigo-500"
            />
          </label>

          {/* Font Size */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-gray-200">Yazı Boyutu</p>
                <p className="text-sm text-gray-500">{fontSize}px</p>
              </div>
              <button
                onClick={() => setFontSize(14)}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                Varsayılana Dön
              </button>
            </div>
            <input
              type="range"
              min="12"
              max="18"
              step="1"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Küçük (12px)</span>
              <span>Büyük (18px)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="glass-card mb-6">
        <h2 className="h2 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          Önizleme
        </h2>

        <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`h-10 w-10 rounded-lg bg-gradient-to-br ${
                accentColors.find((c) => c.value === accentColor)?.gradient
              } grid place-items-center shadow-lg`}
            >
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-100" style={{ fontSize }}>
                Procheff AI System
              </p>
              <p className="text-sm text-gray-400" style={{ fontSize: fontSize - 2 }}>
                Bu bir önizleme metnidir
              </p>
            </div>
          </div>

          <button
            className={`px-4 py-2 rounded-lg bg-gradient-to-r ${
              accentColors.find((c) => c.value === accentColor)?.gradient
            } text-white font-medium shadow-lg transition-all ${
              animationsEnabled ? "hover:scale-105" : ""
            }`}
            style={{ fontSize }}
          >
            Örnek Buton
          </button>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save className="w-5 h-5" />
        {saving ? "Kaydediliyor..." : "Ayarları Kaydet ve Uygula"}
      </button>
    </div>
  );
}
