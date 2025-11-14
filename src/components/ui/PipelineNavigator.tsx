'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PipelineProgress } from '@/components/ui/PipelineProgress';
import { usePipelineStore } from '@/store/usePipelineStore';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PipelineStep = 'tender' | 'menu' | 'cost' | 'decision' | 'report';

interface PipelineNavigatorProps {
  currentStep: PipelineStep;
  enableNext?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  className?: string;
}

const stepConfig = {
  tender: {
    label: 'İhale Seçimi',
    path: '/ihale',
    next: 'menu' as PipelineStep,
    nextLabel: 'Menü Yükleme'
  },
  menu: {
    label: 'Menü Yükleme',
    path: '/menu-robot',
    next: 'cost' as PipelineStep,
    nextLabel: 'Maliyet Analizi',
    previous: 'tender' as PipelineStep
  },
  cost: {
    label: 'Maliyet Analizi',
    path: '/cost-analysis',
    next: 'decision' as PipelineStep,
    nextLabel: 'Karar Verme',
    previous: 'menu' as PipelineStep
  },
  decision: {
    label: 'Karar Verme',
    path: '/decision',
    next: 'report' as PipelineStep,
    nextLabel: 'Rapor Oluştur',
    previous: 'cost' as PipelineStep
  },
  report: {
    label: 'Rapor',
    path: '/reports',
    previous: 'decision' as PipelineStep
  }
};

export function PipelineNavigator({
  currentStep,
  enableNext = false,
  onNext,
  onPrevious,
  className
}: PipelineNavigatorProps) {
  const router = useRouter();
  const { completedSteps } = usePipelineStore();
  const current = stepConfig[currentStep];

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else if ('next' in current && current.next) {
      router.push(stepConfig[current.next as PipelineStep].path);
    }
  };

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
    } else if ('previous' in current && current.previous) {
      router.push(stepConfig[current.previous as PipelineStep].path);
    }
  };

  return (
    <div className={cn("glass-card rounded-xl p-6", className)}>
      {/* Pipeline Progress Bar */}
      <div className="mb-6">
        <PipelineProgress />
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between gap-4">
        {/* Previous Button */}
        <Button
          onClick={handlePrevious}
          variant="outline"
          disabled={!('previous' in current) || !(current as any).previous}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">
            {'previous' in current && (current as any).previous && stepConfig[(current as any).previous as PipelineStep].label}
          </span>
          <span className="sm:hidden">Geri</span>
        </Button>

        {/* Current Step Indicator */}
        <div className="flex-1 text-center">
          <div className="text-sm text-slate-400">Mevcut Aşama</div>
          <div className="text-lg font-semibold text-white flex items-center justify-center gap-2">
            {completedSteps.includes(currentStep as any) && (
              <CheckCircle className="w-5 h-5 text-green-400" />
            )}
            {current.label}
          </div>
        </div>

        {/* Next Button */}
        {'next' in current && (current as any).next && (
          <Button
            onClick={handleNext}
            disabled={!enableNext}
            className="btn-gradient flex items-center gap-2"
          >
            <span className="hidden sm:inline">{(current as any).nextLabel}</span>
            <span className="sm:hidden">İleri</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Helper Text */}
      {!enableNext && 'next' in current && (current as any).next && (
        <div className="mt-4 text-center">
          <p className="text-sm text-yellow-400">
            Sonraki adıma geçmek için bu aşamayı tamamlayın
          </p>
        </div>
      )}
    </div>
  );
}