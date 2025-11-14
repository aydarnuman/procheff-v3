"use client";

import { ChevronLeft, Copy, Eye, EyeOff, Key, RefreshCw, Save, Shield, Trash2, Smartphone, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { TwoFactorSetup } from "@/components/security/TwoFactorSetup";
import { toast } from "sonner";

type APIKey = {
  id: string;
  name: string;
  service: "claude" | "gemini" | "openai";
  key: string;
  createdAt: string;
  lastUsed: string;
};

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([
    {
      id: "1",
      name: "Claude Production",
      service: "claude",
      key: "sk-ant-api03-xxx...xxx",
      createdAt: "2025-01-10",
      lastUsed: "2 saat önce",
    },
    {
      id: "2",
      name: "Gemini Vision",
      service: "gemini",
      key: "AIzaSyxxx...xxx",
      createdAt: "2025-01-10",
      lastUsed: "5 dakika önce",
    },
  ]);

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyService, setNewKeyService] = useState<"claude" | "gemini" | "openai">("claude");
  const [newKeyValue, setNewKeyValue] = useState("");

  // Security Settings
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorStatus, setTwoFactorStatus] = useState<{
    lastUsed?: string;
    backupCodesRemaining?: number;
  }>({});
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [ipWhitelist, setIpWhitelist] = useState("");
  const [auditLogEnabled, setAuditLogEnabled] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/settings?category=security");
      const data = await res.json();

      if (data.success && !data.isDefault) {
        setSessionTimeout(data.settings.sessionTimeout);
        setTwoFactorEnabled(data.settings.twoFactorEnabled);
        setIpWhitelist(data.settings.ipWhitelist || "");
        setAuditLogEnabled(data.settings.auditLogEnabled);
      }

      // Load 2FA status
      const tfaRes = await fetch("/api/settings/security/2fa/setup");
      const tfaData = await tfaRes.json();

      if (tfaData.success) {
        setTwoFactorEnabled(tfaData.enabled);
        setTwoFactorStatus({
          lastUsed: tfaData.lastUsed,
          backupCodesRemaining: tfaData.backupCodesRemaining,
        });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleKeyVisibility = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("API key kopyalandı!");
  };

  const deleteKey = (id: string) => {
    if (confirm("Bu API key'i silmek istediğinizden emin misiniz?")) {
      setApiKeys((prev) => prev.filter((key) => key.id !== id));
    }
  };

  const addNewKey = () => {
    if (!newKeyName || !newKeyValue) {
      toast.error("Lütfen tüm alanları doldurun");
      return;
    }

    const newKey: APIKey = {
      id: Date.now().toString(),
      name: newKeyName,
      service: newKeyService,
      key: newKeyValue,
      createdAt: new Date().toISOString().split("T")[0],
      lastUsed: "Hiç kullanılmadı",
    };

    setApiKeys((prev) => [...prev, newKey]);
    setNewKeyName("");
    setNewKeyValue("");
    toast.success("API key eklendi!");
  };

  const handle2FAToggle = async () => {
    if (twoFactorEnabled) {
      // Disable 2FA
      if (confirm("2FA'yı kapatmak istediğinizden emin misiniz?")) {
        try {
          const res = await fetch("/api/settings/security/2fa/setup", {
            method: "DELETE",
          });

          const data = await res.json();
          if (data.success) {
            setTwoFactorEnabled(false);
            setTwoFactorStatus({});
            toast.success("2FA kapatıldı");
          } else {
            throw new Error(data.error);
          }
        } catch (error) {
          toast.error("2FA kapatılamadı");
        }
      }
    } else {
      // Show 2FA setup modal
      setShow2FASetup(true);
    }
  };

  const handle2FASetupSuccess = () => {
    setTwoFactorEnabled(true);
    loadSettings(); // Reload to get updated status
    toast.success("2FA başarıyla etkinleştirildi!");
  };

  const regenerateBackupCodes = async () => {
    if (confirm("Yedek kodları yenilemek istediğinizden emin misiniz? Eski kodlar geçersiz olacak.")) {
      try {
        const res = await fetch("/api/settings/security/2fa/backup-codes", {
          method: "POST",
        });

        const data = await res.json();
        if (data.success) {
          toast.success("Yedek kodlar yenilendi. Lütfen yeni kodları güvenli bir yerde saklayın.");
          // Could show the codes in a modal here
          console.log("New backup codes:", data.backupCodes);
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        toast.error("Yedek kodlar yenilenemedi");
      }
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const settings = {
        sessionTimeout,
        twoFactorEnabled,
        ipWhitelist,
        auditLogEnabled,
        apiKeysCount: apiKeys.length
      };

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "security", settings })
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error("Güvenlik ayarları kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
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
          <div className="h-12 w-12 rounded-xl bg-linear-to-br from-red-500 to-orange-600 grid place-items-center shadow-lg shadow-red-500/30">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Güvenlik</h1>
            <p className="text-gray-400">API keys ve erişim kontrolleri</p>
          </div>
        </div>
      </div>

      {/* API Keys Management */}
      <div className="glass-card mb-6">
        <h2 className="h2 mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-yellow-400" />
          API Anahtarları
        </h2>

        {/* Existing Keys */}
        <div className="space-y-3 mb-6">
          {apiKeys.map((apiKey) => (
            <div
              key={apiKey.id}
              className="p-4 bg-white/5 border border-white/10 rounded-lg hover:border-white/20 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-200">{apiKey.name}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        apiKey.service === "claude"
                          ? "bg-indigo-500/20 text-indigo-300"
                          : apiKey.service === "gemini"
                          ? "bg-purple-500/20 text-purple-300"
                          : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {apiKey.service.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Oluşturuldu: {apiKey.createdAt} • Son kullanım: {apiKey.lastUsed}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleKeyVisibility(apiKey.id)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                    title={showKeys[apiKey.id] ? "Gizle" : "Göster"}
                  >
                    {showKeys[apiKey.id] ? (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard(apiKey.key)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                    title="Kopyala"
                  >
                    <Copy className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => deleteKey(apiKey.id)}
                    className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-all"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
              <div className="p-3 bg-black/30 rounded-lg font-mono text-sm text-gray-300">
                {showKeys[apiKey.id] ? apiKey.key : "••••••••••••••••••••"}
              </div>
            </div>
          ))}
        </div>

        {/* Add New Key */}
        <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
          <h3 className="font-medium text-gray-200 mb-3">Yeni API Key Ekle</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input
              type="text"
              placeholder="Key adı (örn: Claude Production)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <select
              value={newKeyService}
              onChange={(e) => setNewKeyService(e.target.value as "claude" | "gemini" | "openai")}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              title="AI Servis Seçimi"
              aria-label="API key için AI servisini seçin"
            >
              <option value="claude">Claude</option>
              <option value="gemini">Gemini</option>
              <option value="openai">OpenAI</option>
            </select>
            <input
              type="password"
              placeholder="API Key"
              value={newKeyValue}
              onChange={(e) => setNewKeyValue(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          <button
            onClick={addNewKey}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-all"
          >
            <Key className="w-4 h-4" />
            API Key Ekle
          </button>
        </div>
      </div>

      {/* Security Settings */}
      <div className="glass-card mb-6">
        <h2 className="h2 mb-4">Güvenlik Ayarları</h2>

        <div className="space-y-4">
          {/* Session Timeout */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Oturum Zaman Aşımı (dakika)
            </label>
            <input
              type="number"
              min="5"
              max="120"
              step="5"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(parseInt(e.target.value))}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              title="Oturum zaman aşımı süresi (dakika)"
              aria-label="Oturum zaman aşımı süresi dakika olarak"
            />
            <p className="text-xs text-gray-500 mt-1">
              Kullanıcı {sessionTimeout} dakika hareketsiz kalırsa oturumu kapat
            </p>
          </div>

          {/* Two-Factor Auth */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-200">İki Faktörlü Kimlik Doğrulama (2FA)</p>
                  {twoFactorEnabled && (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  Giriş yaparken ekstra güvenlik katmanı
                </p>
                {twoFactorEnabled && twoFactorStatus && (
                  <div className="space-y-1 text-xs text-gray-400">
                    {twoFactorStatus.lastUsed && (
                      <p>Son kullanım: {new Date(twoFactorStatus.lastUsed).toLocaleString("tr-TR")}</p>
                    )}
                    {twoFactorStatus.backupCodesRemaining !== undefined && (
                      <p>Kalan yedek kod: {twoFactorStatus.backupCodesRemaining}</p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handle2FAToggle}
                  className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                    twoFactorEnabled
                      ? "bg-red-500/20 hover:bg-red-500/30 text-red-300"
                      : "bg-green-500/20 hover:bg-green-500/30 text-green-300"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  {twoFactorEnabled ? "Kapat" : "Etkinleştir"}
                </button>
                {twoFactorEnabled && (
                  <button
                    onClick={regenerateBackupCodes}
                    className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg transition-all text-sm"
                  >
                    Yedek Kodları Yenile
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* IP Whitelist */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              IP Whitelist (virgülle ayırın)
            </label>
            <textarea
              placeholder="192.168.1.1, 10.0.0.1"
              value={ipWhitelist}
              onChange={(e) => setIpWhitelist(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Boş bırakılırsa tüm IP&apos;ler erişebilir
            </p>
          </div>

          {/* Audit Log */}
          <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:border-indigo-500/30 transition-all">
            <div>
              <p className="font-medium text-gray-200">Audit Log</p>
              <p className="text-sm text-gray-500">Tüm güvenlik olaylarını kaydet</p>
            </div>
            <input
              type="checkbox"
              checked={auditLogEnabled}
              onChange={(e) => setAuditLogEnabled(e.target.checked)}
              className="w-4 h-4 text-indigo-500 bg-white/5 border-white/10 rounded focus:ring-indigo-500"
            />
          </label>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card mb-6">
        <h2 className="h2 mb-4">Hızlı İşlemler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg hover:border-orange-500/30 hover:bg-orange-500/5 transition-all">
            <RefreshCw className="w-5 h-5 text-orange-400" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-200">Tüm Anahtarları Yenile</p>
              <p className="text-xs text-gray-500">Yeni API key&apos;ler oluştur</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg hover:border-red-500/30 hover:bg-red-500/5 transition-all">
            <Shield className="w-5 h-5 text-red-400" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-200">Güvenlik Raporu</p>
              <p className="text-xs text-gray-500">Son 30 gün özeti</p>
            </div>
          </button>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save className="w-5 h-5" />
        {saving ? "Kaydediliyor..." : "Güvenlik Ayarlarını Kaydet"}
      </button>

      {/* 2FA Setup Modal */}
      {show2FASetup && (
        <TwoFactorSetup
          onClose={() => setShow2FASetup(false)}
          onSuccess={handle2FASetupSuccess}
        />
      )}
    </div>
  );
}
