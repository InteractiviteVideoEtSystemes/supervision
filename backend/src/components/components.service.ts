import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Component } from '../entities/component.entity';
import { Environment } from '../entities/environment.entity';
import { EvaluatorService } from '../evaluator/evaluator.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { CreateComponentDto } from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';

@Injectable()
export class ComponentsService {
  constructor(
    @InjectRepository(Component)
    private readonly componentRepository: Repository<Component>,
    @InjectRepository(Environment)
    private readonly environmentRepository: Repository<Environment>,
    private readonly schedulerService: SchedulerService,
    private readonly evaluatorService: EvaluatorService,
  ) {}

  async create(dto: CreateComponentDto) {
    const environment = await this.ensureEnvironment(dto.environmentId);
    await this.ensureUnique(dto.environmentId, dto.code);

    const component = await this.componentRepository.save(
      this.componentRepository.create({
        environmentId: dto.environmentId,
        code: dto.code,
        label: dto.label,
        criticality: dto.criticality,
        probeType: dto.probeType,
        probeConfig: dto.probeConfig,
        intervalSeconds: dto.intervalSeconds,
        enabled: dto.enabled,
      }),
    );

    await this.schedulerService.rescheduleComponentById(component.id);
    await this.evaluatorService.refreshEnvironmentStatus(environment.id, environment.code, true);
    return this.findById(component.id);
  }

  async update(componentId: number, dto: UpdateComponentDto) {
    const component = await this.componentRepository.findOne({
      where: { id: componentId },
    });

    if (!component) {
      throw new NotFoundException(`Component ${componentId} not found`);
    }

    const environmentId = dto.environmentId ?? component.environmentId;
    const nextEnvironment = await this.ensureEnvironment(environmentId);
    const currentEnvironment = await this.ensureEnvironment(component.environmentId);
    const nextCode = dto.code ?? component.code;

    if (nextCode !== component.code || environmentId !== component.environmentId) {
      await this.ensureUnique(environmentId, nextCode, componentId);
    }

    await this.componentRepository.save({
      ...component,
      environmentId,
      code: nextCode,
      label: dto.label ?? component.label,
      criticality: dto.criticality ?? component.criticality,
      probeType: dto.probeType ?? component.probeType,
      probeConfig: dto.probeConfig ?? component.probeConfig,
      intervalSeconds: dto.intervalSeconds ?? component.intervalSeconds,
      enabled: dto.enabled ?? component.enabled,
    });

    await this.schedulerService.rescheduleComponentById(componentId);
    await this.evaluatorService.refreshEnvironmentStatus(nextEnvironment.id, nextEnvironment.code, true);
    if (currentEnvironment.id !== nextEnvironment.id) {
      await this.evaluatorService.refreshEnvironmentStatus(
        currentEnvironment.id,
        currentEnvironment.code,
        true,
      );
    }
    return this.findById(componentId);
  }

  async delete(componentId: number) {
    const component = await this.componentRepository.findOne({
      where: { id: componentId },
    });

    if (!component) {
      throw new NotFoundException(`Component ${componentId} not found`);
    }

    const environment = await this.ensureEnvironment(component.environmentId);
    await this.componentRepository.delete(componentId);
    this.schedulerService.unscheduleComponent(componentId);
    await this.evaluatorService.refreshEnvironmentStatus(environment.id, environment.code, true);

    return { success: true };
  }

  private async findById(componentId: number) {
    const component = await this.componentRepository.findOne({
      where: { id: componentId },
      relations: { environment: true },
    });

    if (!component) {
      throw new NotFoundException(`Component ${componentId} not found`);
    }

    return {
      id: component.id,
      environmentId: component.environmentId,
      environmentCode: component.environment.code,
      code: component.code,
      label: component.label,
      criticality: component.criticality,
      probeType: component.probeType,
      probeConfig: component.probeConfig,
      intervalSeconds: component.intervalSeconds,
      enabled: component.enabled,
    };
  }

  private async ensureEnvironment(environmentId: number) {
    const environment = await this.environmentRepository.findOne({
      where: { id: environmentId },
    });

    if (!environment) {
      throw new NotFoundException(`Environment ${environmentId} not found`);
    }

    return environment;
  }

  private async ensureUnique(environmentId: number, code: string, currentComponentId?: number) {
    const existing = await this.componentRepository.findOne({
      where: { environmentId, code },
    });

    if (existing && existing.id !== currentComponentId) {
      throw new ConflictException(
        `Component code ${code} already exists for environment ${environmentId}`,
      );
    }
  }
}
