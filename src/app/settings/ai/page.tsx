"use client";

import { Brain, ChevronLeft, Save, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

type ModelProvider = "claude" | "gemini";
type ClaudeModel = "claude-sonnet-4-20250514" | "claude-haiku-4-5-20251001" | "claude-opus-4-20250514";
type GeminiModel = "gemini-2.0-flash-exp" | "gemini-1.5-pro";

export default function AISettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Claude Settings
  const [claudeModel, setClaudeModel] = useState<ClaudeModel>("claude-sonnet-4-20250514");
  const [claudeTemperature, setClaudeTemperature] = useState(0.7);
  const [claudeMaxTokens, setClaudeMaxTokens] = useState(4096);
  const [claudeTimeout, setClaudeTimeout] = useState(90);

  // Gemini Settings
  const [geminiModel, setGeminiModel] = useState<GeminiModel>("gemini-2.0-flash-exp");
  const [geminiTemperature, setGeminiTemperature] = useState(0.4);

  // Pipeline Settings
  const [primaryProvider, setPrimaryProvider] = useState<ModelProvider>("claude");
  const [enableFallback, setEnableFallback] = useState(true);
  const [fallbackModel, setFallbackModel] = useState<ClaudeModel>("claude-haiku-4-5-20251001");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/settings?category=ai");
      const data = await res.json();

      if (data.success && !data.isDefault) {
        const settings = data.settings;
        setClaudeModel(settings.claudeModel);
        setClaudeTemperature(settings.claudeTemperature);
        setClaudeMaxTokens(settings.claudeMaxTokens);
        setClaudeTimeout(settings.claudeTimeout);
        setGeminiModel(settings.geminiModel);
        setGeminiTemperature(settings.geminiTemperature);
        setPrimaryProvider(settings.primaryProvider);
        setEnableFallback(settings.enableFallback);
        setFallbackModel(settings.fallbackModel);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const settings = {
        claudeModel,
        claudeTemperature,
        claudeMaxTokens,
        claudeTimeout,
        geminiModel,
        geminiTemperature,
        primaryProvider,
        enableFallback,
        fallbackModel,
      };

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "ai", settings })
      });

      const data = await res.json();

      if (data.success) {
        alert("✅ " + data.message);
      } else {
        alert("❌ " + data.error);
      }
    } catch (error) {
      alert("❌ Ayarlar kaydedilemedi");
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
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-100">AI Model Ayarları</h1>
            <p className="text-gray-400">Claude & Gemini konfigürasyonu</p>
          </div>
        </div>
      </div>

      {/* Claude Settings */}
      <div className="glass-card mb-6">
        <h2 className="h2 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          Claude Sonnet 4.5
        </h2>

        <div className="space-y-4">
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Model
            </label>
            <select
              value={claudeModel}
              onChange={(e) => setClaudeModel(e.target.value as ClaudeModel)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (Önerilen)</option>
              <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Hızlı)</option>
              <option value="claude-opus-4-20250514">Claude Opus 4 (En Güçlü)</option>
            </select>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Temperature: {claudeTemperature.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={claudeTemperature}
              onChange={(e) => setClaudeTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Kesin (0.0)</span>
              <span>Yaratıcı (1.0)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max Tokens
            </label>
            <input
              type="number"
              min="1024"
              max="8192"
              step="512"
              value={claudeMaxTokens}
              onChange={(e) => setClaudeMaxTokens(parseInt(e.target.value))}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* Timeout */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Timeout (saniye)
            </label>
            <input
              type="number"
              min="30"
              max="180"
              step="10"
              value={claudeTimeout}
              onChange={(e) => setClaudeTimeout(parseInt(e.target.value))}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        </div>
      </div>

      {/* Gemini Settings */}
      <div className="glass-card mb-6">
        <h2 className="h2 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          Gemini Vision OCR
        </h2>

        <div className="space-y-4">
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Model
            </label>
            <select
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value as GeminiModel)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Önerilen)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            </select>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Temperature: {geminiTemperature.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={geminiTemperature}
              onChange={(e) => setGeminiTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">
              OCR için düşük temperature önerilir
            </p>
          </div>
        </div>
      </div>

      {/* Pipeline Integration */}
      <div className="glass-card mb-6">
        <h2 className="h2 mb-4">Pipeline Entegrasyonu</h2>

        <div className="space-y-4">
          {/* Primary Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Ana Model Sağlayıcı
            </label>
            <div className="flex gap-4">
              <label className="flex-1 flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:border-indigo-500/30 transition-all">
                <input
                  type="radio"
                  name="provider"
                  value="claude"
                  checked={primaryProvider === "claude"}
                  onChange={(e) => setPrimaryProvider(e.target.value as ModelProvider)}
                  className="text-indigo-500"
                />
                <div>
                  <p className="font-medium text-gray-200">Claude</p>
                  <p className="text-xs text-gray-500">Analiz & Karar</p>
                </div>
              </label>
              <label className="flex-1 flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:border-indigo-500/30 transition-all">
                <input
                  type="radio"
                  name="provider"
                  value="gemini"
                  checked={primaryProvider === "gemini"}
                  onChange={(e) => setPrimaryProvider(e.target.value as ModelProvider)}
                  className="text-indigo-500"
                />
                <div>
                  <p className="font-medium text-gray-200">Gemini</p>
                  <p className="text-xs text-gray-500">OCR & Vision</p>
                </div>
              </label>
            </div>
          </div>

          {/* Fallback */}
          <div>
            <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:border-indigo-500/30 transition-all">
              <input
                type="checkbox"
                checked={enableFallback}
                onChange={(e) => setEnableFallback(e.target.checked)}
                className="text-indigo-500"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-200">Fallback Model Kullan</p>
                <p className="text-xs text-gray-500">
                  Retry başarısız olursa daha hızlı modele geç
                </p>
              </div>
            </label>
          </div>

          {enableFallback && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fallback Model
              </label>
              <select
                value={fallbackModel}
                onChange={(e) => setFallbackModel(e.target.value as ClaudeModel)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Önerilen)</option>
                <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save className="w-5 h-5" />
        {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
      </button>
    </div>
  );
}
