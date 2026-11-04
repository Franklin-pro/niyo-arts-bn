import { QueryTypes } from "sequelize";
import { applySchemaUpdates } from "../config/schema-updates.js";
import { sequelize } from "../config/database.js";

const migrations = [
  {
    version: "202611030001_order_fulfillment",
    up: applySchemaUpdates,
  },
] as const;

export async function runMigrations(): Promise<void> {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "schema_migrations" (
      "version" VARCHAR(80) PRIMARY KEY,
      "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  for (const migration of migrations) {
    const applied = await sequelize.query<{ version: string }>(
      'SELECT "version" FROM "schema_migrations" WHERE "version" = :version',
      { replacements: { version: migration.version }, type: QueryTypes.SELECT },
    );
    if (applied.length > 0) continue;
    await migration.up();
    await sequelize.query(
      'INSERT INTO "schema_migrations" ("version") VALUES (:version)',
      { replacements: { version: migration.version } },
    );
    console.log(`Applied database migration ${migration.version}.`);
  }
}
