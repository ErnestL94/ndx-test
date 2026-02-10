import { describe, it, expect } from 'vitest';
import { minLength } from '../../../src/evaluators/structural/min-length.js';

describe('minLength', () => {
  it('passes when response meets the minimum', async () => {
    const evaluator = minLength(5);
    const result = await evaluator('Hello world');

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
    expect(result.name).toBe('minLength');
    expect(result.category).toBe('structural');
  });

  it('passes when response is exactly at the minimum', async () => {
    const evaluator = minLength(5);
    const result = await evaluator('Hello');

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
  });

  it('fails when response is below the minimum', async () => {
    const evaluator = minLength(100);
    const result = await evaluator('Too short');

    expect(result.pass).toBe(false);
    expect(result.score).toBeLessThan(1.0);
    expect(result.details).toContain('below minimum');
  });

  it('provides a proportional score when under the minimum', async () => {
    const evaluator = minLength(100);
    // 50 chars out of 100 minimum -> score = 0.5
    const response = 'x'.repeat(50);
    const result = await evaluator(response);

    expect(result.pass).toBe(false);
    expect(result.score).toBeCloseTo(0.5);
  });

  it('caps score at 1.0 when well over the minimum', async () => {
    const evaluator = minLength(10);
    const response = 'x'.repeat(1000);
    const result = await evaluator(response);

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
  });

  it('handles empty string', async () => {
    const evaluator = minLength(10);
    const result = await evaluator('');

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
  });

  it('handles zero minimum', async () => {
    const evaluator = minLength(0);
    const result = await evaluator('');

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
  });

  it('defaults severity to error', async () => {
    const evaluator = minLength(10);
    const result = await evaluator('test');

    expect(result.severity).toBe('error');
  });

  it('allows severity override', async () => {
    const evaluator = minLength(10, { severity: 'info' });
    const result = await evaluator('test');

    expect(result.severity).toBe('info');
  });

  it('includes length and minimum in metadata', async () => {
    const evaluator = minLength(50);
    const result = await evaluator('Hello world');

    expect(result.metadata).toEqual({ length: 11, minimum: 50 });
  });
});