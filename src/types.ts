/**
 * Categories for organizing evaluation results. 
 * 'guardrail' now encompasses policy compliance to keep the API surface lean.
 */
export type EvaluationCategory = 'semantic' | 'guardrail' | 'structural' | 'consistency';

/**
 * Severity levels for filtering CI/CD breakages.
 */
export type Severity = 'error' | 'warning' | 'info';

/**
 * The universal return type for every evaluator.
 */
export interface EvaluationResult {
  name: string;             
  pass: boolean;           
  score: number;           // Enforced 0-1 range
  threshold: number;       
  category: EvaluationCategory;
  severity: Severity;
  details: string;         
  metadata?: Record<string, unknown>; 
}

/**
 * Context is for external "Ground Truth" or "Intent" data.
 * Specific constraints (like a JSON Schema or Max Length) should be 
 * passed directly to the evaluator factory, not here.
 */
export interface EvaluationContext {
  prompt?: string;
  referenceResponse?: string; 
  retrievedDocuments?: string[]; 
  history?: string[];         
}

/**
 * Evaluator signature. 
 * Always returns a Promise to accommodate async semantic/API checks.
 */
export type Evaluator = (
  response: string, 
  context?: EvaluationContext
) => Promise<EvaluationResult>;

/**
 * Configuration for the evaluate() orchestrator.
 */
export interface EvaluationConfig {
  testName: string;
  evaluators: Evaluator[];
  context?: EvaluationContext; // Added: passed to every evaluator in this run
  stopOnFirstFailure?: boolean;
}

/**
 * The final aggregate report.
 */
export interface EvaluationReport {
  testName: string;
  timestamp: string;
  overallPass: boolean;
  overallScore: number; // Added: Aggregate mean of all evaluator scores
  results: EvaluationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    bySeverity: Record<Severity, number>; // Explicitly mapping severity counts
  };
}