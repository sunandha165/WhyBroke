import { useRef, useState } from 'react';
import Hero from './components/Hero';
import Timeline from './components/Timeline';
import RegressionReportView from './components/RegressionReportView';
import ErrorBanner from './components/ErrorBanner';
import { runInvestigation } from './services/api';
import type { InvestigateParams } from './services/api';
import type { RegressionReport } from './types';

type Status = 'idle' | 'running' | 'done' | 'error';

// Display order for the investigation timeline. The backend produces its
// own timeline entries independently (see server/src/controllers/
// investigationController.ts) with matching step names; this array only
// controls the order and pacing they're revealed in on screen.
const STEP_LABELS = [
  'Test executed',
  'Failure detected',
  'Git history analyzed',
  'Candidate commits inspected',
  'First bad commit identified',
  'Code diff analyzed',
  'Test relationship analyzed',
  'Root cause generated',
];

export default function App() {
  const [status, setStatus] = useState<Status>('idle');
  const [report, setReport] = useState<RegressionReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const revealTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function handleInvestigate(params?: InvestigateParams) {
    setStatus('running');
    setError(null);
    setReport(null);
    setVisibleSteps(0);

    // Reveal timeline steps progressively while the real investigation runs
    // on the backend, so the UI never sits on a blank screen during the
    // few seconds the bisect + evidence pipeline takes.
    revealTimer.current = setInterval(() => {
      setVisibleSteps((n) => Math.min(n + 1, STEP_LABELS.length - 1));
    }, 350);

    try {
      const result = await runInvestigation(params);
      if (revealTimer.current) clearInterval(revealTimer.current);
      setVisibleSteps(STEP_LABELS.length);
      setReport(result);
      setStatus('done');
    } catch (err) {
      if (revealTimer.current) clearInterval(revealTimer.current);
      setError(err instanceof Error ? err.message : 'Investigation failed.');
      setStatus('error');
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-header-brand">
          <span className="app-header-logo">WHYBROKE</span>
        </span>
        <div className="app-header-status">
          <span className="status-dot" />
          Engine ready
        </div>
      </header>

      <main className="app-main">
        <Hero onInvestigate={handleInvestigate} isRunning={status === 'running'} />

        {status !== 'idle' && (
          <Timeline
            labels={STEP_LABELS}
            visibleCount={status === 'done' ? STEP_LABELS.length : visibleSteps + 1}
            serverTimeline={report?.timeline}
          />
        )}

        {status === 'error' && error && <ErrorBanner message={error} />}
        {status === 'done' && report && <RegressionReportView report={report} />}
      </main>
    </div>
  );
}
