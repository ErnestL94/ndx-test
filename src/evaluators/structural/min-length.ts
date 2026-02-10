import { Evaluator, Severity } from '../../types.js';

interface MinLengthOptions {
  severity?: Severity;
}

/**
 * Factory that returns an evaluator checking response meets a minimum length.
 * Score scales linearly from 0 (empty) to 1.0 (at or above minimum).
 */
export function minLength(minimum: number, options: MinLengthOptions = {}): Evaluator {
  const { severity = 'error' } = options;

  return async (response) => {
    const length = response.length;
    const score = minimum > 0 ? Math.min(1.0, length / minimum) : 1.0;

    return {
      name: 'minLength',
      pass: length >= minimum,
      score,
      threshold: 1.0,
      category: 'structural',
      severity,
      details: length >= minimum
        ? `Response length ${length} meets minimum of ${minimum}`
        : `Response length ${length} is below minimum of ${minimum} by ${minimum - length} characters`,
      metadata: { length, minimum },
    };
  };
}