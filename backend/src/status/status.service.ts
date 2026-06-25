import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Component } from '../entities/component.entity';
import { Environment } from '../entities/environment.entity';
import { GlobalStatus, GlobalStatusHistory } from '../entities/global-status-history.entity';
import { StatusHistory } from '../entities/status-history.entity';
import { ComponentStatus } from '../probes/probe.interface';

@Injectable()
export class StatusService {
  constructor(
    @InjectRepository(Environment)
    private readonly environmentRepository: Repository<Environment>,
    @InjectRepository(Component)
    private readonly componentRepository: Repository<Component>,
    @InjectRepository(StatusHistory)
    private readonly statusHistoryRepository: Repository<StatusHistory>,
    @InjectRepository(GlobalStatusHistory)
    private readonly globalStatusHistoryRepository: Repository<GlobalStatusHistory>,
  ) {}

  async getStatus(environmentCode: string) {
    const environment = await this.environmentRepository.findOne({
      where: { code: environmentCode },
    });

    if (!environment) {
      throw new NotFoundException(`Environment ${environmentCode} not found`);
    }

    return this.buildStatusResponse(environment);
  }

  async getStatusByEnvironmentId(environmentId: number) {
    const environment = await this.environmentRepository.findOne({
      where: { id: environmentId },
    });

    if (!environment) {
      throw new NotFoundException(`Environment ${environmentId} not found`);
    }

    return this.buildStatusResponse(environment);
  }

  async getComponents(environmentCode: string) {
    const environment = await this.environmentRepository.findOne({
      where: { code: environmentCode },
    });

    if (!environment) {
      throw new NotFoundException(`Environment ${environmentCode} not found`);
    }

    const components = await this.componentRepository.find({
      where: { environmentId: environment.id },
      order: { id: 'ASC' },
    });

    return components.map((component) => ({
      id: component.id,
      environmentId: component.environmentId,
      environmentCode: environment.code,
      code: component.code,
      label: component.label,
      criticality: component.criticality,
      probeType: component.probeType,
      probeConfig: component.probeConfig,
      intervalSeconds: component.intervalSeconds,
      enabled: component.enabled,
    }));
  }

  async getHistory(componentId: number, from?: string, to?: string, includeRawPayload = false) {
    const component = await this.componentRepository.findOne({
      where: { id: componentId },
    });

    if (!component) {
      throw new NotFoundException(`Component ${componentId} not found`);
    }

    const queryBuilder = this.statusHistoryRepository
      .createQueryBuilder('history')
      .where('history.component_id = :componentId', { componentId })
      .orderBy('history.changed_at', 'DESC')
      .addOrderBy('history.id', 'DESC');

    if (from) {
      queryBuilder.andWhere('history.changed_at >= :from', { from });
    }

    if (to) {
      queryBuilder.andWhere('history.changed_at <= :to', { to });
    }

    const history = await queryBuilder.getMany();

    return {
      component: {
        id: component.id,
        code: component.code,
        label: component.label,
      },
      history: history.map((item) => ({
        id: item.id,
        status: item.status,
        changedAt: item.changedAt.toISOString(),
        ...(includeRawPayload ? { rawPayload: item.rawPayload } : {}),
      })),
    };
  }

  async getGlobalHistory(environmentCode: string, from?: string, to?: string) {
    const environment = await this.environmentRepository.findOne({
      where: { code: environmentCode },
    });

    if (!environment) {
      throw new NotFoundException(`Environment ${environmentCode} not found`);
    }

    const queryBuilder = this.globalStatusHistoryRepository
      .createQueryBuilder('history')
      .where('history.environment_id = :environmentId', {
        environmentId: environment.id,
      })
      .orderBy('history.changed_at', 'DESC')
      .addOrderBy('history.id', 'DESC');

    if (from) {
      queryBuilder.andWhere('history.changed_at >= :from', { from });
    }

    if (to) {
      queryBuilder.andWhere('history.changed_at <= :to', { to });
    }

    const history = await queryBuilder.getMany();

    return {
      environment: environment.code,
      history: history.map((item) => ({
        id: item.id,
        status: item.status,
        changedAt: item.changedAt.toISOString(),
      })),
    };
  }

  private async buildStatusResponse(environment: Environment) {
    const components = await this.componentRepository.find({
      where: {
        environmentId: environment.id,
        enabled: true,
      },
      order: { id: 'ASC' },
    });

    const componentResponses = await Promise.all(
      components.map(async (component) => {
        const latest = await this.statusHistoryRepository.findOne({
          where: { componentId: component.id },
          order: { changedAt: 'DESC', id: 'DESC' },
        });

        return {
          id: component.id,
          code: component.code,
          label: component.label,
          status: (latest?.status ?? 'unknown') as ComponentStatus,
          lastChangedAt: latest ? latest.changedAt.toISOString() : null,
        };
      }),
    );

    const latestGlobal = await this.globalStatusHistoryRepository.findOne({
      where: { environmentId: environment.id },
      order: { changedAt: 'DESC', id: 'DESC' },
    });

    const global = latestGlobal?.status ?? this.computeGlobalStatus(components, componentResponses);
    const checkedAt =
      components
        .map((c) => c.lastCheckedAt)
        .filter((d): d is Date => d != null)
        .map((d) => d.toISOString())
        .sort()
        .at(-1) ??
      latestGlobal?.changedAt.toISOString() ??
      new Date().toISOString();

    return {
      environment: environment.code,
      global,
      checkedAt,
      components: componentResponses,
    };
  }

  private computeGlobalStatus(
    components: Component[],
    componentResponses: Array<{ code: string; status: ComponentStatus }>,
  ): GlobalStatus {
    const statusByCode = new Map(
      componentResponses.map((component) => [component.code, component.status]),
    );

    for (const component of components.filter((item) => item.criticality === 'critical')) {
      if (statusByCode.get(component.code) !== 'up') {
        return 'red';
      }
    }

    for (const component of components.filter((item) => item.criticality === 'degraded')) {
      if (statusByCode.get(component.code) !== 'up') {
        return 'orange';
      }
    }

    return 'green';
  }
}
