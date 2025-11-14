/**
 * Test script for email notification service
 * Run with: node test-email.js
 */

const nodemailer = require("nodemailer");

async function testEmail() {
  console.log("🧪 Testing email service...\n");

  // Create test account if needed (using Ethereal Email for testing)
  const testAccount = await nodemailer.createTestAccount();

  console.log("✅ Test account created:");
  console.log("   Email:", testAccount.user);
  console.log("   Pass:", testAccount.pass);
  console.log();

  // Create transporter with test credentials
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  // Verify transporter
  console.log("🔧 Verifying transporter...");
  try {
    await transporter.verify();
    console.log("✅ Transporter verified successfully\n");
  } catch (error) {
    console.error("❌ Transporter verification failed:", error.message);
    return;
  }

  // Send test email
  console.log("📧 Sending test email...");
  const info = await transporter.sendMail({
    from: '"ProCheff Test" <test@procheff.com>',
    to: "user@example.com",
    subject: "Test Email from ProCheff",
    text: "This is a test email from ProCheff notification system.",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">ProCheff Test Email</h2>
        <p>This is a test email from the ProCheff notification system.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          This email was sent for testing purposes only.
        </p>
      </div>
    `,
  });

  console.log("✅ Email sent successfully!");
  console.log("   Message ID:", info.messageId);
  console.log("\n🌐 Preview URL:", nodemailer.getTestMessageUrl(info));
  console.log("   (Open this URL in your browser to see the email)\n");

  // Test verification code generation
  console.log("🔐 Testing verification code generation...");
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  console.log("   Generated code:", verificationCode);

  // Send verification email
  const verifyInfo = await transporter.sendMail({
    from: '"ProCheff" <noreply@procheff.com>',
    to: "user@example.com",
    subject: "Doğrulama Kodu - ProCheff",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5;">ProCheff</h1>
        </div>

        <div style="background: #F9FAFB; border-radius: 8px; padding: 20px; text-align: center;">
          <h2 style="color: #333; margin-bottom: 10px;">Doğrulama Kodunuz</h2>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #4F46E5; margin: 20px 0;">
            ${verificationCode}
          </div>
          <p style="color: #666; font-size: 14px;">
            Bu kod 10 dakika boyunca geçerlidir.
          </p>
        </div>

        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center;">
          <p style="color: #9CA3AF; font-size: 12px;">
            Bu e-postayı siz talep etmediyseniz, lütfen dikkate almayın.
          </p>
        </div>
      </div>
    `,
  });

  console.log("✅ Verification email sent!");
  console.log("   Message ID:", verifyInfo.messageId);
  console.log("\n🌐 Preview URL:", nodemailer.getTestMessageUrl(verifyInfo));
  console.log("   (Open this URL in your browser to see the verification email)\n");

  console.log("🎉 All email tests completed successfully!");
}

// Run the test
testEmail().catch(console.error);