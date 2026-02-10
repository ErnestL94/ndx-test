# ndx-test

**Assertion library for non-deterministic AI outputs.**

---

Traditional testing assumes deterministic outputs. Input X always produces output Y. LLMs break that contract. `ndx-test` provides evaluation primitives purpose-built for non-deterministic responses: semantic similarity, guardrail compliance, structural conformance, and consistency checks. Framework-agnostic, async-first, and designed for CI pipelines.

## Install

```bash
npm install ndx-test
```

## Quick Start

```typescript
import { evaluate, guardrails, structural, semantic } from 'ndx-test';

const response = await llm.complete("Summarise the Q3 earnings report");

const report = await evaluate(response, {
  context: {
    prompt: "Summarise the Q3 earnings report",
    reference: "Revenue grew 12% YoY to $4.2B, driven by cloud services.",
  },
  evaluators: [
    structural.maxLength(500),
    structural.minLength(50),
    structural.requiredFields(['summary', 'confidence']),
    guardrails.noPersonalData(),
    guardrails.onTopic("Q3 earnings"),
    semantic.similarity({ threshold: 0.85 }),
  ],
});

console.log(report.pass);    // true | false
console.log(report.score);   // 0.0 - 1.0 aggregate score
console.log(report.results); // individual evaluator results
```

Every evaluator returns a consistent result shape:

```typescript
{
  name: "maxLength",
  pass: true,
  score: 0.72,
  threshold: 1.0,
  category: "structural",
  severity: "error",
  details: "Response length 360 characters (limit: 500)"
}
```

## Evaluators

### Structural

| Evaluator | Description |
|---|---|
| `structural.maxLength(n)` | Response does not exceed `n` characters |
| `structural.minLength(n)` | Response meets minimum `n` characters |
| `structural.jsonSchema(schema)` | Response body conforms to a JSON schema |
| `structural.requiredFields(fields)` | Parsed response includes all required fields |

### Guardrails

| Evaluator | Description |
|---|---|
| `guardrails.noPersonalData()` | No PII detected (emails, phone numbers, SSNs, etc.) |
| `guardrails.onTopic(topic)` | Response stays relevant to the given topic |
| `guardrails.noHallucinatedUrls()` | No fabricated URLs present in the response |
| `guardrails.toxicity(threshold?)` | Response falls below toxicity threshold |

### Semantic

| Evaluator | Description |
|---|---|
| `semantic.similarity(options)` | Response is semantically similar to a reference (cosine similarity) |
| `semantic.consistency(options)` | Multiple responses to the same prompt stay within variance band |

## Configuration

### Evaluation Context

The context object carries everything evaluators might need beyond the raw response string:

```typescript
const report = await evaluate(response, {
  context: {
    prompt: "Original prompt sent to the LLM",
    reference: "Golden reference response for similarity comparison",
    retrievedDocuments: ["doc1 content", "doc2 content"],  // for RAG grounding
    conversationHistory: [],  // for multi-turn evaluation
  },
  evaluators: [...],
});
```

All context fields are optional — evaluators that need a field will report a clear error if it's missing.

### Thresholds

Every evaluator that uses a score accepts a `threshold` option. Scores are always normalised to 0–1:

```typescript
semantic.similarity({ threshold: 0.85 })   // default: 0.8
guardrails.toxicity({ threshold: 0.3 })     // default: 0.5
```

### Custom Evaluators

Any function that conforms to the `Evaluator` type can be passed directly:

```typescript
import type { Evaluator } from 'ndx-test';

const noApologies: Evaluator = async (response, context) => ({
  name: "noApologies",
  pass: !response.toLowerCase().includes("i apologise"),
  score: response.toLowerCase().includes("i apologise") ? 0 : 1,
  threshold: 1.0,
  category: "guardrail",
  severity: "warning",
  details: "Checks that the response does not contain unnecessary apologies",
});

const report = await evaluate(response, {
  evaluators: [noApologies, structural.maxLength(500)],
});
```

## Reporters

### Console

```typescript
import { reporters } from 'ndx-test';

reporters.console(report);
```

```
ndx-test evaluation report
──────────────────────────────────────────
✓ maxLength          1.00  structural
✓ minLength          1.00  structural
✓ noPersonalData     1.00  guardrail
✗ similarity         0.71  semantic     Below threshold (0.85)
✓ onTopic            0.93  guardrail
──────────────────────────────────────────
Overall: FAIL | Score: 0.93 | 4/5 passed
```

### JSON

```typescript
import { reporters } from 'ndx-test';

const json = reporters.json(report);
// Returns structured JSON suitable for CI artifacts, dashboards, or storage
```

### Custom Reporters

Reporters receive the full `EvaluationReport` object — build your own for JUnit XML, GitHub annotations, or whatever your pipeline needs.

## Usage with Test Frameworks

### Vitest / Jest

```typescript
import { describe, it, expect } from 'vitest';
import { evaluate, structural, guardrails } from 'ndx-test';

describe('Q&A Bot', () => {
  it('should produce safe, well-structured responses', async () => {
    const response = await bot.answer("What is our refund policy?");

    const report = await evaluate(response, {
      context: { prompt: "What is our refund policy?" },
      evaluators: [
        structural.maxLength(1000),
        structural.minLength(20),
        guardrails.noPersonalData(),
        guardrails.onTopic("refund policy"),
      ],
    });

    expect(report.pass).toBe(true);
  });
});
```

### Playwright

```typescript
import { evaluate, guardrails } from 'ndx-test';

test('chatbot does not leak PII', async ({ page }) => {
  await page.goto('/chat');
  await page.fill('#input', 'Tell me about user 12345');
  await page.click('#send');

  const response = await page.textContent('#response');

  const report = await evaluate(response!, {
    evaluators: [guardrails.noPersonalData()],
  });

  expect(report.pass).toBe(true);
});
```

## Roadmap

- [ ] CLI runner — define evaluation specs in YAML, run against saved responses
- [ ] RAG grounding evaluator — verify claims trace back to retrieved documents
- [ ] Multi-turn conversation evaluation
- [ ] Embedding provider adapters (OpenAI, Anthropic, local models)
- [ ] Historical comparison — track evaluation scores across builds
- [ ] GitHub Actions integration — inline PR annotations on failures
- [ ] Batch evaluation — run evaluations across prompt/response datasets

## Contributing

Contributions are welcome. Please open an issue to discuss your idea before submitting a PR.

```bash
git clone https://github.com/ErnestL94/ndx-test.git
cd ndx-test
npm install
npm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © Ernest