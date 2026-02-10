import { Evaluator, Severity } from '../../types.js';

interface OnTopicOptions {
  severity?: Severity;
  threshold?: number;
  /**
   * Optional custom scoring function. Receives the response and topic,
   * returns a 0-1 relevance score. Use this to plug in embedding-based
   * similarity or an LLM-as-judge approach.
   *
   * When not provided, falls back to keyword frequency scoring.
   */
  scorer?: (response: string, topic: string) => Promise<number>;
}

/**
 * Normalise text for keyword comparison: lowercase, strip punctuation, split into words.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 2); // Drop very short words (a, is, to, etc.)
}

/**
 * Built-in keyword frequency scorer.
 * Scores based on what proportion of topic keywords appear in the response.
 * Simple but effective for MVP — catches obvious off-topic responses.
 */
function keywordScore(response: string, topic: string): number {
  const topicTokens = [...new Set(tokenize(topic))];
  if (topicTokens.length === 0) return 1.0;

  const responseTokens = new Set(tokenize(response));
  const matchedCount = topicTokens.filter((token) => responseTokens.has(token)).length;

  return matchedCount / topicTokens.length;
}

/**
 * Factory that returns an evaluator checking the response stays relevant to a topic.
 *
 * Default behaviour uses keyword frequency matching. Pass a custom `scorer`
 * function for embedding-based or LLM-as-judge approaches.
 *
 * @example
 * ```typescript
 * // Basic keyword matching
 * guardrails.onTopic('Q3 earnings report')
 *
 * // With custom embedding scorer
 * guardrails.onTopic('Q3 earnings report', {
 *   scorer: async (response, topic) => cosineSimilarity(embed(response), embed(topic))
 * })
 * ```
 */
export function onTopic(topic: string, options: OnTopicOptions = {}): Evaluator {
  const { severity = 'warning', threshold = 0.3, scorer } = options;

  return async (response) => {
    const score = scorer
      ? await scorer(response, topic)
      : keywordScore(response, topic);

    const clampedScore = Math.max(0, Math.min(1, score));

    return {
      name: 'onTopic',
      pass: clampedScore >= threshold,
      score: clampedScore,
      threshold,
      category: 'guardrail',
      severity,
      details: clampedScore >= threshold
        ? `Response is on-topic (score: ${clampedScore.toFixed(2)}, topic: "${topic}")`
        : `Response appears off-topic (score: ${clampedScore.toFixed(2)}, required: ${threshold}, topic: "${topic}")`,
      metadata: {
        topic,
        scoringMethod: scorer ? 'custom' : 'keyword',
      },
    };
  };
}