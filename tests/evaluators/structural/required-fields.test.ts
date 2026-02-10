import { describe, it, expect } from 'vitest';
import { requiredFields } from '../../../src/evaluators/structural/required-fields.js';

describe('requiredFields', () => {
  it('passes when all required fields are present', async () => {
    const evaluator = requiredFields(['name', 'age']);
    const response = JSON.stringify({ name: 'Alice', age: 30, extra: true });
    const result = await evaluator(response);

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
    expect(result.name).toBe('requiredFields');
    expect(result.category).toBe('structural');
  });

  it('fails when some fields are missing', async () => {
    const evaluator = requiredFields(['name', 'age', 'email']);
    const response = JSON.stringify({ name: 'Alice' });
    const result = await evaluator(response);

    expect(result.pass).toBe(false);
    expect(result.score).toBeCloseTo(1 / 3);
    expect(result.details).toContain('age');
    expect(result.details).toContain('email');
  });

  it('provides proportional score based on fields found', async () => {
    const evaluator = requiredFields(['a', 'b', 'c', 'd']);
    const response = JSON.stringify({ a: 1, b: 2 });
    const result = await evaluator(response);

    expect(result.pass).toBe(false);
    expect(result.score).toBeCloseTo(0.5);
  });

  it('fails with score 0 when response is not valid JSON', async () => {
    const evaluator = requiredFields(['name']);
    const result = await evaluator('not json at all');

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
    expect(result.details).toContain('not valid JSON');
  });

  it('fails when response is a JSON array instead of object', async () => {
    const evaluator = requiredFields(['name']);
    const result = await evaluator('[1, 2, 3]');

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
    expect(result.details).toContain('not a JSON object');
  });

  it('fails when response is a JSON primitive', async () => {
    const evaluator = requiredFields(['name']);
    const result = await evaluator('"just a string"');

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
  });

  it('passes with empty fields array', async () => {
    const evaluator = requiredFields([]);
    const result = await evaluator('{}');

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
  });

  it('detects fields with falsy values as present', async () => {
    const evaluator = requiredFields(['count', 'name', 'active']);
    const response = JSON.stringify({ count: 0, name: '', active: false });
    const result = await evaluator(response);

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
  });

  it('detects fields with null values as present', async () => {
    const evaluator = requiredFields(['name']);
    const response = JSON.stringify({ name: null });
    const result = await evaluator(response);

    expect(result.pass).toBe(true);
  });

  it('includes found and missing fields in metadata', async () => {
    const evaluator = requiredFields(['a', 'b', 'c']);
    const response = JSON.stringify({ a: 1, c: 3 });
    const result = await evaluator(response);

    expect(result.metadata).toEqual({
      requiredFields: ['a', 'b', 'c'],
      foundFields: ['a', 'c'],
      missingFields: ['b'],
    });
  });

  it('allows severity override', async () => {
    const evaluator = requiredFields(['name'], { severity: 'warning' });
    const result = await evaluator('{}');

    expect(result.severity).toBe('warning');
  });
});