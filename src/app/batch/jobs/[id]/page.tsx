"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface BatchJob {
  id: string;
  user_id: string | null;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  priority: "high" | "normal" | "low";
  total_files: number;
  processed_files: number;
  failed_files: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
}

interface BatchFile {
  id: string;
  batch_id: string;
  filename: string;
  file_size: number;
  file_hash: string;
  status: "pending" | "processing" | "completed" | "failed" | "skipped";
  progress: number;
  result: string | null;
  error: string | null;
  retry_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export default function BatchJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [job, setJob] = useState<BatchJob | null>(null);
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobDetails();
    const interval = setInterval(() => {
      if (job?.status === "processing" || job?.status === "pending") {
        fetchJobDetails();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [resolvedParams.id, job?.status]);

  const fetchJobDetails = async () => {
    try {
      const response = await fetch(`/api/batch/jobs/${resolvedParams.id}`);
      const result = await response.json();
      if (result.success) {
        setJob(result.data.job);
        setFiles(result.data.files);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  const progress = Math.round((job.processed_files / job.total_files) * 100);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <button onClick={() => router.push("/batch/jobs")} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4">
          <ArrowLeft className="w-5 h-5" />
          Geri
        </button>
        
        <h1 className="h1 mb-8">Batch İşlem Detayı</h1>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="glass-card">
            <p className="text-sm text-gray-400">Durum</p>
            <p className="text-xl font-bold">{job.status}</p>
          </div>
          <div className="glass-card">
            <p className="text-sm text-gray-400">İlerleme</p>
            <p className="text-xl font-bold">{job.processed_files}/{job.total_files}</p>
          </div>
          <div className="glass-card">
            <p className="text-sm text-gray-400">Başarısız</p>
            <p className="text-xl font-bold text-red-400">{job.failed_files}</p>
          </div>
          <div className="glass-card">
            <p className="text-sm text-gray-400">Öncelik</p>
            <p className="text-xl font-bold">{job.priority}</p>
          </div>
        </div>

        <div className="glass-card mb-8">
          <div className="w-full bg-gray-700 rounded-full h-4">
            <div className="bg-gradient-to-r from-indigo-500 to-pink-500 h-4 rounded-full" style={{ width: progress + '%' }} />
          </div>
          <p className="text-sm text-gray-400 mt-2">{progress}% tamamlandı</p>
        </div>

        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4">Dosyalar ({files.length})</h3>
          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5" />
                  <span>{file.filename}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: file.progress + '%' }} />
                  </div>
                  <span className="text-sm text-gray-400">{file.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
