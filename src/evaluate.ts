import { EvaluationConfig, EvaluationReport, EvaluationResult, Severity } from './types.js';

async function runEvaluators(response: string, config: EvaluationConfig): Promise<EvaluationResult[]> {
    const { evaluators, context, stopOnFirstFailure = false } = config;
    const results: EvaluationResult[] = [];

    for (const evaluator of evaluators) {
      try {
        const result = await evaluator(response, context);
        results.push(result);
  
        // Halt only on 'error' severity failures if stopOnFirstFailure is enabled
        if (stopOnFirstFailure && !result.pass && result.severity === 'error') {
          break;
        }
      } catch (err) {
        const evaluatorName = evaluator.name || 'Anonymous Evaluator';
        results.push({
          name: `Runtime Error: ${evaluatorName}`,
          pass: false,
          score: 0,
          threshold: 0,
          category: 'structural',
          severity: 'error',
          details: err instanceof Error ? err.message : String(err),
        });
        if (stopOnFirstFailure) break;
      }
    }
  
    return results;
  }
  
  export async function evaluate(
    response: string,
    config: EvaluationConfig
  ): Promise<EvaluationReport> {
    const { testName } = config;
    const results = await runEvaluators(response, config);
  
    const summary = results.reduce(
      (acc, r) => {
        acc.total += 1;
        if (r.pass) acc.passed += 1;
        acc.bySeverity[r.severity] += 1;
        acc.scoreSum += r.score;
        if (!r.pass && r.severity === 'error') acc.hasCriticalFailure = true;
        return acc;
      },
      {
        total: 0,
        passed: 0,
        scoreSum: 0,
        hasCriticalFailure: false,
        bySeverity: { error: 0, warning: 0, info: 0 } as Record<Severity, number>,
      }
    );
  
    return {
      testName,
      overallScore: summary.total > 0 ? summary.scoreSum / summary.total : 0,
      timestamp: new Date().toISOString(),
      overallPass: !summary.hasCriticalFailure,
      results,
      summary: {
        total: summary.total,
        passed: summary.passed,
        failed: summary.total - summary.passed,
        bySeverity: summary.bySeverity,
      },
    };
  }