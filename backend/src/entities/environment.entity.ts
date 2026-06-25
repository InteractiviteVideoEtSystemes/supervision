import { Column, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Component } from './component.entity';
import { GlobalStatusHistory } from './global-status-history.entity';

@Entity({ name: 'environment' })
@Unique(['code'])
export class Environment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 32 })
  code: string;

  @Column({ length: 128 })
  label: string;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @OneToMany(() => Component, (component) => component.environment)
  components: Component[];

  @OneToMany(() => GlobalStatusHistory, (globalHistory) => globalHistory.environment)
  globalStatusHistory: GlobalStatusHistory[];
}
