import app from "./app.js";
import { sequelize } from "./config/database.js";
import "./models/index.js";
import { createBootstrapAdmin } from "./controllers/auth.controller.js";
import { runMigrations } from "./migrations/index.js";

const port = Number(process.env.PORT || 4000);

async function startServer(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log("Connected to Database successfully.");
    await sequelize.sync();
    await runMigrations();
    await createBootstrapAdmin();

    const server = app.listen(port, () => {
      console.log(`Niyo Arts API running at http://localhost:${port}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`${signal} received. Shutting down...`);
      server.close(async () => {
        await sequelize.close();
        process.exit(0);
      });
    };

    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start server. Check your database configuration.", error);
    process.exit(1);
  }
}

void startServer();
