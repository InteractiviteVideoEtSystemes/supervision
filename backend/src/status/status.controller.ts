import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { StatusService } from './status.service';

@Controller()
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get('status')
  getStatus(@Query('env') environment = 'preprod') {
    return this.statusService.getStatus(environment);
  }

  @Get('components')
  getComponents(@Query('env') environment = 'preprod') {
    return this.statusService.getComponents(environment);
  }

  @Get('components/:id/history')
  getHistory(
    @Param('id', ParseIntPipe) componentId: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.statusService.getHistory(componentId, from, to);
  }

  @Get('global-status/history')
  getGlobalHistory(
    @Query('env') environment = 'preprod',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.statusService.getGlobalHistory(environment, from, to);
  }

  @Get('health')
  getHealth() {
    return { status: 'ok' };
  }
}
