import { describe, it, expect } from 'vitest';
import { toxicity } from '../../../src/evaluators/guardrails/toxicity.js';

describe('toxicity', () => {
  it('passes for clean, neutral text', async () => {
    const evaluator = toxicity();
    const result = await evaluator(
      'The quarterly report shows steady growth across all divisions.'
    );

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
    expect(result.name).toBe('toxicity');
    expect(result.category).toBe('guardrail');
  });

  it('fails for text with direct threats', async () => {
    const evaluator = toxicity();
    const result = await evaluator('I will kill you if you do that again.');

    expect(result.pass).toBe(false);
    expect(result.score).toBeLessThan(1.0);
    expect(result.metadata?.toxicityScore).toBeGreaterThan(0);
  });

  it('detects mild insults', async () => {
    const evaluator = toxicity();
    const result = await evaluator('That was a really stupid idea.');

    expect(result.metadata?.toxicityScore).toBeGreaterThan(0);
  });

  it('detects hostility patterns', async () => {
    const evaluator = toxicity();
    const result = await evaluator('I hate you and everything you stand for.');

    expect(result.pass).toBe(false);
  });

  // Threshold behaviour
  it('uses default threshold of 0.5', async () => {
    const evaluator = toxicity();
    const result = await evaluator('Clean text.');

    expect(result.metadata?.threshold).toBe(0.5);
  });

  it('respects custom threshold', async () => {
    // Low threshold = stricter, catches more
    const strict = toxicity({ threshold: 0.1 });
    const result = await strict('That was a stupid mistake.');

    // Even mild toxicity should fail with a very low threshold
    expect(result.metadata?.threshold).toBe(0.1);
  });

  it('passes mild toxicity with a lenient threshold', async () => {
    const lenient = toxicity({ threshold: 0.8 });
    const result = await lenient('That was a stupid mistake.');

    // Mild insult (weight 0.3) should pass with high threshold
    expect(result.pass).toBe(true);
  });

  // Score inversion
  it('inverts toxicity score for evaluation score (clean = 1.0)', async () => {
    const evaluator = toxicity();
    const result = await evaluator('Perfectly clean and professional response.');

    expect(result.score).toBe(1.0);
    expect(result.metadata?.toxicityScore).toBe(0);
  });

  it('inverts toxicity score for evaluation score (toxic = low)', async () => {
    const evaluator = toxicity();
    const result = await evaluator('I will kill you for saying that.');

    expect(result.score).toBeLessThan(0.5);
    expect(result.metadata?.toxicityScore).toBeGreaterThan(0.5);
  });

  // Custom scorer
  it('uses custom scorer when provided', async () => {
    const mockScorer = async () => 0.9; // Very toxic
    const evaluator = toxicity({ scorer: mockScorer });
    const result = await evaluator('Does not matter what this says.');

    expect(result.pass).toBe(false);
    expect(result.metadata?.toxicityScore).toBe(0.9);
    expect(result.metadata?.scoringMethod).toBe('custom');
  });

  it('falls back to keyword scoring without custom scorer', async () => {
    const evaluator = toxicity();
    const result = await evaluator('Some response.');

    expect(result.metadata?.scoringMethod).toBe('keyword');
  });

  it('custom scorer returning 0 passes', async () => {
    const cleanScorer = async () => 0;
    const evaluator = toxicity({ scorer: cleanScorer });
    const result = await evaluator('Anything.');

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
  });

  // Severity
  it('defaults severity to error', async () => {
    const evaluator = toxicity();
    const result = await evaluator('Clean text.');

    expect(result.severity).toBe('error');
  });

  it('allows severity override', async () => {
    const evaluator = toxicity({ severity: 'warning' });
    const result = await evaluator('Clean text.');

    expect(result.severity).toBe('warning');
  });

  // Edge cases
  it('handles empty response', async () => {
    const evaluator = toxicity();
    const result = await evaluator('');

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
  });

  it('is case-insensitive', async () => {
    const evaluator = toxicity();
    const lower = await evaluator('you are stupid');
    const upper = await evaluator('YOU ARE STUPID');

    expect(lower.metadata?.toxicityScore).toBeGreaterThan(0);
    expect(upper.metadata?.toxicityScore).toBeGreaterThan(0);
  });

  // Details
  it('includes score and threshold in pass details', async () => {
    const evaluator = toxicity();
    const result = await evaluator('Clean response.');

    expect(result.details).toContain('below threshold');
  });

  it('includes score and threshold in fail details', async () => {
    const evaluator = toxicity({ threshold: 0.1 });
    const result = await evaluator('That was stupid.');

    expect(result.details).toContain('exceeds threshold');
  });
});