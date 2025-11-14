interface EmailTemplate {
  html: string;
  text: string;
}

const templates: Record<string, (variables: Record<string, any>) => EmailTemplate> = {
  verification: (vars) => ({
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">ProCheff</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 16px;">Email Doğrulama</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Merhaba,<br><br>
              Email adresinizi doğrulamak için aşağıdaki kodu kullanın:
            </p>

            <!-- Verification Code -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <div style="font-size: 36px; font-weight: bold; color: white; letter-spacing: 8px;">
                ${vars.code}
              </div>
            </div>

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
              Bu kod <strong>10 dakika</strong> boyunca geçerlidir. Eğer bu işlemi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              © 2025 ProCheff. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
ProCheff - Email Doğrulama

Email adresinizi doğrulamak için kod: ${vars.code}

Bu kod 10 dakika boyunca geçerlidir.
Eğer bu işlemi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.

© 2025 ProCheff
    `.trim(),
  }),

  welcome: (vars) => ({
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">ProCheff'e Hoş Geldiniz!</h1>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Merhaba ${vars.name || ""},<br><br>
              ProCheff ailesine hoş geldiniz! Artık ihale analiz ve maliyet hesaplama sistemimizi kullanmaya başlayabilirsiniz.
            </p>

            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <h3 style="color: #1f2937; margin-top: 0;">İlk Adımlar:</h3>
              <ul style="color: #4b5563; line-height: 1.8;">
                <li>İhale dosyalarınızı yükleyin</li>
                <li>Menü analizini başlatın</li>
                <li>Maliyet hesaplaması yapın</li>
                <li>Karar önerisini alın</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}"
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px;
                        font-weight: 600;">
                Sisteme Git
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              © 2025 ProCheff. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
ProCheff'e Hoş Geldiniz!

Merhaba ${vars.name || ""},

ProCheff ailesine hoş geldiniz! Artık ihale analiz ve maliyet hesaplama sistemimizi kullanmaya başlayabilirsiniz.

İlk Adımlar:
- İhale dosyalarınızı yükleyin
- Menü analizini başlatın
- Maliyet hesaplaması yapın
- Karar önerisini alın

Sisteme gitmek için: ${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}

© 2025 ProCheff
    `.trim(),
  }),

  notification: (vars) => ({
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h2 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">ProCheff Bildirimi</h2>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <h3 style="color: #1f2937; margin-top: 0;">${vars.title}</h3>
            <div style="color: #4b5563; font-size: 15px; line-height: 1.6;">
              ${vars.content}
            </div>

            ${vars.actionUrl ? `
              <div style="text-align: center; margin-top: 30px;">
                <a href="${vars.actionUrl}"
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                          color: white; text-decoration: none; padding: 10px 25px; border-radius: 6px;
                          font-weight: 500;">
                  ${vars.actionText || "Detayları Gör"}
                </a>
              </div>
            ` : ""}
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Bu bildirimi almak istemiyorsanız, ayarlardan bildirim tercihlerinizi güncelleyebilirsiniz.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
ProCheff Bildirimi

${vars.title}

${vars.content}

${vars.actionUrl ? `Detayları görmek için: ${vars.actionUrl}` : ""}

Bu bildirimi almak istemiyorsanız, ayarlardan bildirim tercihlerinizi güncelleyebilirsiniz.

© 2025 ProCheff
    `.trim(),
  }),
};

export function renderEmailTemplate(
  templateName: string,
  variables: Record<string, any>
): EmailTemplate {
  const template = templates[templateName];

  if (!template) {
    throw new Error(`Email template "${templateName}" not found`);
  }

  return template(variables);
}

export function getAvailableTemplates(): string[] {
  return Object.keys(templates);
}