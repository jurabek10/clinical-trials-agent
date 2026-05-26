import { of, throwError } from 'rxjs';
import type { HttpService } from '@nestjs/axios';
import type { ConfigService } from '@nestjs/config';
import { ClinicalTrialsService } from '../src/clinicaltrials/clinicaltrials.service';
import type { CTApiPage } from '../src/clinicaltrials/types/study.types';

function makeConfig(): ConfigService {
  return {
    get: <T>(_key: string, fallback?: T) => fallback,
    getOrThrow: (k: string) => `${k}-val`,
  } as unknown as ConfigService;
}

function studyEnvelope(nctId: string, overrides: Record<string, unknown> = {}) {
  return {
    protocolSection: {
      identificationModule: { nctId, briefTitle: `Title ${nctId}` },
      statusModule: { overallStatus: 'COMPLETED', startDateStruct: { date: '2020-05-01' } },
      designModule: { phases: ['PHASE2'] },
      sponsorCollaboratorsModule: { leadSponsor: { name: 'Acme', class: 'INDUSTRY' } },
      conditionsModule: { conditions: ['X'] },
      armsInterventionsModule: {
        interventions: [{ name: 'Drug A', type: 'DRUG' }],
      },
      contactsLocationsModule: { locations: [{ country: 'United States' }] },
      ...overrides,
    },
  };
}

describe('ClinicalTrialsService', () => {
  it('paginates with nextPageToken and respects max cap', async () => {
    const pages: CTApiPage[] = [
      { studies: [studyEnvelope('NCT1'), studyEnvelope('NCT2')], nextPageToken: 't1' },
      { studies: [studyEnvelope('NCT3'), studyEnvelope('NCT4')], nextPageToken: 't2' },
      { studies: [studyEnvelope('NCT5')], nextPageToken: undefined },
    ];
    let i = 0;
    const http = {
      get: jest.fn(() => of({ data: pages[i++] })),
    } as unknown as HttpService;
    const svc = new ClinicalTrialsService(http, makeConfig());

    const res = await svc.fetchStudies({}, 100);
    expect(res.studies.length).toBe(5);
    expect(res.studies[0].nctId).toBe('NCT1');
    expect(res.studies[0].startYear).toBe(2020);
    expect(res.truncated).toBe(false);
  });

  it('stops early when cap is reached and flags truncated=true', async () => {
    const pages: CTApiPage[] = [
      { studies: [studyEnvelope('A'), studyEnvelope('B'), studyEnvelope('C')], nextPageToken: 't1' },
    ];
    let i = 0;
    const http = {
      get: jest.fn(() => of({ data: pages[i++] })),
    } as unknown as HttpService;
    const svc = new ClinicalTrialsService(http, makeConfig());

    const res = await svc.fetchStudies({}, 2);
    expect(res.studies.length).toBe(2);
    expect(res.truncated).toBe(true);
  });

  it('does not flag truncated when the last page has no nextPageToken', async () => {
    const pages: CTApiPage[] = [
      { studies: [studyEnvelope('A'), studyEnvelope('B')], nextPageToken: undefined },
    ];
    let i = 0;
    const http = {
      get: jest.fn(() => of({ data: pages[i++] })),
    } as unknown as HttpService;
    const svc = new ClinicalTrialsService(http, makeConfig());

    const res = await svc.fetchStudies({}, 2);
    expect(res.studies.length).toBe(2);
    expect(res.truncated).toBe(false);
  });

  it('wraps upstream errors as UPSTREAM_FAILURE', async () => {
    const http = {
      get: jest.fn(() => throwError(() => Object.assign(new Error('boom'), { response: { status: 503 } }))),
    } as unknown as HttpService;
    const svc = new ClinicalTrialsService(http, makeConfig());

    await expect(svc.fetchStudies({}, 10)).rejects.toMatchObject({
      response: { error: { code: 'UPSTREAM_FAILURE' } },
    });
  });
});
