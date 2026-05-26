import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { AxiosError } from 'axios';
import type { NormalizedStudy } from '@ct-agent/shared';
import { upstreamFailure } from '../common/errors';
import type { CTApiPage, CTApiStudy } from './types/study.types';
import type { CTApiParams } from './mappers/plan-to-params.mapper';

export interface FetchResult {
  studies: NormalizedStudy[];
  totalScanned: number;
  totalAvailable?: number;
}

@Injectable()
export class ClinicalTrialsService {
  private readonly logger = new Logger(ClinicalTrialsService.name);
  private readonly baseUrl: string;
  private readonly hardCap: number;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>(
      'CT_API_BASE_URL',
      'https://clinicaltrials.gov/api/v2',
    );
    this.hardCap = this.config.get<number>('MAX_STUDIES_HARD_CAP', 1000);
  }

  async fetchStudies(params: CTApiParams, maxStudies: number): Promise<FetchResult> {
    const cap = Math.min(maxStudies, this.hardCap);
    const out: NormalizedStudy[] = [];
    let pageToken: string | undefined;
    let totalAvailable: number | undefined;
    let pageIndex = 0;

    while (out.length < cap) {
      const remaining = cap - out.length;
      const pageSize = Math.min(params.pageSize ?? 100, remaining);
      const page = await this.fetchPage({ ...params, pageSize, pageToken });
      pageIndex += 1;
      if (page.totalCount !== undefined) totalAvailable = page.totalCount;

      const raw = page.studies ?? [];
      for (const s of raw) {
        if (out.length >= cap) break;
        const norm = this.normalize(s);
        if (norm) out.push(norm);
      }

      if (!page.nextPageToken || raw.length === 0) break;
      pageToken = page.nextPageToken;
    }

    this.logger.debug(
      `Fetched ${out.length} studies across ${pageIndex} page(s); total available: ${
        totalAvailable ?? 'unknown'
      }`,
    );

    return { studies: out, totalScanned: out.length, totalAvailable };
  }

  private async fetchPage(params: CTApiParams): Promise<CTApiPage> {
    try {
      const res = await firstValueFrom(
        this.http.get<CTApiPage>(`${this.baseUrl}/studies`, {
          params,
          headers: { Accept: 'application/json' },
        }),
      );
      return res.data;
    } catch (err) {
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status;
      const detail =
        (axiosErr.response?.data as { message?: string } | undefined)?.message ??
        axiosErr.message;
      throw upstreamFailure(
        `ClinicalTrials.gov request failed${status ? ` (${status})` : ''}: ${detail}`,
        { status, data: axiosErr.response?.data },
      );
    }
  }

  private normalize(s: CTApiStudy): NormalizedStudy | null {
    const id = s.protocolSection?.identificationModule?.nctId;
    if (!id) return null;
    const startDate = s.protocolSection?.statusModule?.startDateStruct?.date;
    const startYear = startDate ? this.parseYear(startDate) : undefined;
    return {
      nctId: id,
      briefTitle: s.protocolSection?.identificationModule?.briefTitle ?? '',
      overallStatus: s.protocolSection?.statusModule?.overallStatus ?? 'UNKNOWN',
      phases: s.protocolSection?.designModule?.phases ?? [],
      startDate,
      startYear,
      completionDate: s.protocolSection?.statusModule?.completionDateStruct?.date,
      leadSponsorName: s.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name,
      leadSponsorClass: s.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.class,
      conditions: s.protocolSection?.conditionsModule?.conditions ?? [],
      interventionNames:
        s.protocolSection?.armsInterventionsModule?.interventions
          ?.map((i) => i.name)
          .filter((n): n is string => !!n) ?? [],
      interventionTypes:
        s.protocolSection?.armsInterventionsModule?.interventions
          ?.map((i) => i.type)
          .filter((t): t is string => !!t) ?? [],
      locationCountries: Array.from(
        new Set(
          (s.protocolSection?.contactsLocationsModule?.locations ?? [])
            .map((l) => l.country)
            .filter((c): c is string => !!c),
        ),
      ),
      enrollmentCount: s.protocolSection?.designModule?.enrollmentInfo?.count,
      studyType: s.protocolSection?.designModule?.studyType,
    };
  }

  private parseYear(date: string): number | undefined {
    // Date may be "YYYY-MM-DD" or "YYYY-MM" or "YYYY"
    const m = date.match(/^(\d{4})/);
    if (!m) return undefined;
    const y = Number(m[1]);
    return Number.isFinite(y) ? y : undefined;
  }
}
