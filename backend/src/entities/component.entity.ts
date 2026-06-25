import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Environment } from './environment.entity';
import { StatusHistory } from './status-history.entity';

export type ComponentCriticality = 'critical' | 'degraded';

@Entity({ name: 'component' })
@Index(['environmentId', 'code'], { unique: true })
export class Component {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'environment_id', type: 'int' })
  environmentId: number;

  @ManyToOne(() => Environment, (environment) => environment.components, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'environment_id' })
  environment: Environment;

  @Column({ length: 64 })
  code: string;

  @Column({ length: 128 })
  label: string;

  @Column({
    type: 'enum',
    enum: ['critical', 'degraded'],
  })
  criticality: ComponentCriticality;

  @Column({ name: 'probe_type', length: 64 })
  probeType: string;

  @Column({ name: 'probe_config', type: 'json' })
  probeConfig: Record<string, unknown>;

  @Column({ name: 'interval_seconds', type: 'int', default: 60 })
  intervalSeconds: number;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @OneToMany(() => StatusHistory, (statusHistory) => statusHistory.component)
  statusHistory: StatusHistory[];
}
