export interface NormalizedStudy {
  nctId: string;
  briefTitle: string;
  overallStatus: string;
  phases: string[];
  startDate?: string;
  startYear?: number;
  completionDate?: string;
  leadSponsorName?: string;
  leadSponsorClass?: string;
  conditions: string[];
  interventionNames: string[];
  interventionTypes: string[];
  locationCountries: string[];
  enrollmentCount?: number;
  studyType?: string;
}
