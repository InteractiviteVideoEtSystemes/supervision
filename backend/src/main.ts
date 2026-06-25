import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { SeedService } from './database/seed/seed.service';
import { SchedulerService } from './scheduler/scheduler.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: configService.get<string>('frontendUrl') ?? 'http://localhost:5173',
    credentials: true,
  });

  const dataSource = app.get(DataSource);
  await dataSource.runMigrations();

  const seedService = app.get(SeedService);
  await seedService.seed();

  const schedulerService = app.get(SchedulerService);
  await schedulerService.rescheduleAll();

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);
}

void bootstrap();
