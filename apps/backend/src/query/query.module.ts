import { Module } from '@nestjs/common';
import { PlannerModule } from '../planner/planner.module';
import { ClinicalTrialsModule } from '../clinicaltrials/clinicaltrials.module';
import { AggregatorModule } from '../aggregator/aggregator.module';
import { VisualizationModule } from '../visualization/visualization.module';
import { QueryController } from './query.controller';
import { QueryService } from './query.service';

@Module({
  imports: [PlannerModule, ClinicalTrialsModule, AggregatorModule, VisualizationModule],
  controllers: [QueryController],
  providers: [QueryService],
})
export class QueryModule {}
