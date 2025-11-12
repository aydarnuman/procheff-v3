import { initAuthSchema } from "./init-auth";
import { initAdminSchema } from "./admin-schema";

/**
 * Tüm veritabanı şemalarını başlat
 * Bu fonksiyon uygulama başlangıcında çağrılmalıdır
 */
export function initAllSchemas() {
  console.log("🔄 Initializing all database schemas...");

  try {
    // Mevcut auth schema
    initAuthSchema();

    // Yeni admin schema
    initAdminSchema();

    console.log("✅ All schemas initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize schemas:", error);
    throw error;
  }
}
