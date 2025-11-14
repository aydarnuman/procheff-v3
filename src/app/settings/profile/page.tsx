"use client";

import { useState, useEffect } from "react";
import { User, Mail, Lock } from "lucide-react";
import { useSession } from "next-auth/react";

export default function ProfileSettingsPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
      setLoading(false);
    }
  }, [session]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email })
      });

      const data = await res.json();

      if (data.success) {
        alert("✅ " + data.message);
        // Update session
        if (update) {
          update({ user: { ...session?.user, name, email } });
        }
      } else {
        alert("❌ " + data.error);
      }
    } catch (error) {
      alert("❌ Profil güncellenemedi");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      alert("❌ Yeni şifreler eşleşmiyor");
      return;
    }

    if (newPassword.length < 8) {
      alert("❌ Yeni şifre en az 8 karakter olmalı");
      return;
    }

    try {
      setChangingPassword(true);
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();

      if (data.success) {
        alert("✅ " + data.message);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        alert("❌ " + data.error);
      }
    } catch (error) {
      alert("❌ Şifre değiştirilemedi");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="h1 mb-8">Profil Ayarları</h1>

      {loading ? (
        <p className="text-gray-400">Yükleniyor...</p>
      ) : (
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
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-gradient w-full py-3 rounded-lg font-semibold disabled:opacity-50 mt-4"
            >
              {saving ? "Kaydediliyor..." : "Profil Bilgilerini Kaydet"}
            </button>
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
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
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
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePasswordChange}
              disabled={changingPassword}
              className="btn-gradient w-full py-3 rounded-lg font-semibold disabled:opacity-50 mt-4"
            >
              {changingPassword ? "Değiştiriliyor..." : "Şifre Değiştir"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
