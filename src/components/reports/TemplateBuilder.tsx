"use client";

import { useState } from "react";
import { X, Save, FileText, ChevronRight } from "lucide-react";
import { reportSections, formatOptions } from "@/lib/reports/templates";
import { ReportTemplate } from "@/lib/reports/service";

interface TemplateBuilderProps {
  template?: ReportTemplate;
  onSave: (template: Partial<ReportTemplate>) => void;
  onClose: () => void;
}

export function TemplateBuilder({
  template,
  onSave,
  onClose,
}: TemplateBuilderProps) {
  const [formData, setFormData] = useState<Partial<ReportTemplate>>({
    name: template?.name || "",
    description: template?.description || "",
    type: template?.type || "analysis",
    sections: template?.sections || [],
    format: template?.format || "pdf",
    filters: template?.filters || {},
    recipients: template?.recipients || [],
  });

  const [recipientInput, setRecipientInput] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const handleSectionToggle = (sectionKey: string) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections?.includes(sectionKey)
        ? prev.sections.filter((s) => s !== sectionKey)
        : [...(prev.sections || []), sectionKey],
    }));
  };

  const handleAddRecipient = () => {
    const email = recipientInput.trim();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormData((prev) => ({
        ...prev,
        recipients: [...(prev.recipients || []), email],
      }));
      setRecipientInput("");
    }
  };

  const handleRemoveRecipient = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      recipients: prev.recipients?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSubmit = () => {
    const validationErrors: string[] = [];

    if (!formData.name?.trim()) {
      validationErrors.push("Şablon adı gerekli");
    }

    if (!formData.sections || formData.sections.length === 0) {
      validationErrors.push("En az bir bölüm seçmelisiniz");
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {template ? "Şablonu Düzenle" : "Yeni Şablon Oluştur"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            {errors.map((error, i) => (
              <p key={i} className="text-sm text-red-300">
                • {error}
              </p>
            ))}
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Şablon Adı</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full glass p-3 rounded-lg bg-transparent"
              placeholder="Örn: İhale Analiz Raporu"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Açıklama</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full glass p-3 rounded-lg bg-transparent resize-none"
              rows={2}
              placeholder="Şablon açıklaması (opsiyonel)"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Rapor Tipi</label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as ReportTemplate["type"],
                })
              }
              className="w-full glass p-3 rounded-lg bg-transparent"
            >
              <option value="analysis">Analiz</option>
              <option value="summary">Özet</option>
              <option value="detailed">Detaylı</option>
              <option value="custom">Özel</option>
            </select>
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-medium mb-2">Format</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(formatOptions).map(([key, format]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData({ ...formData, format: key as any })}
                  className={`glass p-3 rounded-lg text-center transition-all ${
                    formData.format === key
                      ? "border-2 border-indigo-500 bg-indigo-500/20"
                      : ""
                  }`}
                >
                  <div className="text-2xl mb-1">{format.icon}</div>
                  <div className="text-xs">{format.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Bölümler ({formData.sections?.length || 0} seçili)
            </label>
            <div className="glass p-3 rounded-lg space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(reportSections).map(([key, section]) => (
                <label
                  key={key}
                  className="flex items-start gap-3 p-2 hover:bg-slate-700/50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.sections?.includes(key) || false}
                    onChange={() => handleSectionToggle(key)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{section.name}</div>
                    <div className="text-xs text-gray-400">
                      {section.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Email Alıcıları (opsiyonel)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="email"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddRecipient()}
                className="flex-1 glass p-3 rounded-lg bg-transparent"
                placeholder="email@example.com"
              />
              <button
                type="button"
                onClick={handleAddRecipient}
                className="px-4 glass hover:bg-slate-700 rounded-lg"
              >
                Ekle
              </button>
            </div>
            {formData.recipients && formData.recipients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.recipients.map((email, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-slate-700/50 rounded-full text-sm flex items-center gap-2"
                  >
                    {email}
                    <button
                      onClick={() => handleRemoveRecipient(i)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-6 border-t border-slate-700">
          <button
            onClick={onClose}
            className="flex-1 glass py-3 rounded-lg hover:bg-slate-700 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 btn-gradient py-3 rounded-lg flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {template ? "Güncelle" : "Oluştur"}
          </button>
        </div>
      </div>
    </div>
  );
}