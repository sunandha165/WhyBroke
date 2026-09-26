import type { CodeChange } from '../types';

interface EvidenceCardProps {
  change: CodeChange;
}

export default function EvidenceCard({ change }: EvidenceCardProps) {
  const isDirect = change.directlyImported;
  return (
    <div className={`evidence-card${isDirect ? ' direct' : ''}`}>
      <span className="evidence-icon">{isDirect ? '⚡' : '△'}</span>
      <div className="evidence-body">
        <div className="evidence-file">{change.file}</div>
        <div className="evidence-fn">{change.functionName}()</div>
        <div className="evidence-label">function body changed</div>
      </div>
      {isDirect && <span className="evidence-badge">Imported by test</span>}
    </div>
  );
}
