import type { QueryPlan } from '@ct-agent/shared';

export type FanOutDim = 'drug' | 'condition' | 'sponsor';

const COMPARE_DIMS = new Set([
  'phase',
  'status',
  'country',
  'year',
  'sponsor',
  'sponsor_class',
  'drug',
  'condition',
  'intervention_type',
]);

/**
 * Mirror the series-dim choice used by VisualizationService.pickComparisonDims so
 * that the query orchestrator can decide which filter to OR-expand BEFORE the API
 * fetch, while still ending up with the same series dimension downstream.
 */
export function pickComparisonSeriesDim(plan: QueryPlan): string | undefined {
  const dims = plan.group_by.filter((d) => COMPARE_DIMS.has(d));
  if (dims.length >= 2) return dims[1];
  if (dims.length === 1) return dims[0] === 'drug' ? 'phase' : 'drug';
  return undefined;
}

/**
 * Pull a pair of comparison terms out of the planner's title_hint + interpretation.
 * Generic across dimensions — "Pembrolizumab vs Nivolumab", "cancer and diabetes",
 * "comparing X to Y", "across A and B trials" all work.
 *
 * Returns `undefined` unless two distinct terms are confidently extracted.
 */
const ANCHOR_WORDS = ['for', 'between', 'across', 'of', 'comparing', 'compare', 'among'];
const ANCHOR_FINDER = new RegExp(`\\b(?:${ANCHOR_WORDS.join('|')})\\b`, 'gi');
const ANCHORED_PATTERN =
  /^(?:for|between|across|of|comparing|compare|among)\s+([^.,;()]+?)\s+(?:vs\.?|versus|and|to|against)\s+([^.,;()]+?)(?=\s+(?:trials?|studies|patients|cohorts?|in|over|across|with|during|using|by|on|alone|monotherapy)\b|[.,;()]|$)/i;

export function extractComparisonTerms(plan: QueryPlan): string[] | undefined {
  const text = `${plan.title_hint}. ${plan.interpretation}`;
  const candidates: { a: string; b: string }[] = [];

  // Try the anchored pattern from EVERY anchor-word position independently. Picking the
  // tightest candidate makes "...distribution of lead sponsor categories across cancer and
  // diabetes..." resolve at "across" (group1="cancer") rather than "of" (which would swallow
  // the sentence prefix).
  for (const m of text.matchAll(ANCHOR_FINDER)) {
    const slice = text.slice(m.index ?? 0);
    const one = slice.match(ANCHORED_PATTERN);
    if (!one) continue;
    const a = cleanComparisonTerm(one[1]);
    const b = cleanComparisonTerm(one[2]);
    if (a && b && a.toLowerCase() !== b.toLowerCase()) candidates.push({ a, b });
  }

  if (candidates.length) {
    candidates.sort((x, y) => x.a.length + x.b.length - (y.a.length + y.b.length));
    const best = candidates[0];
    return [best.a, best.b];
  }

  // Fallback: bare "X vs Y" / "X versus Y"
  const bareVs = text.match(
    /\b([A-Za-z][A-Za-z0-9 \-']{0,40}?)\s+(?:vs\.?|versus)\s+([A-Za-z][A-Za-z0-9 \-']{0,40}?)\b/i,
  );
  if (bareVs) {
    const a = cleanComparisonTerm(bareVs[1]);
    const b = cleanComparisonTerm(bareVs[2]);
    if (a && b && a.toLowerCase() !== b.toLowerCase()) return [a, b];
  }
  return undefined;
}

/**
 * Back-compat alias. Older call sites named this "drug" when the system only
 * supported drug-vs-drug comparisons.
 */
export function extractDrugComparisonTerms(plan: QueryPlan): string[] | undefined {
  return extractComparisonTerms(plan);
}

function cleanComparisonTerm(value: string): string {
  return value
    .replace(
      /\b(trials?|distributions?|phases?|clinical|categories|category|for|of|the|patients|cohorts?)\b/gi,
      ' ',
    )
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
