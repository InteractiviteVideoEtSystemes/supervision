import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Component } from '../entities/component.entity';
import { Environment } from '../entities/environment.entity';
import { EvaluatorModule } from '../evaluator/evaluator.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { ComponentsController } from './components.controller';
import { ComponentsService } from './components.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Component, Environment]),
    SchedulerModule,
    EvaluatorModule,
    AuthModule,
  ],
  controllers: [ComponentsController],
  providers: [ComponentsService],
  exports: [ComponentsService],
})
export class ComponentsModule {}
