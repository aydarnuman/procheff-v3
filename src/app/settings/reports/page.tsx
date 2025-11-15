"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, History, RefreshCw, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { TemplateCard } from "@/components/reports/TemplateCard";
import { TemplateBuilder } from "@/components/reports/TemplateBuilder";
import { HistoryTable } from "@/components/reports/HistoryTable";
import { ReportTemplate } from "@/lib/reports/service";
import { toast } from "sonner";

export default function ReportSettingsPage() {
  const [activeTab, setActiveTab] = useState<"templates" | "history">("templates");
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | undefined>();
  const [generating, setGenerating] = useState<number | null>(null);

  useEffect(() => {
    loadTemplates();
    loadHistory();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await fetch("/api/settings/reports/templates");
      const data = await res.json();

      if (data.success) {
        setTemplates(data.templates);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
      toast.error("Şablonlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/settings/reports/history");
      const data = await res.json();

      if (data.success) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  };

  const handleSaveTemplate = async (templateData: Partial<ReportTemplate>) => {
    try {
      const isUpdate = editingTemplate?.id;
      const url = isUpdate
        ? `/api/settings/reports/templates/${editingTemplate.id}`
        : "/api/settings/reports/templates";

      const res = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templateData),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(isUpdate ? "Şablon güncellendi" : "Şablon oluşturuldu");
        setShowBuilder(false);
        setEditingTemplate(undefined);
        loadTemplates();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Failed to save template:", error);
      toast.error("Şablon kaydedilemedi");
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("Bu şablonu silmek istediğinizden emin misiniz?")) {
      return;
    }

    try {
      const res = await fetch(`/api/settings/reports/templates/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Şablon silindi");
        loadTemplates();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
      toast.error("Şablon silinemedi");
    }
  };

  const handleGenerateReport = async (templateId: number) => {
    setGenerating(templateId);

    try {
      const res = await fetch("/api/settings/reports/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId,
          params: {
            // Add any dynamic params here
            tender_name: "Test İhale",
            organization: "Test Kurum",
            generated_date: new Date().toISOString(),
          },
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Rapor başarıyla oluşturuldu!");

        // Download the report
        if (data.report.downloadUrl) {
          window.open(data.report.downloadUrl, "_blank");
        }

        // Refresh history
        loadHistory();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast.error("Rapor oluşturulamadı");
    } finally {
      setGenerating(null);
    }
  };

  const handleDownloadReport = (item: any) => {
    if (item.downloadUrl) {
      window.open(item.downloadUrl, "_blank");
    }
  };

  const handleEditTemplate = (template: ReportTemplate) => {
    setEditingTemplate(template);
    setShowBuilder(true);
  };

  const handleNewTemplate = () => {
    setEditingTemplate(undefined);
    setShowBuilder(true);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-700 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-48 bg-slate-700 rounded"></div>
            <div className="h-48 bg-slate-700 rounded"></div>
            <div className="h-48 bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Ayarlara Dön
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="h1 flex items-center gap-3">
              <FileText className="w-8 h-8" />
              Rapor Ayarları
            </h1>
            <p className="text-gray-400 mt-2">
              Rapor şablonlarını yönetin ve raporları oluşturun
            </p>
          </div>

          <button
            onClick={() => {
              loadTemplates();
              loadHistory();
            }}
            className="p-3 glass hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab("templates")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "templates"
              ? "bg-indigo-500 text-white"
              : "glass hover:bg-slate-700"
          }`}
        >
          Şablonlar ({templates.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "history"
              ? "bg-indigo-500 text-white"
              : "glass hover:bg-slate-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Geçmiş ({history.length})
          </div>
        </button>
      </div>

      {/* Content */}
      {activeTab === "templates" ? (
        <div>
          {/* Add Template Button */}
          <button
            onClick={handleNewTemplate}
            className="mb-6 btn-gradient py-3 px-6 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Yeni Şablon Oluştur
          </button>

          {/* Templates Grid */}
          {templates.length === 0 ? (
            <div className="glass-card text-center py-12">
              <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">Henüz şablon oluşturulmamış</p>
              <button
                onClick={handleNewTemplate}
                className="btn-gradient py-2 px-4 rounded-lg"
              >
                İlk Şablonu Oluştur
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={handleEditTemplate}
                  onDelete={handleDeleteTemplate}
                  onGenerate={handleGenerateReport}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <HistoryTable history={history} onDownload={handleDownloadReport} />
        </div>
      )}

      {/* Template Builder Modal */}
      {showBuilder && (
        <TemplateBuilder
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => {
            setShowBuilder(false);
            setEditingTemplate(undefined);
          }}
        />
      )}

      {/* Generating Overlay */}
      {generating !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p className="text-lg font-medium">Rapor oluşturuluyor...</p>
            <p className="text-sm text-gray-400 mt-2">Lütfen bekleyin</p>
          </div>
        </div>
      )}
    </div>
  );
}
