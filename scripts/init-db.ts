#!/usr/bin/env tsx

import { initializeDatabase } from "../src/lib/db/init-schema";

console.log("🗄️  Initializing database schema...");

try {
  initializeDatabase();
  console.log("✅ Database initialization complete!");
  process.exit(0);
} catch (error) {
  console.error("❌ Database initialization failed:", error);
  process.exit(1);
}
