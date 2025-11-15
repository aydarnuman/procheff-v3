/**
 * Auto-Resume Hook
 *
 * Automatically resumes pipeline execution if user refreshes page
 * Uses localStorage to persist job ID
 */

import { useEffect, useState } from "react";

const STORAGE_KEY = "procheff_last_job_id";

export function useAutoResume() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(false);

  const resumeJob = async (savedJobId: string) => {
    setIsResuming(true);
    setJobId(savedJobId);

    try {
      // Verify job is still active
      const res = await fetch(`/api/orchestrate/status?jobId=${savedJobId}`);
      const data = await res.json();

      if (data.success && data.data.status === "running") {
        // Job is still active, resume
        console.log(`📦 Resuming job: ${savedJobId}`);
      } else {
        // Job completed or failed, clear storage
        localStorage.removeItem(STORAGE_KEY);
        setJobId(null);
      }
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
      setJobId(null);
    } finally {
      setIsResuming(false);
    }
  };

  useEffect(() => {
    // Try to resume from localStorage
    if (typeof window !== "undefined") {
      const savedJobId = localStorage.getItem(STORAGE_KEY);
      if (savedJobId) {
        resumeJob(savedJobId);
      }
    }
  }, []);

  const saveJobId = (id: string) => {
    setJobId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
    }
  };

  const clearJobId = () => {
    setJobId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return {
    jobId,
    isResuming,
    saveJobId,
    clearJobId,
  };
}
