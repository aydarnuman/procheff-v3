"use client";

import { useState } from "react";
import { Shield, Smartphone, Copy, Download, RefreshCw, X, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface TwoFactorSetupProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function TwoFactorSetup({ onClose, onSuccess }: TwoFactorSetupProps) {
  const [step, setStep] = useState<"setup" | "verify" | "backup">("setup");
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");

  const startSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/security/2fa/setup", {
        method: "POST",
      });

      const data = await res.json();

      if (data.success) {
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setBackupCodes(data.backupCodes);
        setStep("verify");
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("2FA kurulumu başlatılamadı");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Lütfen 6 haneli kodu girin");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/settings/security/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: verificationCode }),
      });

      const data = await res.json();

      if (data.success) {
        setStep("backup");
        toast.success("2FA başarıyla etkinleştirildi!");
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("Doğrulama başarısız. Lütfen tekrar deneyin.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Kopyalandı!");
  };

  const downloadBackupCodes = () => {
    const content = `ProCheff 2FA Yedek Kodları
=============================
Tarih: ${new Date().toLocaleDateString("tr-TR")}

Bu kodları güvenli bir yerde saklayın.
Her kod yalnızca bir kez kullanılabilir.

${backupCodes.map((code, i) => `${i + 1}. ${code}`).join("\n")}

=============================
ProCheff Security
`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "procheff-2fa-backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Yedek kodlar indirildi");
  };

  const completeSetup = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="glass-card max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5" />
            İki Faktörlü Kimlik Doğrulama Kurulumu
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step: Setup */}
        {step === "setup" && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <Smartphone className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">2FA&rsquo;yı Etkinleştir</h3>
              <p className="text-gray-400 text-sm mb-6">
                Hesabınıza ekstra güvenlik katmanı ekleyin. Google Authenticator,
                Authy veya benzeri bir uygulama kullanarak giriş yapabileceksiniz.
              </p>
            </div>

            <div className="space-y-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-300 font-medium">Başlamadan önce:</p>
              <ul className="space-y-1 text-sm text-yellow-200">
                <li>• Telefonunuzda authenticator uygulaması yüklü olmalı</li>
                <li>• Yedek kodlarınızı güvenli bir yerde saklamalısınız</li>
                <li>• 2FA&rsquo;yı kapatmak için yedek kodlara ihtiyacınız olabilir</li>
              </ul>
            </div>

            <button
              onClick={startSetup}
              disabled={loading}
              className="w-full btn-gradient py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                "Kurulumu Başlat"
              )}
            </button>
          </div>
        )}

        {/* Step: Verify */}
        {step === "verify" && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">QR Kodu Tarayın</h3>
              <p className="text-gray-400 text-sm">
                Authenticator uygulamanızla bu QR kodu tarayın
              </p>
            </div>

            {/* QR Code */}
            {qrCode && (
              <div className="bg-white p-4 rounded-lg mx-auto w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
              </div>
            )}

            {/* Manual Entry */}
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-xs text-gray-400 mb-2">
                QR kodu tarayamıyor musunuz? Manuel olarak girin:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-black/30 rounded text-xs font-mono break-all">
                  {secret}
                </code>
                <button
                  onClick={() => copyToClipboard(secret)}
                  className="p-2 hover:bg-white/10 rounded transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Verification Input */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Doğrulama Kodu (6 haneli)
              </label>
              <input
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="000000"
              />
            </div>

            <button
              onClick={verifyCode}
              disabled={loading || verificationCode.length !== 6}
              className="w-full btn-gradient py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                "Doğrula ve Etkinleştir"
              )}
            </button>
          </div>
        )}

        {/* Step: Backup Codes */}
        {step === "backup" && (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">2FA Etkinleştirildi!</h3>
              <p className="text-gray-400 text-sm">
                Yedek kodlarınızı güvenli bir yerde saklayın
              </p>
            </div>

            {/* Backup Codes */}
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Yedek Kodlar</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(backupCodes.join("\n"))}
                    className="p-1.5 hover:bg-white/10 rounded transition-colors"
                    title="Kopyala"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={downloadBackupCodes}
                    className="p-1.5 hover:bg-white/10 rounded transition-colors"
                    title="İndir"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, i) => (
                  <div
                    key={i}
                    className="p-2 bg-black/30 rounded text-center font-mono text-sm"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <p className="text-sm text-orange-300">
                ⚠️ Bu kodları güvenli bir yerde saklayın! Telefonunuzu kaybederseniz
                hesabınıza erişmek için bu kodlara ihtiyacınız olacak.
              </p>
            </div>

            <button
              onClick={completeSetup}
              className="w-full btn-gradient py-3 rounded-lg"
            >
              Kurulumu Tamamla
            </button>
          </div>
        )}
      </div>
    </div>
  );
}