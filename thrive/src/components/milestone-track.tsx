/** Visual milestone tracker (FR-43, SRS Figure 6.4 — student progress bar). */

import clsx from 'clsx';
import { STAGES } from '@/lib/workflow';
import { ProgressBar, formatDate } from './ui';
import { Icon } from './icons';

type MilestoneRow = {
  stageKey: string;
  name: string;
  sequence: number;
  status: string;
  approvedAt: Date | null;
};

export function MilestoneTrack({
  milestones,
  currentStage,
}: {
  milestones: MilestoneRow[];
  currentStage: string;
}) {
  const ordered = [...milestones].sort((a, b) => a.sequence - b.sequence);
  const approved = ordered.filter((m) => m.status === 'APPROVED');
  const percent = Math.round((approved.length / STAGES.length) * 100);

  return (
    <div>
      <ProgressBar percent={percent} label={`${approved.length} of ${STAGES.length} milestones approved`} />

      <ol className="stagger mt-6 space-y-0">
        {ordered.map((milestone, index) => {
          const isCurrent = milestone.stageKey === currentStage;
          const isApproved = milestone.status === 'APPROVED';
          const isLocked = milestone.status === 'LOCKED';
          const isLast = index === ordered.length - 1;

          return (
            <li key={milestone.stageKey} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={clsx(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 transition duration-300',
                    isApproved && 'bg-csu-600 text-white ring-csu-600',
                    // The stage in play gets a slow halo so the eye lands on it first.
                    isCurrent && !isApproved && 'animate-pulse-ring bg-white text-csu-700 ring-2 ring-csu-500',
                    isLocked && 'bg-slate-100 text-slate-400 ring-slate-200',
                    !isApproved && !isCurrent && !isLocked && 'bg-white text-slate-500 ring-slate-300',
                  )}
                >
                  {isApproved ? <Icon name="check" className="h-4 w-4" /> : isLocked ? <Icon name="lock" className="h-3.5 w-3.5" /> : milestone.sequence}
                </span>
                {!isLast && <span className={clsx('w-px flex-1', isApproved ? 'bg-csu-300' : 'bg-slate-200')} />}
              </div>

              <div className={clsx('min-w-0 flex-1', isLast ? 'pb-0' : 'pb-6')}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p
                    className={clsx(
                      'text-sm font-medium',
                      isLocked ? 'text-slate-400' : 'text-slate-900',
                    )}
                  >
                    {milestone.name}
                  </p>
                  {isCurrent && (
                    <span className="rounded-full bg-csu-50 px-2 py-0.5 text-[11px] font-semibold text-csu-700 ring-1 ring-inset ring-csu-200">
                      Current stage
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isApproved
                    ? `Approved ${formatDate(milestone.approvedAt)}`
                    : isLocked
                      ? 'Locked until the previous milestone is approved'
                      : STAGES.find((s) => s.key === milestone.stageKey)?.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
