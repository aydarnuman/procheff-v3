"use client";

import { useState, useEffect } from "react";
import { X, Mail, RefreshCw } from "lucide-react";

interface VerificationModalProps {
  channelId: number;
  channelType: string;
  destination: string;
  onVerify: (channelId: number, code: string) => Promise<boolean>;
  onResend: (channelId: number) => Promise<void>;
  onClose: () => void;
}

export function VerificationModal({
  channelId,
  channelType,
  destination,
  onVerify,
  onResend,
  onClose,
}: VerificationModalProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // Start countdown when modal opens
    setCountdown(60); // 60 seconds before allowing resend
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError("Lütfen 6 haneli kodu girin");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await onVerify(channelId, code);
      if (success) {
        onClose();
      } else {
        setError("Geçersiz kod. Lütfen tekrar deneyin.");
      }
    } catch (error) {
      setError("Doğrulama başarısız. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;

    setResending(true);
    setError(null);

    try {
      await onResend(channelId);
      setCountdown(60); // Reset countdown
      setCode(""); // Clear code input
    } catch (error) {
      setError("Kod gönderilemedi. Lütfen tekrar deneyin.");
    } finally {
      setResending(false);
    }
  };

  const handleCodeChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const cleaned = value.replace(/\D/g, "").slice(0, 6);
    setCode(cleaned);
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="glass-card max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Kanal Doğrulama</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Info */}
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-5 h-5 text-indigo-400" />
              <p className="font-medium">Doğrulama Kodu Gönderildi</p>
            </div>
            <p className="text-sm text-gray-400">
              <span className="font-mono text-white">{destination}</span> adresine
              6 haneli doğrulama kodu gönderildi.
            </p>
          </div>

          {/* Code Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Doğrulama Kodu
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="000000"
              className="w-full glass p-4 rounded-lg bg-transparent text-center text-2xl font-mono tracking-widest"
              maxLength={6}
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
          </div>

          {/* Resend */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleResend}
              disabled={countdown > 0 || resending}
              className="text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
              {countdown > 0
                ? `Tekrar gönder (${countdown}s)`
                : "Kodu tekrar gönder"}
            </button>
          </div>

          {/* Info Text */}
          <p className="text-xs text-gray-500 text-center">
            Kod 10 dakika boyunca geçerlidir. Eğer kodu almadıysanız,
            spam klasörünü kontrol edin.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 glass py-3 rounded-lg hover:bg-slate-700 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            className="flex-1 btn-gradient py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Doğrulanıyor...
              </span>
            ) : (
              "Doğrula"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}