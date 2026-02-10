import { describe, it, expect } from 'vitest';
import { noPersonalData } from '../../../src/evaluators/guardrails/no-personal-data.js';

describe('noPersonalData', () => {
  it('passes when no PII is present', async () => {
    const evaluator = noPersonalData();
    const result = await evaluator('The weather today is sunny with a high of 25 degrees.');

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
    expect(result.name).toBe('noPersonalData');
    expect(result.category).toBe('guardrail');
  });

  // Email detection
  it('detects email addresses', async () => {
    const evaluator = noPersonalData();
    const result = await evaluator('Contact us at john.doe@example.com for details.');

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0.0);
    expect(result.details).toContain('email');
  });

  it('detects multiple emails', async () => {
    const evaluator = noPersonalData();
    const result = await evaluator('Email alice@test.com or bob@test.com');
    const detections = result.metadata?.detections as { type: string; count: number }[];

    expect(result.pass).toBe(false);
    expect(detections.find((d) => d.type === 'email')?.count).toBe(2);
  });

  // Phone detection
  it('detects US phone numbers', async () => {
    const evaluator = noPersonalData();
    const result = await evaluator('Call me at (555) 123-4567.');

    expect(result.pass).toBe(false);
    expect(result.details).toContain('phone');
  });

  it('detects international phone numbers', async () => {
    const evaluator = noPersonalData();
    const result = await evaluator('Reach us at +1-555-123-4567.');

    expect(result.pass).toBe(false);
    expect(result.details).toContain('phone');
  });

  // SSN detection
  it('detects SSN format', async () => {
    const evaluator = noPersonalData();
    const result = await evaluator('SSN: 123-45-6789');

    expect(result.pass).toBe(false);
    expect(result.details).toContain('ssn');
  });

  // Credit card detection
  it('detects credit card numbers', async () => {
    const evaluator = noPersonalData();
    const result = await evaluator('Card number: 4111 1111 1111 1111');

    expect(result.pass).toBe(false);
    expect(result.details).toContain('creditCard');
  });

  // IP address detection
  it('detects IP addresses', async () => {
    const evaluator = noPersonalData();
    const result = await evaluator('Server is at 192.168.1.100');

    expect(result.pass).toBe(false);
    expect(result.details).toContain('ipAddress');
  });

  // Exclude option
  it('allows excluding specific PII categories', async () => {
    const evaluator = noPersonalData({ exclude: ['email'] });
    const result = await evaluator('Contact john@example.com for details.');

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
  });

  it('still detects non-excluded categories', async () => {
    const evaluator = noPersonalData({ exclude: ['email'] });
    const result = await evaluator('Contact john@example.com, SSN: 123-45-6789');

    expect(result.pass).toBe(false);
    expect(result.details).toContain('ssn');
    expect(result.details).not.toContain('email');
  });

  // Custom patterns
  it('supports custom patterns', async () => {
    const evaluator = noPersonalData({
      customPatterns: [
        { name: 'ukPostcode', pattern: /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi },
      ],
    });
    const result = await evaluator('Office is at SW1A 1AA in London.');

    expect(result.pass).toBe(false);
    expect(result.details).toContain('ukPostcode');
  });

  // Multiple PII types
  it('detects multiple PII types in one response', async () => {
    const evaluator = noPersonalData();
    const result = await evaluator('Email: test@test.com, Phone: 555-123-4567');
    const detections = result.metadata?.detections as { type: string; count: number }[];

    expect(result.pass).toBe(false);
    expect(detections.length).toBeGreaterThanOrEqual(2);
  });

  // Severity
  it('defaults severity to error', async () => {
    const evaluator = noPersonalData();
    const result = await evaluator('Clean response');

    expect(result.severity).toBe('error');
  });

  it('allows severity override', async () => {
    const evaluator = noPersonalData({ severity: 'warning' });
    const result = await evaluator('Clean response');

    expect(result.severity).toBe('warning');
  });

  // Metadata
  it('reports patterns checked count in metadata', async () => {
    const evaluator = noPersonalData();
    const result = await evaluator('Clean response');

    expect(result.metadata?.patternsChecked).toBe(5);
  });

  it('reports reduced patterns checked count when excluding', async () => {
    const evaluator = noPersonalData({ exclude: ['email', 'phone'] });
    const result = await evaluator('Clean response');

    expect(result.metadata?.patternsChecked).toBe(3);
  });
});