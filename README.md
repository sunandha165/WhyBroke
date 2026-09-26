# WhyBroke — Regression Investigation AI

**Git tells you WHAT changed. WhyBroke tells you WHY it broke.**

## What is WhyBroke?

WhyBroke is a tool that investigates regressions automatically. Point it at
a repository with a test that used to pass but now fails, and it finds the
exact commit that introduced the failure, shows you the specific code that
changed, and explains — in evidence-backed plain language — why that
change broke that test.

## Problem

A test used to pass, but now it fails. Developers normally have to
manually inspect test failures, Git history, commits, diffs, and related
code to figure out which change introduced the regression. This is slow,
repetitive, and easy to get wrong on a large history.

## Solution

WhyBroke automates the investigation:

```
FAILING TEST
     |
RUN TEST
     |
GIT HISTORY
     |
CANDIDATE COMMITS
     |
FIND FIRST BAD COMMIT   (binary search / bisect)
     |
COMPARE GOOD vs BAD CODE
     |
COLLECT EVIDENCE
     |
CONNECT CODE CHANGE TO FAILING TEST
     |
GENERATE REGRESSION REPORT
```

Every conclusion in the final report is backed by evidence: the actual
commit hash, the actual diff, and the actual function whose behavior
changed — not a guess.

## Why Regression Investigation Matters

Every team with a test suite eventually hits "this used to work, what
changed?" Tracing that manually across dozens of commits costs real time.
Turning that into an automatic, evidence-backed lookup is a small,
concrete productivity win any engineering team recognizes immediately.

## Architecture

```
WhyBroke/
  client/        React + Vite + TypeScript frontend
  server/        Node + Express + TypeScript backend
  demo-repo/     Self-contained demo Git repository with a real regression
  bob_sessions/  IBM Bob development session exports
```

The backend never checks out or mutates the target repository's working
tree. For each candidate commit, it reads the test file and source files
via `git show <hash>:<path>`, writes them into a throwaway temp directory,
and runs the test there with a plain `node` invocation. This is what makes
it safe to run repeatedly and quickly across many commits.

### Regression engine (binary search bisect)

Instead of a linear scan through every commit, `RegressionEngine.bisect()`
binary-searches the commit history: test the oldest commit (expected
passing) and HEAD (expected failing) to establish the search bounds, then
repeatedly test the midpoint and narrow the range until the exact
good/bad boundary commit is found. This takes `O(log n)` test runs instead
of `O(n)`.

### LLM abstraction

```
server/src/services/llm/
  LLMProvider.ts        interface: generateExplanation(evidence) -> string
  MockLLMProvider.ts     deterministic, template-based implementation
  index.ts               factory (currently always returns the mock provider)
```

The deterministic investigation engine (Git analysis, bisect, evidence
building) never depends on an LLM. Only the final "turn evidence into a
readable explanation" step goes through this interface, and today that's
implemented by `MockLLMProvider`, which needs no API key and no network
call. This guarantees the demo works completely offline. A real provider
(IBM Bob, or any other) can be wired in later behind the same
`LLMProvider` interface without touching the investigation logic.

## Technology Stack

| Layer     | Technology                          |
|-----------|--------------------------------------|
| Frontend  | React, Vite, TypeScript              |
| Backend   | Node.js, Express, TypeScript         |
| Testing   | Vitest (+ Supertest for API tests)   |
| Git       | simple-git                           |

No MongoDB, Docker, Redis, authentication, or paid APIs are required.

## How the Investigation Works

1. `GET /api/repository/status` confirms the demo repo is a valid Git
   repository and reports its commit count and HEAD commit.
2. `POST /api/investigate` runs the full pipeline:
   - Loads full commit history (oldest to newest).
   - Binary-searches for the first commit where the test fails
     (`RegressionEngine.bisect`).
   - Reads the source file(s) at the last-good and first-bad commits.
   - Diffs them and extracts which named functions actually changed
     (`EvidenceBuilder`).
   - Cross-references changed functions against the failing test's source
     to link cause and effect.
   - Generates a plain-language explanation from that evidence
     (`LLMProvider`).
   - Returns a complete `RegressionReport` as JSON.
3. The frontend renders the report: last-good vs first-bad commit cards,
   a before/after code comparison, evidence cards, the root-cause
   explanation, and a suggested fix.

## Demo Instructions

```bash
# from the project root
npm install
npm run dev
```

This starts the backend on `http://localhost:4000` and the frontend on
`http://localhost:5173` (Vite's default port; check your terminal output,
it may pick a different port if 5173 is busy). Open the frontend URL,
then click **"Investigate Demo Regression."** No configuration is
required — it automatically targets the bundled `demo-repo/`.

If `demo-repo/.git` is ever missing (e.g. stripped by a zip/transfer
tool), regenerate it with:

```bash
npm run setup:demo
```

### Expected Output

