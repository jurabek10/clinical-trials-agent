export interface CTApiStudy {
  protocolSection?: {
    identificationModule?: {
      nctId?: string;
      briefTitle?: string;
    };
    statusModule?: {
      overallStatus?: string;
      startDateStruct?: { date?: string };
      completionDateStruct?: { date?: string };
    };
    designModule?: {
      phases?: string[];
      studyType?: string;
      enrollmentInfo?: { count?: number };
    };
    sponsorCollaboratorsModule?: {
      leadSponsor?: { name?: string; class?: string };
    };
    conditionsModule?: {
      conditions?: string[];
    };
    armsInterventionsModule?: {
      interventions?: { name?: string; type?: string }[];
    };
    contactsLocationsModule?: {
      locations?: { country?: string }[];
    };
  };
}

export interface CTApiPage {
  studies?: CTApiStudy[];
  nextPageToken?: string;
  totalCount?: number;
}
