"use client";

import { FileText, Download, Edit, Trash2, Calendar, Mail } from "lucide-react";
import { formatOptions } from "@/lib/reports/templates";
import { ReportTemplate } from "@/lib/reports/service";

interface TemplateCardProps {
  template: ReportTemplate;
  onEdit: (template: ReportTemplate) => void;
  onDelete: (id: number) => void;
  onGenerate: (id: number) => void;
}

export function TemplateCard({
  template,
  onEdit,
  onDelete,
  onGenerate,
}: TemplateCardProps) {
  const formatInfo = formatOptions[template.format as keyof typeof formatOptions];

  return (
    <div className="glass-card hover:scale-[1.02] transition-transform">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{formatInfo?.icon || "📄"}</div>
          <div>
            <h3 className="font-semibold text-white">{template.name}</h3>
            <p className="text-sm text-gray-400">{template.description}</p>
          </div>
        </div>
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            template.type === "analysis"
              ? "bg-purple-500/20 text-purple-300"
              : template.type === "summary"
              ? "bg-blue-500/20 text-blue-300"
              : template.type === "detailed"
              ? "bg-green-500/20 text-green-300"
              : "bg-gray-500/20 text-gray-300"
          }`}
        >
          {template.type}
        </span>
      </div>

      {/* Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <FileText className="w-4 h-4" />
          <span>Format: {formatInfo?.name || template.format}</span>
        </div>
        {template.schedule && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>Zamanlanmış</span>
          </div>
        )}
        {template.recipients && template.recipients.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Mail className="w-4 h-4" />
            <span>{template.recipients.length} alıcı</span>
          </div>
        )}
        {template.last_generated && (
          <div className="text-xs text-gray-500">
            Son üretim:{" "}
            {new Date(template.last_generated).toLocaleDateString("tr-TR")}
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="flex flex-wrap gap-1 mb-4">
        {template.sections.slice(0, 3).map((section) => (
          <span
            key={section}
            className="px-2 py-1 text-xs bg-slate-700/50 rounded-lg"
          >
            {section}
          </span>
        ))}
        {template.sections.length > 3 && (
          <span className="px-2 py-1 text-xs bg-slate-700/50 rounded-lg">
            +{template.sections.length - 3} daha
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-slate-700">
        <button
          onClick={() => onGenerate(template.id!)}
          className="flex-1 btn-gradient py-2 rounded-lg flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Üret
        </button>
        <button
          onClick={() => onEdit(template)}
          className="p-2 glass hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(template.id!)}
          className="p-2 glass hover:bg-red-500/20 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </div>
  );
}