// Core
export { evaluate } from './evaluate.js';

// Types
export type {
  EvaluationCategory,
  Severity,
  EvaluationResult,
  EvaluationContext,
  Evaluator,
  EvaluationConfig,
  EvaluationReport,
} from './types.js';

// Evaluators
export { structural } from './evaluators/index.js';