/**
 * Chat Command System
 * Simple command parser for chat interface
 */

export interface CommandResult {
  type: 'success' | 'error' | 'info';
  message: string;
  data?: any;
}

export async function executeCommand(command: string): Promise<CommandResult> {
  const parts = command.slice(1).trim().split(' ');
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case 'fiyat':
    case 'price':
      return await priceCommand(args.join(' '));

    case 'rapor':
    case 'report':
      return reportCommand();

    case 'alert':
      return await alertCommand();

    case 'export':
      return exportCommand(args[0]);

    case 'metrik':
    case 'metrics':
      return await metricsCommand();

    case 'help':
    case 'yardim':
      return helpCommand();

    default:
      return {
        type: 'error',
        message: `Bilinmeyen komut: /${cmd}\nYardım için /help yazın.`
      };
  }
}

async function priceCommand(product: string): Promise<CommandResult> {
  if (!product) {
    return {
      type: 'error',
      message: 'Kullanım: /fiyat <ürün adı>\nÖrnek: /fiyat domates'
    };
  }

  try {
    const response = await fetch('/api/market/price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product })
    });

    const data = await response.json();

    if (data.ok) {
      const price = data.data;
      return {
        type: 'success',
        message: `## 💰 ${product.toUpperCase()} Fiyat Bilgisi\n\n` +
          `**Güncel Fiyat:** ${price.unit_price} TL/${price.unit}\n` +
          `**Kaynak:** ${price.source}\n` +
          `**Güven:** ${(price.confidence * 100).toFixed(0)}%\n\n` +
          `*Son güncelleme: ${new Date(price.updated_at).toLocaleString('tr-TR')}*`,
        data: price
      };
    } else {
      return {
        type: 'error',
        message: `Fiyat bulunamadı: ${data.message}`
      };
    }
  } catch (error) {
    return {
      type: 'error',
      message: 'Fiyat sorgulanamadı. Lütfen tekrar deneyin.'
    };
  }
}

function reportCommand(): CommandResult {
  return {
    type: 'info',
    message: '## 📄 Rapor Oluştur\n\n' +
      'Rapor oluşturmak için:\n' +
      '1. Analiz sayfasına gidin\n' +
      '2. Export butonuna tıklayın\n' +
      '3. PDF veya Excel seçin\n\n' +
      '*Yakında direkt chat\'ten rapor oluşturabileceksiniz!*'
  };
}

async function alertCommand(): Promise<CommandResult> {
  try {
    const response = await fetch('/api/alerts', {
      method: 'POST'
    });

    const data = await response.json();

    if (data.success) {
      return {
        type: 'success',
        message: `## 🔔 Alert Kontrolü Tamamlandı\n\n` +
          `**Kontrol Edilen Kural:** ${data.checked || 0}\n` +
          `**Yeni Bildirim:** ${data.created || 0}\n\n` +
          `Bildirimleri görmek için [Bildirimler](/notifications) sayfasına gidin.`,
        data
      };
    } else {
      return {
        type: 'error',
        message: 'Alert kontrolü başarısız oldu.'
      };
    }
  } catch (error) {
    return {
      type: 'error',
      message: 'Alert sistemi şu anda kullanılamıyor.'
    };
  }
}

function exportCommand(format?: string): CommandResult {
  if (!format) {
    return {
      type: 'info',
      message: '## 📤 Export Formatları\n\n' +
        'Kullanılabilir formatlar:\n' +
        '- `/export pdf` - PDF rapor\n' +
        '- `/export excel` - Excel dosyası\n' +
        '- `/export csv` - CSV dosyası'
    };
  }

  return {
    type: 'info',
    message: `## 📤 ${format.toUpperCase()} Export\n\n` +
      'Export için analiz sayfasından işlem yapın.\n' +
      '*Direkt export özelliği yakında!*'
  };
}

async function metricsCommand(): Promise<CommandResult> {
  try {
    const response = await fetch('/api/metrics');
    const data = await response.json();

    if (data.success) {
      const m = data.metrics;
      return {
        type: 'success',
        message: `## 📊 Sistem Metrikleri\n\n` +
          `**Toplam Log:** ${m.total_logs}\n` +
          `**Hata:** ${m.errors}\n` +
          `**Başarı Oranı:** ${m.success_rate}%\n` +
          `**Son 24s:** ${m.last_24h} işlem\n` +
          `**Ort. Süre:** ${m.avg_duration_ms}ms\n` +
          `**Ort. Token:** ${m.avg_tokens}\n\n` +
          `Detaylı bilgi için [Monitoring](/monitor) sayfasına gidin.`,
        data: m
      };
    } else {
      return {
        type: 'error',
        message: 'Metrikler yüklenemedi.'
      };
    }
  } catch (error) {
    return {
      type: 'error',
      message: 'Metrik sistemi kullanılamıyor.'
    };
  }
}

function helpCommand(): CommandResult {
  return {
    type: 'info',
    message: `## 💬 Kullanılabilir Komutlar\n\n` +
      `### Piyasa\n` +
      `- \`/fiyat <ürün>\` - Ürün fiyatı sorgula\n\n` +
      `### Sistem\n` +
      `- \`/metrik\` - Sistem metrikleri\n` +
      `- \`/alert\` - Alert kontrolü çalıştır\n\n` +
      `### Export\n` +
      `- \`/export <format>\` - Export bilgisi\n` +
      `- \`/rapor\` - Rapor oluştur\n\n` +
      `### Diğer\n` +
      `- \`/help\` - Bu yardım mesajı\n\n` +
      `*İpucu: Komutları yazmaya başladığınızda otomatik tamamlama görünecek!*`
  };
}

export function isCommand(message: string): boolean {
  return message.trim().startsWith('/');
}

export function getCommandSuggestions(input: string): string[] {
  const commands = [
    '/fiyat',
    '/rapor',
    '/alert',
    '/export',
    '/metrik',
    '/help'
  ];

  if (input.length <= 1) return commands;

  return commands.filter(cmd =>
    cmd.toLowerCase().startsWith(input.toLowerCase())
  );
}
