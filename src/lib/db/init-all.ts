import { ensureAdminSchema } from "./admin-schema";
import { initAuthSchema } from "./init-auth";
import { ensureOAuthSchema } from "./oauth-schema";

/**
 * Tüm veritabanı şemalarını başlat
 * Bu fonksiyon uygulama başlangıcında çağrılmalıdır
 */
export async function initAllSchemas() {
  console.log("🔄 Initializing all database schemas...");

  try {
    // Mevcut auth schema
    initAuthSchema();

    // Yeni admin schema
    await ensureAdminSchema();

    // OAuth schema
    ensureOAuthSchema();

    console.log("✅ All schemas initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize schemas:", error);
    throw error;
  }
}
