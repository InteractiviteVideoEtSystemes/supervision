import { Module } from '@nestjs/common';
import { ProbeFactory } from './probe.factory';

@Module({
  providers: [ProbeFactory],
  exports: [ProbeFactory],
})
export class ProbesModule {}
