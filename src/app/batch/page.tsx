"use client";

import { useState } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BatchUploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [priority, setPriority] = useState<"high" | "normal" | "low">("normal");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(file =>
      file.type === "application/pdf" ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.type === "text/plain"
    );

    if (validFiles.length < droppedFiles.length) {
      setError("Bazı dosyalar desteklenmiyor. Sadece PDF, DOCX ve TXT dosyaları yüklenebilir.");
    }

    setFiles(prev => [...prev, ...validFiles].slice(0, 50));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles].slice(0, 50));
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Lütfen en az bir dosya seçin");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach(file => formData.append("file", file));
      formData.append("priority", priority);

      const response = await fetch("/api/batch/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Yükleme başarısız");
      }

      // Redirect to jobs page
      router.push(`/batch/jobs?highlight=${result.data.batchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setUploading(false);
    }
  };

  const getTotalSize = () => {
    return files.reduce((acc, file) => acc + file.size, 0);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="h1">Toplu Dosya İşleme</h1>
          <p className="text-gray-400 mt-2">
            Aynı anda 50 dosyaya kadar yükleyip otomatik analiz yaptırın
          </p>
        </div>

        {/* Upload Area */}
        <div className="glass-card mb-6">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragActive
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-gray-700 hover:border-gray-600"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-16 h-16 mx-auto mb-4 text-gray-500" />
            <h3 className="text-xl font-semibold mb-2">
              Dosyaları sürükleyip bırakın
            </h3>
            <p className="text-gray-400 mb-4">
              veya dosya seçmek için tıklayın
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              onChange={handleFileInput}
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="btn-gradient inline-block cursor-pointer px-6 py-2 rounded-lg"
            >
              Dosya Seç
            </label>
            <p className="text-sm text-gray-500 mt-4">
              Desteklenen formatlar: PDF, DOCX, TXT (Max: 50 dosya)
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Seçilen Dosyalar ({files.length})
                </h3>
                <span className="text-sm text-gray-400">
                  Toplam: {formatBytes(getTotalSize())}
                </span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-indigo-400" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatBytes(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Priority Selection */}
        <div className="glass-card mb-6">
          <h3 className="text-lg font-semibold mb-4">Öncelik Seviyesi</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: "high", label: "Yüksek", color: "red" },
              { value: "normal", label: "Normal", color: "blue" },
              { value: "low", label: "Düşük", color: "gray" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setPriority(option.value as typeof priority)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  priority === option.value
                    ? `border-${option.color}-500 bg-${option.color}-500/10`
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <p className="font-semibold">{option.label}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {option.value === "high" && "Öncelikli işleme"}
                  {option.value === "normal" && "Standart sıra"}
                  {option.value === "low" && "Boş zamanlarda işle"}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="glass-card mb-6 border-2 border-red-500/50 bg-red-500/10">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-400">Hata</p>
                <p className="text-sm text-gray-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="btn-gradient flex-1 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Yükleniyor...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                İşleme Başlat
              </>
            )}
          </button>
          <button
            onClick={() => router.push("/batch/jobs")}
            className="glass px-6 py-3 rounded-lg font-semibold hover:bg-slate-800/80 transition-colors"
          >
            İşlem Geçmişi
          </button>
        </div>

        {/* Info Box */}
        <div className="glass-card mt-6 border-l-4 border-indigo-500">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-indigo-400" />
            Toplu İşleme Nasıl Çalışır?
          </h4>
          <ul className="text-sm text-gray-400 space-y-1 ml-7">
            <li>1. Dosyalarınızı seçin (max 50 dosya)</li>
            <li>2. Öncelik seviyesini belirleyin</li>
            <li>3. İşleme başlatın</li>
            <li>4. Her dosya sırayla analiz edilir (3 dosya paralel)</li>
            <li>5. Sonuçları İşlem Geçmişi sayfasından takip edin</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
