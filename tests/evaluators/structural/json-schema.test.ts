import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { jsonSchema } from '../../../src/evaluators/structural/json-schema.js';

describe('jsonSchema', () => {
  const testSchema = z.object({
    summary: z.string(),
    confidence: z.number().min(0).max(1),
    sources: z.array(z.string()).optional(),
  });

  it('passes when response conforms to schema', async () => {
    const evaluator = jsonSchema(testSchema);
    const response = JSON.stringify({
      summary: 'Revenue grew 12%',
      confidence: 0.92,
      sources: ['annual-report.pdf'],
    });
    const result = await evaluator(response);

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
    expect(result.name).toBe('jsonSchema');
    expect(result.category).toBe('structural');
  });

  it('passes when optional fields are omitted', async () => {
    const evaluator = jsonSchema(testSchema);
    const response = JSON.stringify({
      summary: 'Revenue grew 12%',
      confidence: 0.92,
    });
    const result = await evaluator(response);

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
  });

  it('fails when a required field is missing', async () => {
    const evaluator = jsonSchema(testSchema);
    const response = JSON.stringify({ summary: 'Revenue grew 12%' });
    const result = await evaluator(response);

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
    expect(result.details).toContain('confidence');
  });

  it('fails when a field has the wrong type', async () => {
    const evaluator = jsonSchema(testSchema);
    const response = JSON.stringify({
      summary: 'Revenue grew 12%',
      confidence: 'high', // should be number
    });
    const result = await evaluator(response);

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
    expect(result.details).toContain('confidence');
  });

  it('fails when a number is out of range', async () => {
    const evaluator = jsonSchema(testSchema);
    const response = JSON.stringify({
      summary: 'Revenue grew 12%',
      confidence: 1.5, // max is 1
    });
    const result = await evaluator(response);

    expect(result.pass).toBe(false);
    expect(result.details).toContain('confidence');
  });

  it('fails with score 0 when response is not valid JSON', async () => {
    const evaluator = jsonSchema(testSchema);
    const result = await evaluator('not json');

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
    expect(result.details).toContain('not valid JSON');
  });

  it('reports multiple validation errors', async () => {
    const evaluator = jsonSchema(testSchema);
    const response = JSON.stringify({
      summary: 123,       // should be string
      confidence: 'high', // should be number
    });
    const result = await evaluator(response);

    expect(result.pass).toBe(false);
    expect(result.metadata?.issueCount).toBeGreaterThanOrEqual(2);
  });

  it('includes error paths in details', async () => {
    const nestedSchema = z.object({
      data: z.object({
        value: z.number(),
      }),
    });
    const evaluator = jsonSchema(nestedSchema);
    const response = JSON.stringify({ data: { value: 'not a number' } });
    const result = await evaluator(response);

    expect(result.pass).toBe(false);
    expect(result.details).toContain('data.value');
  });

  it('works with simple primitive schemas', async () => {
    const evaluator = jsonSchema(z.string());
    const result = await evaluator('"hello"');

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
  });

  it('works with array schemas', async () => {
    const evaluator = jsonSchema(z.array(z.number()));
    const result = await evaluator('[1, 2, 3]');

    expect(result.pass).toBe(true);
  });

  it('defaults severity to error', async () => {
    const evaluator = jsonSchema(testSchema);
    const response = JSON.stringify({ summary: 'test', confidence: 0.5 });
    const result = await evaluator(response);

    expect(result.severity).toBe('error');
  });

  it('allows severity override', async () => {
    const evaluator = jsonSchema(testSchema, { severity: 'warning' });
    const response = JSON.stringify({ summary: 'test', confidence: 0.5 });
    const result = await evaluator(response);

    expect(result.severity).toBe('warning');
  });
});