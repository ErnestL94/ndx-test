import { describe, it, expect } from 'vitest';
import { noHallucinatedUrls } from '../../../src/evaluators/guardrails/no-hallucinated-urls.js';

describe('noHallucinatedUrls', () => {
  it('passes when no URLs are present', async () => {
    const evaluator = noHallucinatedUrls();
    const result = await evaluator('This response has no links at all.');

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
    expect(result.name).toBe('noHallucinatedUrls');
    expect(result.category).toBe('guardrail');
    expect(result.metadata?.urlsFound).toBe(0);
  });

  it('passes with well-formed URLs', async () => {
    const evaluator = noHallucinatedUrls();
    const result = await evaluator('Visit https://www.google.com for more info.');

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
  });

  it('passes with multiple valid URLs', async () => {
    const evaluator = noHallucinatedUrls();
    const result = await evaluator(
      'Check https://github.com and https://stackoverflow.com for references.'
    );

    expect(result.pass).toBe(true);
    expect(result.metadata?.urlsFound).toBe(2);
  });

  it('flags malformed URLs', async () => {
    const evaluator = noHallucinatedUrls();
    const result = await evaluator('See http://notareal for details.');

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
  });

  it('gives proportional score with mix of valid and invalid URLs', async () => {
    const evaluator = noHallucinatedUrls();
    const result = await evaluator(
      'Valid: https://www.google.com, Invalid: http://fake'
    );

    expect(result.pass).toBe(false);
    expect(result.score).toBeCloseTo(0.5);
  });

  // Allowed domains
  it('skips validation for allowed domains', async () => {
    const evaluator = noHallucinatedUrls({ allowedDomains: ['internal.company.com'] });
    const result = await evaluator('See https://internal.company.com/docs/api for details.');

    expect(result.pass).toBe(true);
  });

  it('allows subdomains of allowed domains', async () => {
    const evaluator = noHallucinatedUrls({ allowedDomains: ['company.com'] });
    const result = await evaluator('Visit https://docs.company.com/guide');

    expect(result.pass).toBe(true);
  });

  // Verifier
  it('uses custom verifier when provided', async () => {
    const verifier = async (url: string) => url.includes('google.com');
    const evaluator = noHallucinatedUrls({ verifier });
    const result = await evaluator(
      'Try https://www.google.com and https://www.fakexyz123.com'
    );

    expect(result.pass).toBe(false);
    expect(result.metadata?.verificationEnabled).toBe(true);
  });

  it('handles verifier that throws', async () => {
    const verifier = async () => { throw new Error('Network error'); };
    const evaluator = noHallucinatedUrls({ verifier });
    const result = await evaluator('Visit https://www.example.com');

    expect(result.pass).toBe(false);
    const flagged = result.metadata?.flagged as { url: string; reason: string }[];
    expect(flagged[0].reason).toBe('verification failed');
  });

  it('reports verification not enabled by default', async () => {
    const evaluator = noHallucinatedUrls();
    const result = await evaluator('No urls here.');

    expect(result.metadata?.verificationEnabled).toBe(false);
  });

  // URL extraction edge cases
  it('handles URLs with paths and query params', async () => {
    const evaluator = noHallucinatedUrls();
    const result = await evaluator(
      'See https://api.example.com/v2/users?page=1&limit=10 for the endpoint.'
    );

    expect(result.pass).toBe(true);
  });

  it('strips trailing punctuation from URLs', async () => {
    const evaluator = noHallucinatedUrls();
    const result = await evaluator(
      'Visit https://www.example.com.'
    );

    expect(result.pass).toBe(true);
    const valid = result.metadata?.valid as string[];
    expect(valid[0].endsWith('.')).toBe(false);
  });

  it('handles URLs at end of sentence with comma', async () => {
    const evaluator = noHallucinatedUrls();
    const result = await evaluator(
      'Check https://www.example.com, then continue.'
    );

    expect(result.pass).toBe(true);
  });

  // Severity
  it('defaults severity to error', async () => {
    const evaluator = noHallucinatedUrls();
    const result = await evaluator('No URLs.');

    expect(result.severity).toBe('error');
  });

  it('allows severity override', async () => {
    const evaluator = noHallucinatedUrls({ severity: 'warning' });
    const result = await evaluator('No URLs.');

    expect(result.severity).toBe('warning');
  });

  // Details
  it('includes flagged URL and reason in details', async () => {
    const evaluator = noHallucinatedUrls();
    const result = await evaluator('See http://broken for info.');

    expect(result.details).toContain('malformed');
  });
});