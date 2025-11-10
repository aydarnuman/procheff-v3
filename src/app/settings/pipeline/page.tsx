"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Save,
  RotateCcw,
  AlertCircle,
  Check,
  Settings2,
  Zap,
  Shield,
  RefreshCw,
} from "lucide-react";
import { PIPELINE_CONFIG } from "@/lib/jobs/pipeline-config";

export default function PipelineConfigPage() {
  const [config, setConfig] = useState(PIPELINE_CONFIG);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In production, this would save to a database or config file
    console.log("Saving config:", config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setConfig(PIPELINE_CONFIG);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-500/20 p-3">
              <Settings2 className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Pipeline Configuration
              </h1>
              <p className="text-gray-400">
                Customize your automated pipeline behavior
              </p>
            </div>
          </div>
        </div>

        {/* Save Banner */}
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 glass-card border-emerald-500/30 bg-emerald-500/10"
          >
            <div className="flex items-center gap-3 p-4">
              <Check className="h-5 w-5 text-emerald-400" />
              <p className="text-emerald-300">Configuration saved successfully!</p>
            </div>
          </motion.div>
        )}

        <div className="space-y-6">
          {/* General Settings */}
          <div className="glass-card">
            <div className="border-b border-slate-800 p-4">
              <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                General Settings
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Parallel Steps
                  </label>
                  <p className="text-xs text-gray-500">
                    Run multiple pipeline steps simultaneously
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.settings.parallelSteps}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        settings: {
                          ...config.settings,
                          parallelSteps: e.target.checked,
                        },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Stop on Error
                  </label>
                  <p className="text-xs text-gray-500">
                    Halt pipeline execution when a required step fails
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.settings.stopOnError}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        settings: {
                          ...config.settings,
                          stopOnError: e.target.checked,
                        },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Save Snapshots
                  </label>
                  <p className="text-xs text-gray-500">
                    Save intermediate results to database
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.settings.saveSnapshots}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        settings: {
                          ...config.settings,
                          saveSnapshots: e.target.checked,
                        },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Enable Auto Resume
                  </label>
                  <p className="text-xs text-gray-500">
                    Automatically resume interrupted pipelines
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.settings.enableAutoResume}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        settings: {
                          ...config.settings,
                          enableAutoResume: e.target.checked,
                        },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="glass-card">
            <div className="border-b border-slate-800 p-4">
              <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-400" />
                Notification Preferences
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    On Pipeline Start
                  </label>
                  <p className="text-xs text-gray-500">
                    Notify when pipeline execution begins
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.notifications.onStart}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        notifications: {
                          ...config.notifications,
                          onStart: e.target.checked,
                        },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    On Step Complete
                  </label>
                  <p className="text-xs text-gray-500">
                    Notify after each step finishes
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.notifications.onStepComplete}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        notifications: {
                          ...config.notifications,
                          onStepComplete: e.target.checked,
                        },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    On Pipeline Complete
                  </label>
                  <p className="text-xs text-gray-500">
                    Notify when entire pipeline finishes
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.notifications.onComplete}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        notifications: {
                          ...config.notifications,
                          onComplete: e.target.checked,
                        },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    On Error
                  </label>
                  <p className="text-xs text-gray-500">
                    Notify when an error occurs
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.notifications.onError}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        notifications: {
                          ...config.notifications,
                          onError: e.target.checked,
                        },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    On Warning
                  </label>
                  <p className="text-xs text-gray-500">
                    Notify when a warning is generated
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.notifications.onWarning}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        notifications: {
                          ...config.notifications,
                          onWarning: e.target.checked,
                        },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Pipeline Steps Overview */}
          <div className="glass-card">
            <div className="border-b border-slate-800 p-4">
              <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-400" />
                Pipeline Steps ({config.steps.length})
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                {config.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-medium text-indigo-300">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-200">
                          {step.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Timeout: {step.timeout / 1000}s • Max Retries:{" "}
                          {step.maxRetries}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {step.required ? (
                        <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-300">
                          Required
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-500/20 px-2.5 py-0.5 text-xs font-medium text-gray-400">
                          Optional
                        </span>
                      )}
                      {step.fallbackModel && (
                        <span className="rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-xs font-medium text-yellow-300">
                          Fallback
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              className="btn-gradient flex items-center gap-2 px-6 py-3"
            >
              <Save className="h-4 w-4" />
              Save Configuration
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-6 py-3 text-sm font-medium text-gray-300 hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Default
            </button>
          </div>

          {/* Info Card */}
          <div className="glass-card border-blue-500/30 bg-blue-500/10">
            <div className="flex items-start gap-3 p-4">
              <RefreshCw className="h-5 w-5 shrink-0 text-blue-400" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-300">
                  Configuration Reload Required
                </p>
                <p className="text-xs text-blue-300/70">
                  Changes to pipeline configuration require a server restart to take effect.
                  For production deployments, update the{" "}
                  <code className="rounded bg-slate-900/50 px-1 py-0.5">
                    src/config/pipeline.json
                  </code>{" "}
                  file directly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
