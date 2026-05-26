import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidate } from './config/env.validation';
import { QueryModule } from './query/query.module';
import { PlannerModule } from './planner/planner.module';
import { ClinicalTrialsModule } from './clinicaltrials/clinicaltrials.module';
import { AggregatorModule } from './aggregator/aggregator.module';
import { VisualizationModule } from './visualization/visualization.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validate: envValidate,
    }),
    PlannerModule,
    ClinicalTrialsModule,
    AggregatorModule,
    VisualizationModule,
    QueryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
