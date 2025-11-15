/**
 * Two-Factor Authentication Service
 * Handles TOTP (Google Authenticator, Authy, etc.) and backup codes
 */

import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";
import { getDatabase } from "@/lib/db/universal-client";

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface User2FA {
  user_id: string;
  secret: string;
  backup_codes: string;
  enabled: number; // SQLite stores boolean as 0/1
  created_at: string;
  last_used?: string;
}

export class TwoFactorAuthService {
  private static instance: TwoFactorAuthService;

  private constructor() {}

  static getInstance(): TwoFactorAuthService {
    if (!TwoFactorAuthService.instance) {
      TwoFactorAuthService.instance = new TwoFactorAuthService();
    }
    return TwoFactorAuthService.instance;
  }

  /**
   * Generate a new 2FA setup for a user
   */
  async generateSetup(userId: string, userEmail: string): Promise<TwoFactorSetup> {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `ProCheff (${userEmail})`,
      issuer: "ProCheff",
      length: 32,
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(10);

    // Store setup (but don't enable yet)
    const db = await getDatabase();
    const existingUser = await db.queryOne(
      "SELECT * FROM user_2fa WHERE user_id = $1",
      [userId]
    ) as User2FA | undefined;

    if (existingUser) {
      // Update existing record
      await db.execute(
        `UPDATE user_2fa
         SET secret = $1, backup_codes = $2, enabled = 0, created_at = CURRENT_TIMESTAMP
         WHERE user_id = $3`,
        [secret.base32, JSON.stringify(backupCodes), userId]
      );
    } else {
      // Insert new record
      await db.execute(
        `INSERT INTO user_2fa (user_id, secret, backup_codes, enabled, created_at)
         VALUES ($1, $2, $3, 0, CURRENT_TIMESTAMP)`,
        [userId, secret.base32, JSON.stringify(backupCodes)]
      );
    }

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Verify a TOTP code and enable 2FA if valid
   */
  async verifyAndEnable(userId: string, token: string): Promise<boolean> {
    const db = await getDatabase();
    const user2fa = await db.queryOne(
      "SELECT * FROM user_2fa WHERE user_id = $1",
      [userId]
    ) as User2FA | undefined;

    if (!user2fa) {
      throw new Error("2FA setup not found");
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user2fa.secret,
      encoding: "base32",
      token,
      window: 2, // Allow 2 time steps in either direction
    });

    if (verified) {
      // Enable 2FA
      await db.execute(
        "UPDATE user_2fa SET enabled = 1, last_used = CURRENT_TIMESTAMP WHERE user_id = $1",
        [userId]
      );

      // Log the event
      await this.logSecurityEvent(userId, "2fa_enabled", { method: "totp" });

      return true;
    }

    return false;
  }

  /**
   * Verify a TOTP code for login
   */
  async verifyToken(userId: string, token: string): Promise<boolean> {
    const db = await getDatabase();
    const user2fa = await db.queryOne(
      "SELECT * FROM user_2fa WHERE user_id = $1 AND enabled = 1",
      [userId]
    ) as User2FA | undefined;

    if (!user2fa) {
      return false; // 2FA not enabled
    }

    // First try TOTP verification
    const verified = speakeasy.totp.verify({
      secret: user2fa.secret,
      encoding: "base32",
      token,
      window: 2,
    });

    if (verified) {
      // Update last used
      await db.execute(
        "UPDATE user_2fa SET last_used = CURRENT_TIMESTAMP WHERE user_id = $1",
        [userId]
      );

      await this.logSecurityEvent(userId, "2fa_login_success", { method: "totp" });
      return true;
    }

    // If TOTP fails, try backup codes
    const backupCodes = JSON.parse(user2fa.backup_codes) as string[];
    const codeIndex = backupCodes.indexOf(token);

    if (codeIndex !== -1) {
      // Remove used backup code
      backupCodes.splice(codeIndex, 1);
      await db.execute(
        "UPDATE user_2fa SET backup_codes = $1, last_used = CURRENT_TIMESTAMP WHERE user_id = $2",
        [JSON.stringify(backupCodes), userId]
      );

      await this.logSecurityEvent(userId, "2fa_login_success", {
        method: "backup_code",
        remaining_codes: backupCodes.length,
      });

      return true;
    }

    await this.logSecurityEvent(userId, "2fa_login_failed", { token_length: token.length });
    return false;
  }

  /**
   * Disable 2FA for a user
   */
  async disable(userId: string): Promise<void> {
    const db = await getDatabase();
    await db.execute("UPDATE user_2fa SET enabled = 0 WHERE user_id = $1", [userId]);

    await this.logSecurityEvent(userId, "2fa_disabled", {});
  }

  /**
   * Check if 2FA is enabled for a user
   */
  async isEnabled(userId: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.queryOne(
      "SELECT enabled FROM user_2fa WHERE user_id = $1",
      [userId]
    ) as { enabled: number } | undefined;

    return result?.enabled === 1;
  }

  /**
   * Get 2FA status and details
   */
  async getStatus(userId: string): Promise<{
    enabled: boolean;
    lastUsed?: string;
    backupCodesRemaining?: number;
  }> {
    const db = await getDatabase();
    const user2fa = await db.queryOne(
      "SELECT * FROM user_2fa WHERE user_id = $1",
      [userId]
    ) as User2FA | undefined;

    if (!user2fa) {
      return { enabled: false };
    }

    const backupCodes = JSON.parse(user2fa.backup_codes) as string[];

    return {
      enabled: Boolean(user2fa.enabled),
      lastUsed: user2fa.last_used,
      backupCodesRemaining: backupCodes.length,
    };
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const db = await getDatabase();
    const user2fa = await db.queryOne(
      "SELECT * FROM user_2fa WHERE user_id = $1 AND enabled = 1",
      [userId]
    ) as User2FA | undefined;

    if (!user2fa) {
      throw new Error("2FA not enabled");
    }

    const newCodes = this.generateBackupCodes(10);

    await db.execute(
      "UPDATE user_2fa SET backup_codes = $1 WHERE user_id = $2",
      [JSON.stringify(newCodes), userId]
    );

    await this.logSecurityEvent(userId, "backup_codes_regenerated", { count: newCodes.length });

    return newCodes;
  }

  /**
   * Generate random backup codes
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric codes
      const code = Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Log security events
   */
  private async logSecurityEvent(userId: string, action: string, metadata: any): Promise<void> {
    try {
      const db = await getDatabase();
      await db.execute(
        "INSERT INTO security_audit_logs (user_id, action, metadata, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)",
        [userId, action, JSON.stringify(metadata)]
      );
    } catch (error) {
      console.error("Failed to log security event:", error);
    }
  }
}

export const twoFactorAuthService = TwoFactorAuthService.getInstance();
