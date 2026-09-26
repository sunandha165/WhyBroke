import type { TimelineStepData } from '../types';

interface TimelineProps {
  labels: string[];
  visibleCount: number;
  serverTimeline?: TimelineStepData[];
}

function findServerStep(label: string, serverTimeline?: TimelineStepData[]): TimelineStepData | undefined {
  if (!serverTimeline) return undefined;
  const key = label.toLowerCase();
  return serverTimeline.find((s) => s.step.toLowerCase() === key);
}

export default function Timeline({ labels, visibleCount, serverTimeline }: TimelineProps) {
  return (
    <ol className="timeline" aria-label="Investigation progress">
      {labels.map((label, i) => {
        const revealed = i < visibleCount;
        const serverStep = findServerStep(label, serverTimeline);
        const errored = serverStep?.status === 'error';
        return (
          <li
            key={label}
            className={`timeline-item ${revealed ? 'revealed' : 'pending'} ${errored ? 'errored' : ''}`}
          >
            <span className="timeline-index">{errored ? '!' : i + 1}</span>
            <div>
              <div className="timeline-label">{label}</div>
              {revealed && serverStep && <div className="timeline-detail">{serverStep.detail}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
