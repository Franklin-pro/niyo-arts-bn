import "../config/env.js";
import "../models/index.js";
import { sequelize } from "../config/database.js";
import { runMigrations } from "./index.js";

async function migrate(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log("Connected to Database successfully.");
    await sequelize.sync();
    await runMigrations();
    console.log("Database schema is up to date.");
  } finally {
    await sequelize.close();
  }
}

void migrate().catch((error: unknown) => {
  console.error("Database migration failed.", error);
  process.exitCode = 1;
});
