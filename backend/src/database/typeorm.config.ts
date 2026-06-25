import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AdminUser } from '../entities/admin-user.entity';
import { Component } from '../entities/component.entity';
import { Environment } from '../entities/environment.entity';
import { GlobalStatusHistory } from '../entities/global-status-history.entity';
import { StatusHistory } from '../entities/status-history.entity';
import { Initial1719000000000 } from './migrations/1719000000000-Initial';
import { AddComponentLastCheckedAt1782518400000 } from './migrations/1782518400000-AddComponentLastCheckedAt';

export const buildDataSourceOptions = (): DataSourceOptions => ({
  type: 'mariadb',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'supervision',
  password: process.env.DB_PASSWORD ?? 'supervision',
  database: process.env.DB_NAME ?? 'supervision',
  entities: [Environment, Component, StatusHistory, GlobalStatusHistory, AdminUser],
  migrations: [Initial1719000000000, AddComponentLastCheckedAt1782518400000],
  synchronize: false,
  migrationsRun: false,
  logging: false,
  charset: 'utf8mb4_unicode_ci',
});

const dataSource = new DataSource(buildDataSourceOptions());

export default dataSource;
