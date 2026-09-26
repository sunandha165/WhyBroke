import type { Confidence } from '../types';

export default function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return <span className={`confidence-badge ${confidence.toLowerCase()}`}>{confidence} confidence</span>;
}
