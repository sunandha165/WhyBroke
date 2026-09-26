import type { CommitInfo } from '../types';

interface CommitCardProps {
  label: string;
  commit: CommitInfo;
  variant: 'good' | 'bad';
}

export default function CommitCard({ label, commit, variant }: CommitCardProps) {
  return (
    <div className={`commit-card ${variant}`}>
      <div className="commit-card-label">{label}</div>
      <div className="commit-hash">{commit.shortHash}</div>
      <div className="commit-message">{commit.message}</div>
      <div className="commit-meta">
        {commit.author} · {new Date(commit.date).toLocaleString()}
      </div>
    </div>
  );
}
