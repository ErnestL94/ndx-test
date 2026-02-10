import { Evaluator, Severity } from '../../types.js';

interface MaxLengthOptions {
  severity?: Severity;
}

/**
 * Factory that returns an evaluator checking response length does not exceed a limit.
 * Score is proportional: a response at half the limit scores 1.0, at the limit scores 1.0,
 * over the limit scores proportionally less (clamped to 0).
 */
export function maxLength(limit: number, options: MaxLengthOptions = {}): Evaluator {
  const { severity = 'error' } = options;

  return async (response) => {
    const length = response.length;
    const score = length <= limit ? 1.0 : Math.max(0, 1 - (length - limit) / limit);

    return {
      name: 'maxLength',
      pass: length <= limit,
      score,
      threshold: 1.0,
      category: 'structural',
      severity,
      details: length <= limit
        ? `Response length ${length} is within limit of ${limit}`
        : `Response length ${length} exceeds limit of ${limit} by ${length - limit} characters`,
      metadata: { length, limit },
    };
  };
}