import { describe, it, expect } from 'vitest';
import { maxLength } from '../../../src/evaluators/structural/max-length.js';

describe('maxLength', () => {
  it('passes when response is under the limit', async () => {
    const evaluator = maxLength(100);
    const result = await evaluator('Short response');

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
    expect(result.name).toBe('maxLength');
    expect(result.category).toBe('structural');
  });

  it('passes when response is exactly at the limit', async () => {
    const evaluator = maxLength(5);
    const result = await evaluator('Hello');

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
  });

  it('fails when response exceeds the limit', async () => {
    const evaluator = maxLength(10);
    const result = await evaluator('This is a much longer response');

    expect(result.pass).toBe(false);
    expect(result.score).toBeLessThan(1.0);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.details).toContain('exceeds');
  });

  it('provides a proportional score when over the limit', async () => {
    const evaluator = maxLength(100);
    // 150 chars is 50 over a 100 limit -> score = 1 - (50/100) = 0.5
    const response = 'x'.repeat(150);
    const result = await evaluator(response);

    expect(result.pass).toBe(false);
    expect(result.score).toBeCloseTo(0.5);
  });

  it('clamps score to 0 when massively over the limit', async () => {
    const evaluator = maxLength(10);
    const response = 'x'.repeat(500);
    const result = await evaluator(response);

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
  });

  it('defaults severity to error', async () => {
    const evaluator = maxLength(100);
    const result = await evaluator('test');

    expect(result.severity).toBe('error');
  });

  it('allows severity override', async () => {
    const evaluator = maxLength(100, { severity: 'warning' });
    const result = await evaluator('test');

    expect(result.severity).toBe('warning');
  });

  it('includes length and limit in metadata', async () => {
    const evaluator = maxLength(50);
    const result = await evaluator('Hello world');

    expect(result.metadata).toEqual({ length: 11, limit: 50 });
  });

  it('handles empty string', async () => {
    const evaluator = maxLength(100);
    const result = await evaluator('');

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
  });
});