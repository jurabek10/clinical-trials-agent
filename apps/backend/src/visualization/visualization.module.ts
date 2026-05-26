import { Module } from '@nestjs/common';
import { AggregatorModule } from '../aggregator/aggregator.module';
import { VisualizationService } from './visualization.service';
import { CitationLinkerService } from './citation-linker.service';

@Module({
  imports: [AggregatorModule],
  providers: [VisualizationService, CitationLinkerService],
  exports: [VisualizationService, CitationLinkerService],
})
export class VisualizationModule {}
