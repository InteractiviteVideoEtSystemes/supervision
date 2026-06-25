import bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import dataSource from '../typeorm.config';
import { AdminUser } from '../../entities/admin-user.entity';
import { Component } from '../../entities/component.entity';
import { Environment } from '../../entities/environment.entity';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(Environment)
    private readonly environmentRepository: Repository<Environment>,
    @InjectRepository(Component)
    private readonly componentRepository: Repository<Component>,
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,
  ) {}

  async seed(): Promise<void> {
    let environment = await this.environmentRepository.findOne({
      where: { code: 'preprod' },
    });

    if (!environment) {
      environment = await this.environmentRepository.save(
        this.environmentRepository.create({
          code: 'preprod',
          label: 'Pre-Production',
          enabled: true,
        }),
      );
    }

    const componentSeeds = [
      {
        code: 'database',
        label: 'Database',
        criticality: 'critical',
        probeType: 'core-api-health',
        probeConfig: {
          url: 'https://core-api-preprod.elioz.fr/health',
          field: 'isDatabaseUp',
          timeout_ms: 10000,
        },
      },
      {
        code: 'ldap',
        label: 'Ldap',
        criticality: 'critical',
        probeType: 'core-api-health',
        probeConfig: {
          url: 'https://core-api-preprod.elioz.fr/health',
          field: 'isLdapUp',
          timeout_ms: 10000,
        },
      },
      {
        code: 'statistics',
        label: 'Statistics',
        criticality: 'degraded',
        probeType: 'core-api-health',
        probeConfig: {
          url: 'https://core-api-preprod.elioz.fr/health',
          field: 'isStatisticsUp',
          timeout_ms: 10000,
        },
      },
      {
        code: 'video_messaging',
        label: 'VideoMessaging',
        criticality: 'degraded',
        probeType: 'core-api-health',
        probeConfig: {
          url: 'https://core-api-preprod.elioz.fr/health',
          field: 'isVideoMessagingUp',
          timeout_ms: 10000,
        },
      },
      {
        code: 'cti',
        label: 'Cti',
        criticality: 'critical',
        probeType: 'core-api-health',
        probeConfig: {
          url: 'https://core-api-preprod.elioz.fr/health',
          field: 'isCtiUp',
          timeout_ms: 10000,
        },
      },
      {
        code: 'core_api',
        label: 'core-API',
        criticality: 'critical',
        probeType: 'http-reachable',
        probeConfig: {
          url: 'https://core-api-preprod.elioz.fr/health',
          timeout_ms: 10000,
        },
      },
      {
        code: 'connect',
        label: 'Connect',
        criticality: 'degraded',
        probeType: 'http-status',
        probeConfig: {
          url: 'https://connect-preprod.elioz.fr/2.0.0-5/index.php?hash=220d54f7e118460a573a3a940d46b5fd',
          expected_status: 200,
          timeout_ms: 10000,
        },
      },
    ] as const;

    for (const componentSeed of componentSeeds) {
      const existing = await this.componentRepository.findOne({
        where: {
          environmentId: environment.id,
          code: componentSeed.code,
        },
      });

      if (!existing) {
        await this.componentRepository.save(
          this.componentRepository.create({
            environmentId: environment.id,
            code: componentSeed.code,
            label: componentSeed.label,
            criticality: componentSeed.criticality,
            probeType: componentSeed.probeType,
            probeConfig: componentSeed.probeConfig,
            intervalSeconds: 60,
            enabled: true,
          }),
        );
      }
    }

    const adminUser = await this.adminUserRepository.findOne({
      where: { username: 'admin' },
    });

    if (!adminUser) {
      const passwordHash = await bcrypt.hash('admin', 10);
      await this.adminUserRepository.save(
        this.adminUserRepository.create({
          username: 'admin',
          passwordHash,
          updatedAt: new Date(),
        }),
      );
    }
  }
}

async function runStandaloneSeed(): Promise<void> {
  const dataSourceInstance = dataSource.isInitialized ? dataSource : await dataSource.initialize();

  try {
    await dataSourceInstance.runMigrations();
    const seedService = new SeedService(
      dataSourceInstance.getRepository(Environment),
      dataSourceInstance.getRepository(Component),
      dataSourceInstance.getRepository(AdminUser),
    );
    await seedService.seed();
    console.log('Seed completed successfully.');
  } finally {
    if (dataSourceInstance.isInitialized) {
      await dataSourceInstance.destroy();
    }
  }
}

if (require.main === module) {
  void runStandaloneSeed();
}
