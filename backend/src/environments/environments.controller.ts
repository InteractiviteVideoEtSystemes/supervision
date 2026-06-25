import { Controller, Get } from '@nestjs/common';
import { EnvironmentsService } from './environments.service';

@Controller('environments')
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @Get()
  getAll() {
    return this.environmentsService.getAll();
  }
}
