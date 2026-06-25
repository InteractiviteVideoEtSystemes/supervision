import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Component } from '../entities/component.entity';
import { EvaluatorModule } from '../evaluator/evaluator.module';
import { ProbesModule } from '../probes/probes.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [TypeOrmModule.forFeature([Component]), ProbesModule, EvaluatorModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
