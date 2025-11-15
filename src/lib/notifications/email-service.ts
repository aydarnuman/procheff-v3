import nodemailer from "nodemailer";
import { renderEmailTemplate } from "./email-templates";

interface EmailOptions {
  to: string;
  subject: string;
  template?: string;
  variables?: Record<string, any>;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
  }>;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private testMode: boolean = process.env.SMTP_TEST_MODE === "true";

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      // Check if SMTP credentials are provided
      const hasSmtpCredentials = process.env.SMTP_USER && process.env.SMTP_PASS;
      
      if (this.testMode) {
        // Use Ethereal Email for testing
        const testAccount = await nodemailer.createTestAccount();

        this.transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });

        console.log("📧 Email service initialized in TEST mode (Ethereal)");
        console.log(`Test account: ${testAccount.user}`);
      } else if (hasSmtpCredentials) {
        // Production email configuration (only if credentials are provided)
        const config: any = {
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_PORT === "465",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          // Add connection timeout to prevent hanging
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 10000,
        };

        // For Gmail, use specific service
        if (config.host === "smtp.gmail.com") {
          this.transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS, // Use app password for Gmail
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000,
          });
        } else {
          this.transporter = nodemailer.createTransport(config);
        }

        console.log("📧 Email service initialized in PRODUCTION mode");
        
        // Verify connection in background (non-blocking)
        this.verifyConnection().catch(error => {
          console.warn("⚠️  SMTP verification failed (non-critical):", error.message);
        });
      } else {
        console.log("📧 Email service disabled (no SMTP credentials provided)");
        this.transporter = null;
      }
    } catch (error) {
      console.error("Failed to initialize email transporter:", error);
      this.transporter = null;
    }
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      console.log("⚠️  Email service not initialized - skipping verification");
      return false;
    }

    try {
      // Add timeout to prevent hanging
      const verifyWithTimeout = Promise.race([
        this.transporter.verify(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Verification timeout")), 5000)
        )
      ]);
      
      await verifyWithTimeout;
      console.log("✅ SMTP connection verified");
      return true;
    } catch (error) {
      console.error("❌ SMTP connection failed:", error);
      return false;
    }
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string; previewUrl?: string }> {
    if (!this.transporter) {
      await this.initializeTransporter();
    }

    if (!this.transporter) {
      console.warn("⚠️  Email service not available - skipping email send");
      return { success: false, error: "Email service not configured (SMTP credentials missing)" };
    }

    try {
      // Prepare email content
      let html = options.html;
      let text = options.text;

      // If template is provided, render it
      if (options.template && options.variables) {
        const rendered = renderEmailTemplate(options.template, options.variables);
        html = rendered.html;
        text = rendered.text;
      }

      // Prepare mail options
      const mailOptions: nodemailer.SendMailOptions = {
        from: process.env.SMTP_FROM || `"ProCheff" <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html,
        text: text || this.htmlToText(html || ""),
        attachments: options.attachments,
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      // Get preview URL for test emails
      let previewUrl: string | undefined;
      if (this.testMode) {
        previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
        console.log("📧 Preview URL:", previewUrl);
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl,
      };
    } catch (error) {
      console.error("Failed to send email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, code: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.sendEmail({
      to: email,
      subject: "ProCheff - Email Doğrulama",
      template: "verification",
      variables: {
        code,
        email,
      },
    });

    return result;
  }

  /**
   * Send test email
   */
  async sendTestEmail(email: string): Promise<{ success: boolean; previewUrl?: string; error?: string }> {
    const result = await this.sendEmail({
      to: email,
      subject: "ProCheff - Test Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Test Email</h2>
          <p>Bu bir test emailidir. Email servisiniz başarıyla çalışıyor!</p>
          <p style="color: #6B7280;">Gönderilme zamanı: ${new Date().toLocaleString("tr-TR")}</p>
          <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
          <p style="font-size: 12px; color: #9CA3AF;">
            Bu email ProCheff sistemi tarafından gönderilmiştir.
          </p>
        </div>
      `,
    });

    return result;
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, "")
      .replace(/<script[^>]*>.*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Generate 6-digit verification code
   */
  static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Check if email is valid
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Export singleton instance
export const emailService = new EmailService();