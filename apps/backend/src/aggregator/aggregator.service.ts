import { Injectable } from '@nestjs/common';
import type { NormalizedStudy } from '@ct-agent/shared';
import { groupByPhase } from './strategies/group-by-phase.strategy';
import { groupByStatus } from './strategies/group-by-status.strategy';
import { groupByCountry } from './strategies/group-by-country.strategy';
import {
  groupBySponsor,
  groupBySponsorClass,
} from './strategies/group-by-sponsor.strategy';
import { bucketByYear } from './strategies/bucket-by-year.strategy';
import { histogramOfEnrollment } from './strategies/histogram.strategy';
import { comparisonOf, type CompareDim } from './strategies/comparison.strategy';
import { buildNetwork, type NetworkDim } from './strategies/build-network.strategy';
import type { BucketMap } from './strategies/types';

@Injectable()
export class AggregatorService {
  byPhase = groupByPhase;
  byStatus = groupByStatus;
  byCountry = groupByCountry;
  bySponsor = groupBySponsor;
  bySponsorClass = groupBySponsorClass;
  byYear = bucketByYear;
  histogramEnrollment = histogramOfEnrollment;
  comparison = comparisonOf;
  network = buildNetwork;

  /**
   * Apply post-fetch in-memory filters (date ranges) that the API can't do precisely.
   */
  postFilter(
    studies: NormalizedStudy[],
    opts: { startYear?: number; endYear?: number },
  ): NormalizedStudy[] {
    return studies.filter((s) => {
      if (opts.startYear !== undefined) {
        if (s.startYear === undefined || s.startYear < opts.startYear) return false;
      }
      if (opts.endYear !== undefined) {
        if (s.startYear === undefined || s.startYear > opts.endYear) return false;
      }
      return true;
    });
  }
}

export type { BucketMap, CompareDim, NetworkDim };
