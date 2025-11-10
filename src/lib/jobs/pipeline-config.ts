import pipelineConfigJSON from "@/config/pipeline.json";

export interface PipelineStep {
  id: string;
  name: string;
  path: string;
  method: "POST" | "GET";
  required: boolean;
  timeout: number;
  retryable: boolean;
  maxRetries: number;
  fallbackModel?: string;
  icon: string;
  progressWeight: number;
}

export interface PipelineConfig {
  version: string;
  name: string;
  description: string;
  steps: PipelineStep[];
  notifications: {
    onStart: boolean;
    onStepComplete: boolean;
    onComplete: boolean;
    onError: boolean;
    onWarning: boolean;
  };
  settings: {
    parallelSteps: boolean;
    stopOnError: boolean;
    saveSnapshots: boolean;
    enableAutoResume: boolean;
  };
}

export const PIPELINE_CONFIG: PipelineConfig = pipelineConfigJSON as PipelineConfig;

export function getPipelineStep(stepId: string): PipelineStep | undefined {
  return PIPELINE_CONFIG.steps.find((s) => s.id === stepId);
}

export function getRequiredSteps(): PipelineStep[] {
  return PIPELINE_CONFIG.steps.filter((s) => s.required);
}

export function getOptionalSteps(): PipelineStep[] {
  return PIPELINE_CONFIG.steps.filter((s) => !s.required);
}

export function calculateProgress(completedSteps: string[]): number {
  const completedWeight = PIPELINE_CONFIG.steps
    .filter((s) => completedSteps.includes(s.id))
    .reduce((sum, s) => sum + s.progressWeight, 0);

  const totalWeight = PIPELINE_CONFIG.steps.reduce(
    (sum, s) => sum + s.progressWeight,
    0
  );

  return Math.round((completedWeight / totalWeight) * 100);
}
