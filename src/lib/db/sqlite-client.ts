import Database from "better-sqlite3";
import { initAuthSchema } from "./init-auth";
import { initBatchSchema } from "@/features/batch-processing/init-batch-schema";
import { FEATURE_FLAGS } from "@/features/config";

let db: Database.Database;

export function getDB() {
  if (!db) {
    db = new Database("procheff.db");

    // Initialize auth schema on first connection
    try {
      initAuthSchema();
    } catch {
      // Tables may already exist, ignore errors
      console.log("Auth schema already initialized");
    }

    // Initialize batch processing schema if feature is enabled
    if (FEATURE_FLAGS.BATCH_PROCESSING_ENABLED) {
      try {
        initBatchSchema();
      } catch {
        console.log("Batch schema already initialized");
      }
    }
  }
  return db;
}
