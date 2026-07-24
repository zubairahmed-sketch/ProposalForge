// Per SPEC.md Rule 3 & Section 10: bid strategy is deterministic code, NOT an LLM call.

export type BidStrategy = 'full_budget' | 'bid_lower' | 'ask_questions';

const SCOPE_RISK_TERMS = [
  'from scratch', 'full app', 'custom', 'complete platform', 'entire system',
  'full stack', 'end-to-end', 'mvp', 'startup', 'saas', 'e-commerce',
];

// Simple market-rate heuristic: avg developer day rate ~ $200-400
// A "normal" project scope is 3-10 items at $150-$200 per item
const EXPECTED_RATE_PER_REQUIREMENT = 150; // USD per key requirement

export function bidStrategy(
  budget: number | null,
  keyRequirements: string[],
): { strategy: BidStrategy; reason: string } {
  // No budget stated — don't guess scope
  if (budget === null) {
    return {
      strategy: 'ask_questions',
      reason: 'No budget was stated. Ask the client about their budget before committing to a price — scope can vary significantly for this type of project.',
    };
  }

  const requirementCount = keyRequirements.length;
  const hasHighScopeRisk = keyRequirements.some((req) =>
    SCOPE_RISK_TERMS.some((term) => req.toLowerCase().includes(term))
  );

  // Budget present but scope is clearly underpriced
  if (hasHighScopeRisk || requirementCount > 8) {
    return {
      strategy: 'ask_questions',
      reason: `The scope looks broad (${requirementCount} requirements${hasHighScopeRisk ? ', including high-complexity items' : ''}). Clarify the exact deliverables before committing — the budget may not cover everything implied.`,
    };
  }

  const expectedMinimum = requirementCount * EXPECTED_RATE_PER_REQUIREMENT;

  if (budget >= expectedMinimum) {
    return {
      strategy: 'full_budget',
      reason: `The budget of £${budget} is reasonable for ${requirementCount} requirements. Bid the full amount — no reason to undercut yourself.`,
    };
  }

  // Budget is below expected but not dramatically so
  if (budget >= expectedMinimum * 0.6) {
    return {
      strategy: 'bid_lower',
      reason: `The budget of £${budget} is slightly below typical market rate for this scope. You can still bid, but flag any out-of-scope items clearly and consider this a risk.`,
    };
  }

  // Budget is very low — still ask questions
  return {
    strategy: 'ask_questions',
    reason: `The budget of £${budget} looks significantly underpriced for this scope. Ask about flexibility or clarify which features are MVP before committing.`,
  };
}
