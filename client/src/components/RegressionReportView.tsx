import type { RegressionReport } from '../types';
import CommitCard from './CommitCard';
import DiffView from './DiffView';
import EvidenceCard from './EvidenceCard';
import ConfidenceBadge from './ConfidenceBadge';

interface RegressionReportViewProps {
  report: RegressionReport;
}

export default function RegressionReportView({ report }: RegressionReportViewProps) {
  return (
    <section className="report" aria-label="Regression report">
      <div className="report-header">
        <h2>Regression Report</h2>
        <ConfidenceBadge confidence={report.rootCause.confidence} />
      </div>

      {/* Stats */}
      <div className="report-stats">
        <div className="stat">
          <span className="stat-value">{report.commitsAnalyzed}</span>
          <span className="stat-label">commits analyzed</span>
        </div>
        <div className="stat">
          <span className="stat-value">{report.testRunsExecuted}</span>
          <span className="stat-label">test runs executed</span>
        </div>
        <div className="stat">
          <span className="stat-value" style={{ color: report.finalStatus === 'failed' ? 'var(--bad)' : 'var(--good)' }}>
            {report.finalStatus === 'failed' ? 'FAIL' : 'PASS'}
          </span>
          <span className="stat-label">HEAD status</span>
        </div>
      </div>

      {/* Commit boundary */}
      <div className="report-section-title">Regression Boundary</div>
      <div className="commit-pair">
        <CommitCard label="Last Good Commit" commit={report.lastGoodCommit} variant="good" />
        <CommitCard label="First Bad Commit" commit={report.firstBadCommit} variant="bad" />
      </div>

      {/* Root cause */}
      <div className="report-section-title">Root Cause</div>
      <div className="root-cause-card">
        <p>{report.rootCause.explanation}</p>
      </div>

      {/* Evidence */}
      {report.evidence.length > 0 && (
        <>
          <div className="report-section-title">Evidence</div>
          <div className="evidence-list">
            {report.evidence.map((change) => (
              <EvidenceCard key={`${change.file}-${change.functionName}`} change={change} />
            ))}
          </div>

          <div className="diff-section">
            {report.evidence.map((change) => (
              <DiffView key={`${change.file}-${change.functionName}-diff`} change={change} />
            ))}
          </div>
        </>
      )}

      {/* Suggested fix */}
      <div className="report-section-title">Suggested Fix</div>
      <p className="suggested-fix">{report.rootCause.suggestedFix}</p>
    </section>
  );
}
