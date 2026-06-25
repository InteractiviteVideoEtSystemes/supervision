import { Controller, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
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
  @UseGuards(OptionalJwtAuthGuard)
  getHistory(
    @Param('id', ParseIntPipe) componentId: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Req() request?: Request & { user?: { sub: number; username: string } },
  ) {
    const includeRawPayload = Boolean(request?.user);
    return this.statusService.getHistory(componentId, from, to, includeRawPayload);
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
