import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ComponentsModule } from './components/components.module';
import { SeedService } from './database/seed/seed.service';
import { buildDataSourceOptions } from './database/typeorm.config';
import { AdminUser } from './entities/admin-user.entity';
import { Component } from './entities/component.entity';
import { Environment } from './entities/environment.entity';
import { EnvironmentsModule } from './environments/environments.module';
import { EvaluatorModule } from './evaluator/evaluator.module';
import { ProbesModule } from './probes/probes.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { StatusModule } from './status/status.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async () => ({
        ...buildDataSourceOptions(),
        autoLoadEntities: true,
      }),
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Environment, Component, AdminUser]),
    ProbesModule,
    StatusModule,
    EnvironmentsModule,
    AuthModule,
    AdminModule,
    EvaluatorModule,
    SchedulerModule,
    ComponentsModule,
  ],
  providers: [SeedService],
})
export class AppModule {}
