import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Environment } from '../entities/environment.entity';

@Injectable()
export class EnvironmentsService {
  constructor(
    @InjectRepository(Environment)
    private readonly environmentRepository: Repository<Environment>,
  ) {}

  async getAll() {
    const environments = await this.environmentRepository.find({
      where: { enabled: true },
      order: { id: 'ASC' },
    });

    return environments.map((environment) => ({
      id: environment.id,
      code: environment.code,
      label: environment.label,
      enabled: environment.enabled,
    }));
  }
}
