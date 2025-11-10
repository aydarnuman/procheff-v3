"use client";

import { useState } from "react";
import { User, Mail, Lock, Camera } from "lucide-react";

export default function ProfileSettingsPage() {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // TODO: Implement save logic
    setTimeout(() => setSaving(false), 1000);
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="h1 mb-8">Profil Ayarları</h1>

      <div className="space-y-6">
        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4">Kişisel Bilgiler</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">İsim</label>
              <div className="flex items-center gap-2 glass p-3 rounded-lg">
                <User className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Adınız"
                  className="flex-1 bg-transparent border-none outline-none text-white"
                  defaultValue="Admin User"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Email</label>
              <div className="flex items-center gap-2 glass p-3 rounded-lg">
                <Mail className="w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="email@example.com"
                  className="flex-1 bg-transparent border-none outline-none text-white"
                  defaultValue="admin@procheff.com"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4">Şifre Değiştir</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Mevcut Şifre</label>
              <div className="flex items-center gap-2 glass p-3 rounded-lg">
                <Lock className="w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="flex-1 bg-transparent border-none outline-none text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Yeni Şifre</label>
              <div className="flex items-center gap-2 glass p-3 rounded-lg">
                <Lock className="w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="flex-1 bg-transparent border-none outline-none text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Şifre Tekrar</label>
              <div className="flex items-center gap-2 glass p-3 rounded-lg">
                <Lock className="w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="flex-1 bg-transparent border-none outline-none text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-gradient w-full py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </button>
      </div>
    </div>
  );
}
