import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Environment } from './environment.entity';

export type GlobalStatus = 'green' | 'orange' | 'red';

@Entity({ name: 'global_status_history' })
@Index(['environmentId', 'changedAt'])
export class GlobalStatusHistory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'environment_id', type: 'int' })
  environmentId: number;

  @ManyToOne(() => Environment, (environment) => environment.globalStatusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'environment_id' })
  environment: Environment;

  @Column({
    type: 'enum',
    enum: ['green', 'orange', 'red'],
  })
  status: GlobalStatus;

  @Column({ name: 'changed_at', type: 'datetime', precision: 3 })
  changedAt: Date;
}
