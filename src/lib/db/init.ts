import { migrationRunner } from "./run-migrations";

let initialized = false;

export async function initDatabase() {
  if (initialized) return;

  try {
    // Run pending migrations
    await migrationRunner.runAll();
    initialized = true;
    console.log("✅ Database initialization complete");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
}

// Auto-initialize on import (development only)
if (process.env.NODE_ENV === "development") {
  initDatabase().catch(console.error);
}