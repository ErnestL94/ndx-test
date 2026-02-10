import { z } from 'zod';
import { Evaluator, Severity } from '../../types.js';

interface JsonSchemaOptions {
  severity?: Severity;
}

/**
 * Factory that returns an evaluator validating a JSON response against a Zod schema.
 * Accepts a Zod schema object — this keeps us in the TypeScript ecosystem 
 * and avoids the overhead of JSON Schema drafts.
 * 
 * Score: 1.0 if valid, 0.0 if invalid or unparseable.
 * Metadata includes the full Zod error details for debugging.
 * 
 * @example
 * ```typescript
 * const schema = z.object({
 *   summary: z.string(),
 *   confidence: z.number().min(0).max(1),
 *   sources: z.array(z.string()).optional(),
 * });
 * 
 * const evaluator = jsonSchema(schema);
 * ```
 */
export function jsonSchema(schema: z.ZodType, options: JsonSchemaOptions = {}): Evaluator {
  const { severity = 'error' } = options;

  return async (response) => {
    let parsed: unknown;

    try {
      parsed = JSON.parse(response);
    } catch {
      return {
        name: 'jsonSchema',
        pass: false,
        score: 0,
        threshold: 1.0,
        category: 'structural',
        severity,
        details: 'Response is not valid JSON',
        metadata: { errors: ['Failed to parse JSON'] },
      };
    }

    const result = schema.safeParse(parsed);

    if (result.success) {
      return {
        name: 'jsonSchema',
        pass: true,
        score: 1.0,
        threshold: 1.0,
        category: 'structural',
        severity,
        details: 'Response conforms to the expected schema',
        metadata: { validatedData: result.data },
      };
    }

    const errors = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`
    );

    return {
      name: 'jsonSchema',
      pass: false,
      score: 0,
      threshold: 1.0,
      category: 'structural',
      severity,
      details: `Schema validation failed: ${errors.join('; ')}`,
      metadata: { errors, issueCount: result.error.issues.length },
    };
  };
}