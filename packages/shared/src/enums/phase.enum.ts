export const Phase = {
  EARLY_PHASE1: 'EARLY_PHASE1',
  PHASE1: 'PHASE1',
  PHASE2: 'PHASE2',
  PHASE3: 'PHASE3',
  PHASE4: 'PHASE4',
  NA: 'NA',
} as const;

export type Phase = (typeof Phase)[keyof typeof Phase];

export const PHASES: Phase[] = Object.values(Phase);
