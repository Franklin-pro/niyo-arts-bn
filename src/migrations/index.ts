import { QueryTypes } from "sequelize";
import {
  applySchemaUpdates,
  addProductImages,
  addProductSize,
  makeArtistImageUrlNullable,
} from "../config/schema-updates.js";
import { sequelize } from "../config/database.js";

const migrations = [
  {
    version: "202611030001_order_fulfillment",
    up: applySchemaUpdates,
  },
  {
    version: "202611050001_artist_image_nullable",
    up: makeArtistImageUrlNullable,
  },
  {
    version: "202611060001_product_images",
    up: addProductImages,
  },
  {
    version: "202611060002_product_size",
    up: addProductSize,
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
