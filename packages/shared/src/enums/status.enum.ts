export const Status = {
  RECRUITING: 'RECRUITING',
  COMPLETED: 'COMPLETED',
  TERMINATED: 'TERMINATED',
  ACTIVE_NOT_RECRUITING: 'ACTIVE_NOT_RECRUITING',
  WITHDRAWN: 'WITHDRAWN',
  NOT_YET_RECRUITING: 'NOT_YET_RECRUITING',
} as const;

export type Status = (typeof Status)[keyof typeof Status];

export const STATUSES: Status[] = Object.values(Status);
