import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ComponentsService } from './components.service';
import { CreateComponentDto } from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';

@Controller('components')
@UseGuards(JwtAuthGuard)
export class ComponentsController {
  constructor(private readonly componentsService: ComponentsService) {}

  @Post()
  create(@Body() dto: CreateComponentDto) {
    return this.componentsService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) componentId: number, @Body() dto: UpdateComponentDto) {
    return this.componentsService.update(componentId, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) componentId: number) {
    return this.componentsService.delete(componentId);
  }
}
