import { AlertTriangle, CheckCircle2, Circle, Clock3 } from 'lucide-react';

export type FinancialLifecycleStageState =
  | 'complete'
  | 'current'
  | 'pending'
  | 'blocked';

export interface FinancialLifecycleStage {
  id: string;
  label: string;
  state: FinancialLifecycleStageState;
  hint?: string;
}

interface FinancialLifecycleProgressProps {
  locale: 'ar' | 'en';
  title: string;
  nextAction: string;
  stages: FinancialLifecycleStage[];
  compact?: boolean;
}

const stateClass: Record<FinancialLifecycleStageState, string> = {
  complete: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  current:
    'border-[var(--orca-action-gold)] bg-[var(--orca-action-gold-soft)] text-[var(--orca-action-gold)]',
  pending: 'border-white/10 bg-white/[0.035] text-[var(--nc-text-dim)]',
  blocked: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
};

const stateIcon = {
  complete: CheckCircle2,
  current: Clock3,
  pending: Circle,
  blocked: AlertTriangle,
};

export default function FinancialLifecycleProgress({
  locale,
  title,
  nextAction,
  stages,
  compact = false,
}: FinancialLifecycleProgressProps) {
  const isArabic = locale === 'ar';

  return (
    <section
      className={`rounded-2xl border border-white/10 bg-black/10 ${compact ? 'p-3' : 'p-4'}`}
      data-financial-lifecycle-progress
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xs font-black text-white">{title}</h3>
        <p className="text-[10px] text-[var(--nc-text-dim)]">
          <span className="font-bold text-[var(--orca-action-gold)]">
            {isArabic ? 'الإجراء التالي: ' : 'Next action: '}
          </span>
          {nextAction}
        </p>
      </div>

      <div className="mt-3 flex min-w-max items-stretch gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {stages.map((stage, index) => {
          const Icon = stateIcon[stage.state];
          return (
            <div key={stage.id} className="flex items-center gap-1">
              <div
                className={`min-w-[118px] rounded-xl border px-3 py-2 ${stateClass[stage.state]}`}
                title={stage.hint}
              >
                <div className="flex items-center gap-1.5">
                  <Icon size={13} />
                  <span className="text-[10px] font-black">{stage.label}</span>
                </div>
                {stage.hint && (
                  <span className="mt-1 block max-w-[150px] truncate text-[9px] opacity-75">
                    {stage.hint}
                  </span>
                )}
              </div>
              {index < stages.length - 1 && (
                <span className="px-0.5 text-[10px] text-[var(--nc-text-disabled)]">
                  {isArabic ? '←' : '→'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
