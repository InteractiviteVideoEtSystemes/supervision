import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Component } from '../entities/component.entity';
import { GlobalStatusHistory } from '../entities/global-status-history.entity';
import { StatusHistory } from '../entities/status-history.entity';
import { StatusModule } from '../status/status.module';
import { EvaluatorService } from './evaluator.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Component, StatusHistory, GlobalStatusHistory]),
    StatusModule,
  ],
  providers: [EvaluatorService],
  exports: [EvaluatorService],
})
export class EvaluatorModule {}
