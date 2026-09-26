import { useState } from 'react';
import type { InvestigateParams } from '../services/api';

interface HeroProps {
  onInvestigate: (params?: InvestigateParams) => void;
  isRunning: boolean;
}

const WORKFLOW_STEPS = [
  { icon: '✕', label: 'TEST' },
  { icon: '⟶', label: 'HISTORY' },
  { icon: '⟶', label: 'BISECT' },
  { icon: '⟶', label: 'ROOT CAUSE' },
  { icon: '⟶', label: 'EVIDENCE' },
];

export default function Hero({ onInvestigate, isRunning }: HeroProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [repoPath, setRepoPath] = useState('');
  const [testFile, setTestFile] = useState('');
  const [sourceFiles, setSourceFiles] = useState('');

  function handleCustomInvestigate(e: React.FormEvent) {
    e.preventDefault();
    const params: InvestigateParams = {
      repoPath: repoPath.trim(),
      testFile: testFile.trim(),
      sourceFiles: sourceFiles
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    onInvestigate(params);
  }

  return (
    <header className="hero">
      <div className="hero-eyebrow">Automated regression root-cause analysis</div>

      <h1 className="hero-title">WHYBROKE</h1>

      <p className="hero-tagline">
        Git tells you <strong>WHAT</strong> changed.
        <br />
        WhyBroke tells you <strong>WHY</strong> it broke.
      </p>

      <div className="hero-workflow" aria-hidden="true">
        {WORKFLOW_STEPS.map((step, i) => (
          <span key={step.label}>
            {i > 0 && <span className="workflow-arrow">›</span>}
            <span className="workflow-step">
              <span className="workflow-step-icon">{step.icon}</span>
              {step.label}
            </span>
          </span>
        ))}
      </div>

      <div className="hero-actions">
        <button
          className={`investigate-btn${isRunning && !showCustom ? ' running' : ''}`}
          onClick={() => onInvestigate()}
          disabled={isRunning}
        >
          {isRunning && !showCustom ? 'Investigating…' : 'Investigate Demo Regression'}
        </button>

        <button
          className="toggle-custom-btn"
          onClick={() => setShowCustom((v) => !v)}
          disabled={isRunning}
          aria-expanded={showCustom}
        >
          {showCustom ? '▲ Hide custom repository' : '▼ Investigate a real repository'}
        </button>
      </div>

      {showCustom && (
        <form className="custom-repo-form" onSubmit={handleCustomInvestigate} aria-label="Custom repository form">
          <p className="custom-form-title">Investigate a real repository</p>
          <p className="custom-repo-note">
            Point WhyBroke at any local Git repository. The investigation reads files via{' '}
            <code>git show</code> and never modifies your repository.
          </p>
          <label className="custom-field">
            <span>Repository path (absolute)</span>
            <input
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="C:\Users\you\projects\my-app"
              required
              disabled={isRunning}
            />
          </label>
          <label className="custom-field">
            <span>Test file (relative to repo root)</span>
            <input
              type="text"
              value={testFile}
              onChange={(e) => setTestFile(e.target.value)}
              placeholder="test/my.test.js"
              required
              disabled={isRunning}
            />
          </label>
          <label className="custom-field">
            <span>Source files to diff (comma-separated, relative to repo root)</span>
            <input
              type="text"
              value={sourceFiles}
              onChange={(e) => setSourceFiles(e.target.value)}
              placeholder="src/checkout.js, src/utils.js"
              required
              disabled={isRunning}
            />
          </label>
          <p className="custom-repo-requirement">
            Requirement: the test file must run with plain <code>node &lt;testfile&gt;</code> (no npm
            install needed). The test must currently fail at HEAD and have at least one passing commit in
            history.
          </p>
          <button type="submit" className={`investigate-btn${isRunning && showCustom ? ' running' : ''}`} disabled={isRunning}>
            {isRunning && showCustom ? 'Investigating…' : 'Investigate This Repository'}
          </button>
        </form>
      )}
    </header>
  );
}
