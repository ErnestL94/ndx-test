import { Evaluator, Severity } from '../../types.js';

interface NoHallucinatedUrlsOptions {
  severity?: Severity;
  /** Allowlist of domains that are always considered valid */
  allowedDomains?: string[];
  /**
   * Optional async function to verify if a URL is reachable.
   * When not provided, only structural validation is performed (well-formed URL check).
   * Providing this enables live reachability checks (e.g., HEAD requests).
   */
  verifier?: (url: string) => Promise<boolean>;
}

/**
 * Extract URLs from text. Matches http/https URLs.
 */
function extractUrls(text: string): string[] {
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  const matches = text.match(urlPattern) || [];
  // Clean trailing punctuation that's likely not part of the URL
  return matches.map((url) => url.replace(/[.,;:!?)]+$/, ''));
}

/**
 * Basic structural validation — checks if a URL has a valid-looking structure.
 */
function isStructurallyValid(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Must have a hostname with at least one dot (filters out http://localhost etc.)
    return parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

/**
 * Factory that returns an evaluator detecting hallucinated URLs in the response.
 *
 * By default, performs structural validation only (checks URLs are well-formed).
 * Pass a `verifier` function to enable live reachability checks.
 * Use `allowedDomains` to whitelist known-good domains.
 *
 * Score: 1.0 if no issues, ratio of valid URLs to total URLs otherwise.
 *
 * @example
 * ```typescript
 * // Structural validation only
 * guardrails.noHallucinatedUrls()
 *
 * // With reachability checks
 * guardrails.noHallucinatedUrls({
 *   verifier: async (url) => {
 *     const res = await fetch(url, { method: 'HEAD' });
 *     return res.ok;
 *   }
 * })
 *
 * // With allowed domains
 * guardrails.noHallucinatedUrls({ allowedDomains: ['example.com', 'docs.myapp.com'] })
 * ```
 */
export function noHallucinatedUrls(options: NoHallucinatedUrlsOptions = {}): Evaluator {
  const { severity = 'error', allowedDomains = [], verifier } = options;

  return async (response) => {
    const urls = extractUrls(response);

    // No URLs in response — nothing to validate
    if (urls.length === 0) {
      return {
        name: 'noHallucinatedUrls',
        pass: true,
        score: 1.0,
        threshold: 1.0,
        category: 'guardrail',
        severity,
        details: 'No URLs found in response',
        metadata: { urlsFound: 0, checked: [], flagged: [], verificationEnabled: !!verifier },
      };
    }

    const flagged: { url: string; reason: string }[] = [];
    const valid: string[] = [];

    for (const url of urls) {
      // Check if domain is allowlisted
      try {
        const hostname = new URL(url).hostname;
        if (allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
          valid.push(url);
          continue;
        }
      } catch {
        // If URL can't be parsed, it'll be caught by structural check below
      }

      // Structural validation
      if (!isStructurallyValid(url)) {
        flagged.push({ url, reason: 'malformed URL' });
        continue;
      }

      // Optional reachability check
      if (verifier) {
        try {
          const reachable = await verifier(url);
          if (!reachable) {
            flagged.push({ url, reason: 'unreachable' });
            continue;
          }
        } catch {
          flagged.push({ url, reason: 'verification failed' });
          continue;
        }
      }

      valid.push(url);
    }

    const pass = flagged.length === 0;
    const score = urls.length > 0 ? valid.length / urls.length : 1.0;

    return {
      name: 'noHallucinatedUrls',
      pass,
      score,
      threshold: 1.0,
      category: 'guardrail',
      severity,
      details: pass
        ? `All ${urls.length} URL(s) passed validation`
        : `${flagged.length} of ${urls.length} URL(s) flagged: ${flagged.map((f) => `${f.url} (${f.reason})`).join(', ')}`,
      metadata: {
        urlsFound: urls.length,
        valid,
        flagged,
        verificationEnabled: !!verifier,
      },
    };
  };
}