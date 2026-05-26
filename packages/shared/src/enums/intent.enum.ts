export const Intent = {
  DISTRIBUTION: 'distribution',
  COMPARISON: 'comparison',
  TIME_TREND: 'time_trend',
  GEOGRAPHIC: 'geographic',
  RELATIONSHIP: 'relationship',
  RANKING: 'ranking',
} as const;

export type Intent = (typeof Intent)[keyof typeof Intent];

export const INTENTS: Intent[] = Object.values(Intent);
