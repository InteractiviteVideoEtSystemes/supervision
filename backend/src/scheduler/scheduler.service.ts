import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Component } from '../entities/component.entity';
import { EvaluatorService } from '../evaluator/evaluator.service';
import { ProbeFactory } from '../probes/probe.factory';

@Injectable()
export class SchedulerService implements OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly timers = new Map<number, ReturnType<typeof setInterval>>();
  private readonly runningComponents = new Set<number>();

  constructor(
    @InjectRepository(Component)
    private readonly componentRepository: Repository<Component>,
    private readonly probeFactory: ProbeFactory,
    private readonly evaluatorService: EvaluatorService,
  ) {}

  async rescheduleAll(): Promise<void> {
    this.clearAllTimers();

    const components = await this.componentRepository
      .createQueryBuilder('component')
      .innerJoinAndSelect(
        'component.environment',
        'environment',
        'environment.enabled = :environmentEnabled',
        { environmentEnabled: true },
      )
      .where('component.enabled = :componentEnabled', { componentEnabled: true })
      .orderBy('component.id', 'ASC')
      .getMany();

    for (const component of components) {
      this.scheduleComponent(component);
    }
  }

  async rescheduleComponentById(componentId: number): Promise<void> {
    this.unscheduleComponent(componentId);

    const component = await this.componentRepository.findOne({
      where: { id: componentId },
      relations: { environment: true },
    });

    if (!component || !component.enabled || !component.environment?.enabled) {
      return;
    }

    this.scheduleComponent(component);
  }

  scheduleComponent(component: Component): void {
    this.unscheduleComponent(component.id);

    if (!component.enabled || !component.environment?.enabled) {
      return;
    }

    const intervalMs = Math.max(component.intervalSeconds, 5) * 1000;

    void this.runComponentCheck(component.id);
    const timer = setInterval(() => {
      void this.runComponentCheck(component.id);
    }, intervalMs);

    this.timers.set(component.id, timer);
  }

  unscheduleComponent(componentId: number): void {
    const timer = this.timers.get(componentId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(componentId);
    }
  }

  onModuleDestroy(): void {
    this.clearAllTimers();
  }

  private clearAllTimers(): void {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
  }

  private async runComponentCheck(componentId: number): Promise<void> {
    if (this.runningComponents.has(componentId)) {
      return;
    }

    this.runningComponents.add(componentId);
    try {
      const component = await this.componentRepository.findOne({
        where: { id: componentId },
        relations: { environment: true },
      });

      if (!component || !component.enabled || !component.environment?.enabled) {
        this.unscheduleComponent(componentId);
        return;
      }

      const probe = this.probeFactory.create(component);
      const results = await probe.check();
      await this.evaluatorService.processResults(
        component.environmentId,
        component.environment.code,
        results,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown scheduler error';
      this.logger.error(`Probe execution failed for component ${componentId}: ${message}`);
    } finally {
      this.runningComponents.delete(componentId);
    }
  }
}
