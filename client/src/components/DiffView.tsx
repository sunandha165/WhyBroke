import type { CodeChange } from '../types';

interface DiffViewProps {
  change: CodeChange;
}

export default function DiffView({ change }: DiffViewProps) {
  return (
    <div className="diff-view">
      <div className="diff-view-header">
        <span className="diff-view-file">{change.file}</span>
        <span className="diff-view-fn">{change.functionName}()</span>
      </div>
      <div className="diff-columns">
        <div className="diff-col">
          <div className="diff-col-title before-title">Before · last good commit</div>
          <pre className="code-block before">{change.before}</pre>
        </div>
        <div className="diff-col">
          <div className="diff-col-title after-title">After · first bad commit</div>
          <pre className="code-block after">{change.after}</pre>
        </div>
      </div>
    </div>
  );
}
