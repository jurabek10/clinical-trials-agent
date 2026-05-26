import type { QueryPlan } from '@ct-agent/shared';

export function extractDrugComparisonTerms(plan: QueryPlan): string[] | undefined {
  const text = `${plan.title_hint}. ${plan.interpretation}`;
  const patterns = [
    /(?:for|between)\s+([^.,;]+?)\s+(?:vs\.?|versus|and)\s+([^.,;]+)/i,
    /\b([A-Z][A-Za-z0-9][A-Za-z0-9 -]{1,40}?)\s+(?:vs\.?|versus)\s+([A-Z][A-Za-z0-9][A-Za-z0-9 -]{1,40})\b/,
  ];
  const values: string[] = [];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    values.push(cleanComparisonTerm(match[1]), cleanComparisonTerm(match[2]));
    break;
  }

  if (values.length === 0 && plan.filters.drug_name) {
    values.push(plan.filters.drug_name);
  }

  const unique = Array.from(new Set(values.filter(Boolean)));
  return unique.length > 1 ? unique : undefined;
}

function cleanComparisonTerm(value: string): string {
  return value
    .replace(/\b(trials?|distribution|phase|phases|clinical|for)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