- **Last Good Commit**: `docs: expand processOrder documentation`
- **First Bad Commit**: `feat: return structured order summary from
  formatOrder for the new invoice UI`
- **Root cause**: `formatOrder()` in `src/checkout.js` changed from
  returning a string to returning an object; the test still expects a
  string.
- **Confidence**: High
- **Suggested fix**: revert `formatOrder()`, or update the test to expect
  the new shape.

## API Documentation

### `GET /api/health`
Returns `{ status: "ok", service: "whybroke-server" }`.

### `GET /api/repository/status`
Query params: `repoPath` (optional, defaults to the bundled demo repo).
Returns `RepositoryStatus` (see `server/src/types/index.ts`).

### `POST /api/run-test`
Body: `{ repoPath?, testFile?, sourceFiles?, commitHash? }`.
Runs the test at the given commit (or HEAD if omitted) and returns a
`TestRunResult`.

### `POST /api/investigate`
Body: `{ repoPath?, testFile?, sourceFiles? }` (all optional; defaults to
the bundled demo repo and its checkout test). Returns a full
`RegressionReport` — see `server/src/types/index.ts` for the exact shape.

## Testing Instructions

```bash
npm run test        # runs both server and client test suites
npm run test --workspace=server   # server only
npm run test --workspace=client   # client only
```

Server tests exercise the real demo repository (not mocks) for
`GitService`, `RegressionEngine`, `EvidenceBuilder`, and the full API via
Supertest. Client tests cover the `Hero` component with React Testing
Library.

## Example Regression Report (abridged)

```json
{
  "lastGoodCommit": { "shortHash": "d729c84", "message": "docs: expand processOrder documentation" },
  "firstBadCommit": { "shortHash": "2303d24", "message": "feat: return structured order summary from formatOrder for the new invoice UI" },
  "commitsAnalyzed": 7,
  "testRunsExecuted": 5,
  "evidence": [
    {
      "file": "src/checkout.js",
      "functionName": "formatOrder",
      "before": "function formatOrder(order) {\n  return `Order #${order.id} - Total: $${order.total.toFixed(2)}`;\n}",
      "after": "function formatOrder(order) {\n  return {\n    orderId: order.id,\n    totalFormatted: `$${order.total.toFixed(2)}`,\n  };\n}"
    }
  ],
  "rootCause": {
    "explanation": "The regression was introduced in commit 2303d24 (\"feat: return structured order summary from formatOrder for the new invoice UI\") by WhyBroke Demo. The function `formatOrder()` in `src/checkout.js` changed between that commit and the previous passing commit d729c84 (\"docs: expand processOrder documentation\"). The test suite in `test/checkout.test.js` still exercises the old behavior of `formatOrder()`, which is why it fails at this commit and every commit after it.",
    "confidence": "High",
    "suggestedFix": "Either revert `formatOrder()` in `src/checkout.js` to its previous behavior, or update `test/checkout.test.js` to expect the new behavior if this change was intentional."
  }
}
```

## How IBM Bob Is Used

Bob was used as the AI-assisted development partner while building
WhyBroke — for planning the architecture, implementing the regression
engine and API, debugging issues, iterating on the UI, and writing this
documentation. Session evidence should be exported into `bob_sessions/`
as you work.

To be clear about scope: **this MVP does not call the Bob API at runtime
as part of the live investigation feature.** The deterministic
investigation pipeline (Git analysis, bisect, evidence building) runs
entirely offline by design, so the demo works reliably with zero API keys
configured. The `LLMProvider` interface in
`server/src/services/llm/` is the explicit extension point where a live
Bob (or other LLM) integration would plug in to generate richer
explanations from the same structured evidence — see that file for
details. This project does not claim that integration is implemented
today.

## Future Improvements

- Wire a real LLM (Bob or otherwise) into `LLMProvider` for richer,
  less templated explanations.
- Support multiple candidate source files with cross-file call-graph
  awareness, not just same-file function matching.
- Accept an arbitrary Git repository URL/path from the UI instead of only
  the bundled demo.
- Persist past investigation reports (currently each investigation is
  stateless and not stored).
- Replace the brace-counting function extractor with a real JS/TS parser
  (e.g. an AST-based approach) for more robust code-change detection.

## Troubleshooting

- **"not a Git repository" error**: run `npm run setup:demo` to
  (re)initialize `demo-repo/.git`.
- **`node` not found errors from the investigation itself**: the
  investigation engine shells out to `node` to run the test file inside a
  temp directory — make sure `node` is on your `PATH`.
- **Port already in use**: set `PORT` in `server/.env` (or your shell
  environment) to change the backend port; Vite will prompt for an
  alternate frontend port automatically if 5173 is taken.
- **Windows path issues**: `GitService.getFileAtCommit` normalizes
  backslash paths to forward slashes before calling `git show`; if you
  add new source files, use forward slashes in `sourceFiles` config to be
  safe.
