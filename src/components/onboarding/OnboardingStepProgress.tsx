import { Progress } from '../ui/progress';

interface OnboardingStepProgressProps {
  currentStep: number;
  totalSteps?: number;
  heading?: string;
}

export default function OnboardingStepProgress({
  currentStep,
  totalSteps = 13,
  heading = 'Onboarding progress',
}: OnboardingStepProgressProps) {
  const safeTotal = Math.max(1, totalSteps);
  const safeStep = Math.min(Math.max(1, currentStep), safeTotal);
  const progressPercentage = Math.round((safeStep / safeTotal) * 100);
  const stepsRemaining = Math.max(0, safeTotal - safeStep);

  return (
    <section className="px-4 pb-4 sm:px-6 sm:pb-5" aria-label="Onboarding step progress">
      <div className="relative overflow-hidden rounded-2xl border border-[#2b8cee]/15 bg-gradient-to-br from-white via-slate-50 to-blue-50/60 p-3 shadow-[0_8px_24px_rgba(43,140,238,0.12)] sm:p-4">
        <div className="pointer-events-none absolute -right-5 -top-8 h-20 w-20 rounded-full bg-[#2b8cee]/20 blur-2xl" />

        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 sm:text-xs">
              {heading}
            </p>
            <span className="rounded-full bg-[#2b8cee]/10 px-2 py-1 text-[10px] font-bold text-[#1f6cc7] sm:px-2.5 sm:text-xs">
              {progressPercentage}%
            </span>
          </div>

          <div className="mt-2 flex items-end justify-between gap-2">
            <p className="text-sm font-bold text-slate-900 sm:text-base">
              Step {safeStep} of {safeTotal}
            </p>
            <p className="text-[11px] font-medium text-slate-500 sm:text-xs">
              {stepsRemaining} step{stepsRemaining === 1 ? '' : 's'} left
            </p>
          </div>

          <Progress
            value={progressPercentage}
            className="mt-3 h-2.5 bg-white/90 ring-1 ring-[#2b8cee]/10 sm:h-3"
            indicatorClassName="bg-gradient-to-r from-[#2b8cee] via-[#3a9dff] to-[#57b0ff]"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercentage}
            aria-label={`${progressPercentage} percent complete`}
          />

          <div className="mt-3 flex items-center gap-1.5 sm:gap-2" aria-hidden="true">
            {Array.from({ length: safeTotal }, (_, index) => {
              const stepNumber = index + 1;
              const isComplete = stepNumber <= safeStep;

              return (
                <span
                  key={stepNumber}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    isComplete ? 'bg-[#2b8cee]' : 'bg-slate-200'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
