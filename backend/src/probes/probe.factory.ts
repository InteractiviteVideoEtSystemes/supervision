import { Injectable } from '@nestjs/common';
import { Component } from '../entities/component.entity';
import { CoreApiHealthProbe } from './core-api-health.probe';
import { HttpReachableProbe } from './http-reachable.probe';
import { HttpStatusProbe } from './http-status.probe';
import { Probe, ProbeConfig } from './probe.interface';

@Injectable()
export class ProbeFactory {
  create(component: Pick<Component, 'code' | 'probeType' | 'probeConfig'>): Probe {
    const probeConfig = component.probeConfig as unknown as ProbeConfig;

    switch (component.probeType) {
      case 'core-api-health':
        return new CoreApiHealthProbe(component.code, probeConfig);
      case 'http-reachable':
        return new HttpReachableProbe(component.code, probeConfig);
      case 'http-status':
        return new HttpStatusProbe(component.code, probeConfig);
      default:
        throw new Error(`Unsupported probe type: ${component.probeType}`);
    }
  }
}
