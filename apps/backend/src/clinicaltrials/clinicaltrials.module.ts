import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ClinicalTrialsService } from './clinicaltrials.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 20_000,
      maxRedirects: 3,
    }),
  ],
  providers: [ClinicalTrialsService],
  exports: [ClinicalTrialsService],
})
export class ClinicalTrialsModule {}
