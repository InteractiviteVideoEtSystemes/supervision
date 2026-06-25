import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Component } from '../entities/component.entity';
import { Environment } from '../entities/environment.entity';
import { GlobalStatusHistory } from '../entities/global-status-history.entity';
import { StatusHistory } from '../entities/status-history.entity';
import { StatusController } from './status.controller';
import { StatusGateway } from './status.gateway';
import { StatusService } from './status.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Environment, Component, StatusHistory, GlobalStatusHistory]),
  ],
  controllers: [StatusController],
  providers: [StatusService, StatusGateway],
  exports: [StatusService, StatusGateway],
})
export class StatusModule {}
