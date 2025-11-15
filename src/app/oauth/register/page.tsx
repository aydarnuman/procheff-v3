"use client";

import { CheckCircle, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface FormData {
  name: string;
  description: string;
  homepage_url: string;
  callback_urls: string[];
}

interface OAuthResponse {
  success: boolean;
  data?: {
    id: number;
    client_id: string;
    client_secret: string;
    name: string;
    message: string;
  };
  error?: string;
  details?: unknown;
}

export default function OAuthRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [result, setResult] = useState<OAuthResponse["data"] | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    homepage_url: "",
    callback_urls: [""],
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCallbackUrlChange = (index: number, value: string) => {
    const newUrls = [...formData.callback_urls];
    newUrls[index] = value;
    setFormData((prev) => ({
      ...prev,
      callback_urls: newUrls,
    }));
  };

  const addCallbackUrl = () => {
    setFormData((prev) => ({
      ...prev,
      callback_urls: [...prev.callback_urls, ""],
    }));
  };

  const removeCallbackUrl = (index: number) => {
    if (formData.callback_urls.length > 1) {
      setFormData((prev) => ({
        ...prev,
        callback_urls: prev.callback_urls.filter((_, i) => i !== index),
      }));
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} kopyalandı`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Uygulama adı gereklidir");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Açıklama gereklidir");
      return;
    }

    if (!formData.homepage_url.trim()) {
      toast.error("Ana sayfa URL'si gereklidir");
      return;
    }

    const validUrls = formData.callback_urls.filter((url) => url.trim());
    if (validUrls.length === 0) {
      toast.error("En az bir geri arama URL'si gereklidir");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/oauth/apps/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          homepage_url: formData.homepage_url,
          callback_urls: validUrls,
        }),
      });

      const data: OAuthResponse = await response.json();

      if (data.success && data.data) {
        setResult(data.data);
        toast.success("OAuth uygulaması başarıyla kaydedildi");
        setFormData({
          name: "",
          description: "",
          homepage_url: "",
          callback_urls: [""],
        });
      } else {
        toast.error(data.error || "Bir hata oluştu");
      }
    } catch (error) {
      toast.error("İstek gönderilemedi");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="glass-card">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <h1 className="h1">Başarılı!</h1>
            </div>

            <p className="text-gray-300 mb-6">{result.message}</p>

            <div className="space-y-4">
              <div className="glass p-4 rounded-lg">
                <label className="text-sm text-gray-400 block mb-2">
                  Uygulama Adı
                </label>
                <p className="text-white font-mono">{result.name}</p>
              </div>

              <div className="glass p-4 rounded-lg">
                <label className="text-sm text-gray-400 block mb-2">
                  Client ID
                </label>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-white font-mono text-sm break-all">
                    {result.client_id}
                  </p>
                  <button
                    onClick={() => copyToClipboard(result.client_id, "Client ID")}
                    className="btn-gradient p-2 text-sm"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="glass p-4 rounded-lg">
                <label className="text-sm text-gray-400 block mb-2">
                  Client Secret {!showSecrets && "(Gizli)"}
                </label>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-white font-mono text-sm break-all">
                    {showSecrets ? result.client_secret : "●".repeat(32)}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="btn-gradient p-2 text-sm"
                      title={showSecrets ? "Secret'ı gizle" : "Secret'ı göster"}
                    >
                      {showSecrets ? "Gizle" : "Göster"}
                    </button>
                    <button
                      onClick={() =>
                        copyToClipboard(result.client_secret, "Client Secret")
                      }
                      className="btn-gradient p-2 text-sm"
                      title="Client Secret&apos;ı panoya kopyala"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-900/30 border border-yellow-700/50 p-4 rounded-lg mt-6">
                <p className="text-yellow-200 text-sm">
                  ⚠️ <strong>Önemli:</strong> Client Secret&apos;ı güvenli bir yerde
                  saklayın. Daha sonra göremeyeceksiniz.
                </p>
              </div>

              <button
                onClick={() => {
                  setResult(null);
                  router.push("/oauth/apps");
                }}
                className="btn-gradient w-full mt-6"
              >
                Uygulamalarıma Git
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="glass-card">
          <h1 className="h1 mb-2">Yeni OAuth Uygulaması</h1>
          <p className="text-gray-400 mb-8">
            Uygulamanızı OAuth sistemi ile kaydedin ve kimlik doğrulama
            entegrasyonunu başlatın.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Uygulama Adı */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Uygulama Adı <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Örn: Mağaza Entegrasyonu"
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                3-100 karakter arası
              </p>
            </div>

            {/* Ana Sayfa URL&apos;si */}
            <div>
              <label htmlFor="homepage_url" className="block text-sm font-medium mb-2">
                Ana Sayfa URL&apos;si <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                id="homepage_url"
                name="homepage_url"
                value={formData.homepage_url}
                onChange={handleInputChange}
                placeholder="https://example.com"
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Açıklama */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Açıklama <span className="text-red-400">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Uygulamanız hakkında kısa bir açıklama..."
                rows={4}
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                10-500 karakter arası
              </p>
            </div>

            {/* Geri Arama URL&apos;leri */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Geri Arama URL&apos;leri <span className="text-red-400">*</span>
              </label>
              <div className="space-y-2">
                {formData.callback_urls.map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => handleCallbackUrlChange(index, e.target.value)}
                      placeholder={`https://example.com/callback`}
                      className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {formData.callback_urls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCallbackUrl(index)}
                        className="px-3 py-2 bg-red-900/30 border border-red-700/50 rounded-lg text-red-400 hover:bg-red-900/50 transition-colors"
                      >
                        Sil
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addCallbackUrl}
                className="mt-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                + Başka bir URL ekle
              </button>
              <p className="text-xs text-gray-500 mt-1">
                OAuth kimlik doğrulama sonrası yönlendirilecek URL&apos;ler
              </p>
            </div>

            {/* Submit Butonu */}
            <button
              type="submit"
              disabled={loading}
              className="btn-gradient w-full py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin">⟳</div>
                  Kaydediliyor...
                </span>
              ) : (
                "Uygulamayı Kaydet"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
