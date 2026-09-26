import { LLMProvider } from './LLMProvider';
import { MockLLMProvider } from './MockLLMProvider';

/**
 * Returns the active LLMProvider. Today this always returns the
 * deterministic MockLLMProvider, which guarantees the demo works fully
 * offline with no API key. This is the single place a real provider (IBM
 * Bob, Claude, etc.) would be wired in behind the same LLMProvider
 * interface - nothing else in the investigation pipeline would need to
 * change.
 */
export function getLLMProvider(): LLMProvider {
  return new MockLLMProvider();
}

export type { LLMProvider, ExplanationInput } from './LLMProvider';
