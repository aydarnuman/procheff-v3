"use client";

import { useState } from "react";
import { IntegrationConfig } from "@/lib/integrations/integration-service";
import { CheckCircle, XCircle, RefreshCw, Settings, TestTube } from "lucide-react";
import { toast } from "sonner";

interface IntegrationToggleProps {
  integration: IntegrationConfig;
  onToggle: (enabled: boolean) => Promise<void>;
  onTest: () => Promise<void>;
  onConfigure: () => void;
}

export function IntegrationToggle({
  integration,
  onToggle,
  onTest,
  onConfigure,
}: IntegrationToggleProps) {
  const [toggling, setToggling] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      await onToggle(!integration.enabled);
    } finally {
      setToggling(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await onTest();
    } finally {
      setTesting(false);
    }
  };

  const getIntegrationInfo = () => {
    switch (integration.service) {
      case "ihalebul":
        return {
          name: "İhalebul",
          description: "Tender data synchronization",
          icon: "🏛️",
          color: "indigo",
        };
      case "google_sheets":
        return {
          name: "Google Sheets",
          description: "Export data to spreadsheets",
          icon: "📊",
          color: "green",
        };
      case "slack":
        return {
          name: "Slack",
          description: "Team notifications",
          icon: "💬",
          color: "purple",
        };
      case "discord":
        return {
          name: "Discord",
          description: "Community notifications",
          icon: "🎮",
          color: "blue",
        };
      case "zapier":
        return {
          name: "Zapier",
          description: "Workflow automation",
          icon: "⚡",
          color: "orange",
        };
      default:
        return {
          name: integration.service,
          description: "Third-party integration",
          icon: "🔗",
          color: "gray",
        };
    }
  };

  const info = getIntegrationInfo();

  return (
    <div className={`p-4 bg-white/5 border border-white/10 rounded-lg hover:border-${info.color}-500/30 transition-all`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-${info.color}-500/20 text-2xl`}>
            {info.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-gray-200">{info.name}</h3>
              {integration.enabled ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-500" />
              )}
              {integration.sync_status && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    integration.sync_status === "success"
                      ? "bg-green-500/20 text-green-300"
                      : integration.sync_status === "failed"
                      ? "bg-red-500/20 text-red-300"
                      : "bg-yellow-500/20 text-yellow-300"
                  }`}
                >
                  {integration.sync_status}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-2">{info.description}</p>
            {integration.last_sync && (
              <p className="text-xs text-gray-600">
                Last sync: {new Date(integration.last_sync).toLocaleString("tr-TR")}
              </p>
            )}
            {integration.error_message && (
              <p className="text-xs text-red-400 mt-1">{integration.error_message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTest}
            disabled={!integration.enabled || testing}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            title="Test connection"
          >
            {testing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <TestTube className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onConfigure}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Configure"
          >
            <Settings className="w-4 h-4" />
          </button>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={integration.enabled}
              onChange={handleToggle}
              disabled={toggling}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
}