import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Component } from './component.entity';

export type StoredComponentStatus = 'up' | 'down' | 'unknown';

@Entity({ name: 'status_history' })
@Index(['componentId', 'changedAt'])
export class StatusHistory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'component_id', type: 'int' })
  componentId: number;

  @ManyToOne(() => Component, (component) => component.statusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'component_id' })
  component: Component;

  @Column({
    type: 'enum',
    enum: ['up', 'down', 'unknown'],
  })
  status: StoredComponentStatus;

  @Column({ name: 'changed_at', type: 'datetime', precision: 3 })
  changedAt: Date;

  @Column({ name: 'raw_payload', type: 'json', nullable: true })
  rawPayload?: unknown | null;
}
