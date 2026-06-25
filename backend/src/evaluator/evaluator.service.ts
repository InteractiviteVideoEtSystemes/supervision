import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Component } from '../entities/component.entity';
import { GlobalStatus, GlobalStatusHistory } from '../entities/global-status-history.entity';
import { StatusHistory } from '../entities/status-history.entity';
import { ComponentStatus, ProbeResult } from '../probes/probe.interface';
import { StatusGateway } from '../status/status.gateway';
import { StatusService } from '../status/status.service';

@Injectable()
export class EvaluatorService {
  constructor(
    @InjectRepository(Component)
    private readonly componentRepository: Repository<Component>,
    @InjectRepository(StatusHistory)
    private readonly statusHistoryRepository: Repository<StatusHistory>,
    @InjectRepository(GlobalStatusHistory)
    private readonly globalStatusHistoryRepository: Repository<GlobalStatusHistory>,
    private readonly statusService: StatusService,
    private readonly statusGateway: StatusGateway,
  ) {}

  async processResults(
    environmentId: number,
    environmentCode: string,
    results: ProbeResult[],
  ): Promise<void> {
    if (!results.length) {
      return;
    }

    const components = await this.componentRepository.find({
      where: {
        environmentId,
        code: In(results.map((result) => result.componentCode)),
      },
    });

    const componentByCode = new Map(components.map((component) => [component.code, component]));

    for (const result of results) {
      const component = componentByCode.get(result.componentCode);
      if (!component) {
        continue;
      }

      await this.persistResult(result, component);
    }

    if (components.length) {
      await this.componentRepository.update(
        { id: In(components.map((c) => c.id)) },
        { lastCheckedAt: new Date() },
      );
    }

    await this.computeAndPersistGlobal(environmentId);
    await this.emitEnvironmentUpdate(environmentId, environmentCode);
  }

  async refreshEnvironmentStatus(
    environmentId: number,
    environmentCode: string,
    emitAlways = false,
  ): Promise<void> {
    const globalChanged = await this.computeAndPersistGlobal(environmentId);
    if (globalChanged || emitAlways) {
      await this.emitEnvironmentUpdate(environmentId, environmentCode);
    }
  }

  async persistResult(result: ProbeResult, component: Component): Promise<boolean> {
    const latest = await this.statusHistoryRepository.findOne({
      where: { componentId: component.id },
      order: { changedAt: 'DESC', id: 'DESC' },
    });

    if (latest?.status === result.status) {
      return false;
    }

    await this.statusHistoryRepository.save(
      this.statusHistoryRepository.create({
        componentId: component.id,
        status: result.status,
        changedAt: new Date(),
        rawPayload: result.rawPayload ?? null,
      }),
    );

    return true;
  }

  async computeAndPersistGlobal(environmentId: number): Promise<boolean> {
    const components = await this.componentRepository.find({
      where: {
        environmentId,
        enabled: true,
      },
      order: {
        id: 'ASC',
      },
    });

    const componentStatuses = new Map<string, ComponentStatus>();
    for (const component of components) {
      const latest = await this.statusHistoryRepository.findOne({
        where: { componentId: component.id },
        order: { changedAt: 'DESC', id: 'DESC' },
      });
      componentStatuses.set(component.code, latest?.status ?? 'unknown');
    }

    const nextStatus = this.computeGlobalStatus(components, componentStatuses);
    const latestGlobalStatus = await this.globalStatusHistoryRepository.findOne({
      where: { environmentId },
      order: { changedAt: 'DESC', id: 'DESC' },
    });

    if (latestGlobalStatus?.status === nextStatus) {
      return false;
    }

    await this.globalStatusHistoryRepository.save(
      this.globalStatusHistoryRepository.create({
        environmentId,
        status: nextStatus,
        changedAt: new Date(),
      }),
    );

    return true;
  }

  computeGlobalStatus(
    components: Component[],
    componentStatuses: Map<string, ComponentStatus>,
  ): GlobalStatus {
    for (const component of components.filter((item) => item.criticality === 'critical')) {
      if (componentStatuses.get(component.code) !== 'up') {
        return 'red';
      }
    }

    for (const component of components.filter((item) => item.criticality === 'degraded')) {
      if (componentStatuses.get(component.code) !== 'up') {
        return 'orange';
      }
    }

    return 'green';
  }

  private async emitEnvironmentUpdate(
    environmentId: number,
    environmentCode: string,
  ): Promise<void> {
    const payload = await this.statusService.getStatusByEnvironmentId(environmentId);
    this.statusGateway.emitStatusUpdate(environmentCode, payload);
  }
}
