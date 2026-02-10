import { describe, it, expect } from 'vitest';
import { onTopic } from '../../../src/evaluators/guardrails/on-topic.js';

describe('onTopic', () => {
  it('passes when response is clearly on-topic', async () => {
    const evaluator = onTopic('machine learning algorithms');
    const result = await evaluator(
      'Machine learning algorithms can be categorized into supervised and unsupervised learning approaches.'
    );

    expect(result.pass).toBe(true);
    expect(result.score).toBeGreaterThan(0);
    expect(result.name).toBe('onTopic');
    expect(result.category).toBe('guardrail');
  });

  it('fails when response is completely off-topic', async () => {
    const evaluator = onTopic('quantum physics');
    const result = await evaluator(
      'The best recipe for chocolate cake involves cocoa powder and butter.'
    );

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
  });

  it('gives partial score for partially relevant responses', async () => {
    const evaluator = onTopic('cloud computing infrastructure');
    const result = await evaluator(
      'Modern infrastructure relies on cloud services for scalability, but cooking is also fun.'
    );

    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(1.0);
  });

  it('uses default threshold of 0.3', async () => {
    const evaluator = onTopic('testing');
    const result = await evaluator('We need better testing practices for our codebase.');

    expect(result.pass).toBe(true);
    expect(result.metadata?.topic).toBe('testing');
  });

  it('respects custom threshold', async () => {
    const evaluator = onTopic('neural networks deep learning', { threshold: 0.8 });
    const result = await evaluator('Neural networks are used in deep learning research.');

    // Even with some keyword matches, a high threshold may cause failure
    expect(result.threshold).toBe(0.8);
  });

  it('handles single-word topics', async () => {
    const evaluator = onTopic('python');
    const result = await evaluator('Python is a versatile programming language.');

    expect(result.pass).toBe(true);
  });

  // Custom scorer
  it('uses custom scorer when provided', async () => {
    const mockScorer = async (_response: string, _topic: string) => 0.95;
    const evaluator = onTopic('anything', { scorer: mockScorer });
    const result = await evaluator('Does not matter what this says.');

    expect(result.pass).toBe(true);
    expect(result.score).toBe(0.95);
    expect(result.metadata?.scoringMethod).toBe('custom');
  });

  it('falls back to keyword scoring without custom scorer', async () => {
    const evaluator = onTopic('test topic');
    const result = await evaluator('Some response text.');

    expect(result.metadata?.scoringMethod).toBe('keyword');
  });

  it('clamps custom scorer output to 0-1', async () => {
    const overScorer = async () => 1.5;
    const evaluator = onTopic('topic', { scorer: overScorer });
    const result = await evaluator('response');

    expect(result.score).toBe(1.0);
  });

  it('clamps negative custom scorer output to 0', async () => {
    const negativeScorer = async () => -0.5;
    const evaluator = onTopic('topic', { scorer: negativeScorer });
    const result = await evaluator('response');

    expect(result.score).toBe(0);
  });

  // Severity
  it('defaults severity to warning', async () => {
    const evaluator = onTopic('testing');
    const result = await evaluator('test response');

    expect(result.severity).toBe('warning');
  });

  it('allows severity override', async () => {
    const evaluator = onTopic('testing', { severity: 'error' });
    const result = await evaluator('test response');

    expect(result.severity).toBe('error');
  });

  // Edge cases
  it('handles empty response', async () => {
    const evaluator = onTopic('testing');
    const result = await evaluator('');

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
  });

  it('handles empty topic gracefully', async () => {
    const evaluator = onTopic('');
    const result = await evaluator('Any response at all.');

    // Empty topic = everything is on topic
    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
  });

  it('is case-insensitive', async () => {
    const evaluator = onTopic('Machine Learning');
    const result = await evaluator('machine learning is transforming industries');

    expect(result.pass).toBe(true);
  });

  // Details
  it('includes topic in details on pass', async () => {
    const evaluator = onTopic('testing');
    const result = await evaluator('Testing is important for quality assurance.');

    expect(result.details).toContain('testing');
  });

  it('includes required threshold in details on failure', async () => {
    const evaluator = onTopic('quantum physics', { threshold: 0.5 });
    const result = await evaluator('Chocolate cake recipe');

    expect(result.details).toContain('0.5');
  });
});