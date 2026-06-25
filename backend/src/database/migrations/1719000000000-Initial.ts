import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1719000000000 implements MigrationInterface {
  public readonly name = 'Initial1719000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`environment\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`code\` VARCHAR(32) NOT NULL,
        \`label\` VARCHAR(128) NOT NULL,
        \`enabled\` TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_environment_code\` (\`code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`component\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`environment_id\` INT NOT NULL,
        \`code\` VARCHAR(64) NOT NULL,
        \`label\` VARCHAR(128) NOT NULL,
        \`criticality\` ENUM('critical', 'degraded') NOT NULL,
        \`probe_type\` VARCHAR(64) NOT NULL,
        \`probe_config\` JSON NOT NULL,
        \`interval_seconds\` INT NOT NULL DEFAULT 60,
        \`enabled\` TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_component_environment_code\` (\`environment_id\`, \`code\`),
        CONSTRAINT \`FK_component_environment\` FOREIGN KEY (\`environment_id\`) REFERENCES \`environment\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`status_history\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`component_id\` INT NOT NULL,
        \`status\` ENUM('up', 'down', 'unknown') NOT NULL,
        \`changed_at\` DATETIME(3) NOT NULL,
        \`raw_payload\` JSON NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_status_history_component_changed\` (\`component_id\`, \`changed_at\`),
        CONSTRAINT \`FK_status_history_component\` FOREIGN KEY (\`component_id\`) REFERENCES \`component\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`global_status_history\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`environment_id\` INT NOT NULL,
        \`status\` ENUM('green', 'orange', 'red') NOT NULL,
        \`changed_at\` DATETIME(3) NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_global_status_environment_changed\` (\`environment_id\`, \`changed_at\`),
        CONSTRAINT \`FK_global_status_environment\` FOREIGN KEY (\`environment_id\`) REFERENCES \`environment\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`admin_user\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`username\` VARCHAR(64) NOT NULL,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_admin_user_username\` (\`username\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `global_status_history`;');
    await queryRunner.query('DROP TABLE IF EXISTS `status_history`;');
    await queryRunner.query('DROP TABLE IF EXISTS `component`;');
    await queryRunner.query('DROP TABLE IF EXISTS `admin_user`;');
    await queryRunner.query('DROP TABLE IF EXISTS `environment`;');
  }
}
