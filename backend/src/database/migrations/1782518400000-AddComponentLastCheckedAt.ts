import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddComponentLastCheckedAt1782518400000 implements MigrationInterface {
  public readonly name = 'AddComponentLastCheckedAt1782518400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `component` ADD COLUMN `last_checked_at` DATETIME(3) NULL;',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `component` DROP COLUMN `last_checked_at`;');
  }
}
