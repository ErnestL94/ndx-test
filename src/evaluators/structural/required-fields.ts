import { Evaluator, Severity } from '../../types.js';

interface RequiredFieldsOptions {
  severity?: Severity;
}

/**
 * Factory that returns an evaluator checking a JSON response contains all required fields.
 * Parses the response as JSON, then checks for the presence of each field at the top level.
 * Score is the ratio of found fields to required fields.
 */
export function requiredFields(fields: string[], options: RequiredFieldsOptions = {}): Evaluator {
  const { severity = 'error' } = options;

  return async (response) => {
    let parsed: Record<string, unknown>;

    try {
      parsed = JSON.parse(response);
    } catch {
      return {
        name: 'requiredFields',
        pass: false,
        score: 0,
        threshold: 1.0,
        category: 'structural',
        severity,
        details: 'Response is not valid JSON',
        metadata: { requiredFields: fields, foundFields: [] },
      };
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {
        name: 'requiredFields',
        pass: false,
        score: 0,
        threshold: 1.0,
        category: 'structural',
        severity,
        details: 'Response is not a JSON object',
        metadata: { requiredFields: fields, foundFields: [] },
      };
    }

    const found = fields.filter((field) => field in parsed);
    const missing = fields.filter((field) => !(field in parsed));
    const score = fields.length > 0 ? found.length / fields.length : 1.0;

    return {
      name: 'requiredFields',
      pass: missing.length === 0,
      score,
      threshold: 1.0,
      category: 'structural',
      severity,
      details: missing.length === 0
        ? `All ${fields.length} required fields present`
        : `Missing fields: ${missing.join(', ')}`,
      metadata: { requiredFields: fields, foundFields: found, missingFields: missing },
    };
  };
}