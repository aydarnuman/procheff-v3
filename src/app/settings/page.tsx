"use client";

import {
    Bell,
    Brain,
    Database,
    FileText,
    Globe,
    Key,
    Palette,
    Save,
    ScrollText,
    Settings,
    Shield,
    Sparkles,
    User,
    Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type SettingCategory = {
  id: string;
  name: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description: string;
  href?: string;
};

const CATEGORIES: SettingCategory[] = [
  {
    id: "profile",
    name: "Profil & Hesap",
    icon: User,
    description: "Kullanıcı bilgileri, şifre değiştirme",
    href: "/settings/profile",
  },
  {
    id: "pipeline",
    name: "Pipeline Ayarları",
    icon: Zap,
    description: "Auto-Pipeline konfigürasyonu ve retry logic",
    href: "/settings/pipeline",
  },
  {
    id: "ai",
    name: "AI Model Ayarları",
    icon: Brain,
    description: "Claude ve Gemini model seçimi, temperature",
    href: "/settings/ai",
  },
  {
    id: "notifications",
    name: "Bildirimler",
    icon: Bell,
    description: "Email, push ve sistem bildirimleri",
    href: "/settings/notifications",
  },
  {
    id: "appearance",
    name: "Görünüm",
    icon: Palette,
    description: "Tema, renk şeması, sidebar davranışı",
    href: "/settings/appearance",
  },
  {
    id: "database",
    name: "Veritabanı",
    icon: Database,
    description: "SQLite ayarları, backup, temizleme",
    href: "/settings/database",
  },
  {
    id: "reports",
    name: "Rapor Ayarları",
    icon: FileText,
    description: "PDF/Excel şablonları, default ayarlar",
    href: "/settings/reports",
  },
  {
    id: "security",
    name: "Güvenlik",
    icon: Shield,
    description: "API key yönetimi, erişim kontrolleri",
    href: "/settings/security",
  },
  {
    id: "logs",
    name: "Sistem Logları",
    icon: ScrollText,
    description: "AI analiz logları ve performans metrikleri",
    href: "/settings/logs",
  },
  {
    id: "api",
    name: "API & Entegrasyonlar",
    icon: Globe,
    description: "Harici API'ler, webhook ayarları",
    href: "/settings/api",
  },
];

export default function SettingsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = CATEGORIES.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-3">
          <div className="h-14 w-14 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 grid place-items-center">
            <Settings className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-1 tracking-tight">
              Ayarlar
            </h1>
            <p className="text-gray-400 text-sm">Sistem konfigürasyonu ve tercihler</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="🔍 Ayarlarda ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-5 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl text-gray-100 placeholder-gray-500 focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all text-base"
        />
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Link
              key={category.id}
              href={category.href || `/settings/${category.id}`}
              className="group relative p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 no-underline"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 grid place-items-center group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                    <Icon className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-base font-semibold text-white group-hover:text-gray-100 transition-colors no-underline">
                    {category.name}
                  </h3>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {category.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-white" />
          <h2 className="text-base font-semibold text-white">Hızlı İşlemler</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all border border-white/10 hover:border-white/20 group">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 grid place-items-center group-hover:bg-emerald-500/20 transition-all">
              <Save className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-white mb-0.5">Backup Al</p>
              <p className="text-[10px] text-gray-500">Tüm verileri yedekle</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all border border-white/10 hover:border-white/20 group">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 grid place-items-center group-hover:bg-blue-500/20 transition-all">
              <Database className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-white mb-0.5">DB Temizle</p>
              <p className="text-[10px] text-gray-500">Eski logları sil</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all border border-white/10 hover:border-white/20 group">
            <div className="h-9 w-9 rounded-lg bg-yellow-500/10 border border-yellow-500/20 grid place-items-center group-hover:bg-yellow-500/20 transition-all">
              <Key className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-white mb-0.5">API Keys</p>
              <p className="text-[10px] text-gray-500">Anahtarları yönet</p>
            </div>
          </button>
        </div>
      </div>

      {/* System Info */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-medium">Sistem Versiyonu</p>
          <p className="text-lg font-bold text-white">Procheff v3.0.0</p>
        </div>
        <div className="p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-medium">Auto-Pipeline</p>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <p className="text-lg font-bold text-emerald-400">v2.0 Active</p>
          </div>
        </div>
        <div className="p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5 font-medium">AI Engine</p>
          <p className="text-lg font-bold text-white">Claude Sonnet 4.5</p>
        </div>
      </div>
    </div>
  );
}
