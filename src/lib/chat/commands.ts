/**
 * Chat Command System
 * Simple command parser for chat interface
 * Note: SQLite-dependent modules are imported dynamically to avoid client-side loading
 */

export interface CommandResult {
  type: 'success' | 'error' | 'info' | 'export';
  message: string;
  data?: any;
  downloadUrl?: string;
  filename?: string;
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
      return await exportCommand(args);

    case 'metrik':
    case 'metrics':
      return await metricsCommand();

    case 'list':
    case 'liste':
      return await listCommand();

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

async function exportCommand(args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      type: 'info',
      message: '## 📤 Export Komutları\n\n' +
        '**Kullanım:**\n' +
        '- `/export pdf <analiz_id>` - PDF rapor oluştur\n' +
        '- `/export excel <analiz_id>` - Excel dosyası oluştur\n' +
        '- `/export csv <analiz_id>` - CSV dosyası oluştur\n' +
        '- `/export json <analiz_id>` - JSON dosyası oluştur\n\n' +
        '**Özel Komutlar:**\n' +
        '- `/export summary` - Son 10 analiz özeti\n' +
        '- `/export comparison <id1,id2,id3>` - Karşılaştırma raporu\n' +
        '- `/export trend` - Son 30 gün trend analizi\n\n' +
        '*İpucu: Analiz ID\'lerini /list komutu ile görebilirsiniz*'
    };
  }

  const format = args[0].toLowerCase();
  const analysisId = args[1];

  // Validate format
  if (!['pdf', 'excel', 'csv', 'json'].includes(format)) {
    return {
      type: 'error',
      message: `Geçersiz format: ${format}\n` +
        'Desteklenen formatlar: pdf, excel, csv, json'
    };
  }

  try {
    // Dynamic import to avoid SQLite loading on client-side
    const { exportHandler } = await import('./export-handler');

    // Determine export type and options
    const options: any = {
      format: format as 'pdf' | 'excel' | 'csv' | 'json'
    };

    // Handle special cases
    if (analysisId === 'summary') {
      options.type = 'summary';
    } else if (analysisId === 'trend') {
      options.type = 'trend';
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      options.dateRange = {
        start: thirtyDaysAgo.toISOString(),
        end: new Date().toISOString()
      };
    } else if (analysisId && analysisId.includes(',')) {
      // Comparison
      options.type = 'comparison';
      options.compareIds = analysisId.split(',').map(id => id.trim());
    } else if (analysisId) {
      // Single analysis
      options.analysisId = analysisId;
    }

    // Call export handler
    const result = await exportHandler.export(options);

    if (!result.success) {
      return {
        type: 'error',
        message: `Export hatası: ${result.error}`
      };
    }

    // Convert buffer to base64 for download
    if (result.buffer) {
      const base64 = result.buffer.toString('base64');
      const dataUrl = `data:${result.mimeType};base64,${base64}`;

      return {
        type: 'export',
        message: `## ✅ Export Başarılı!\n\n` +
          `**Dosya:** ${result.filename}\n` +
          `**Format:** ${format.toUpperCase()}\n` +
          `**Boyut:** ${Math.round(result.buffer.length / 1024)} KB\n\n` +
          `[📥 İndir](${dataUrl})`,
        downloadUrl: dataUrl,
        filename: result.filename,
        data: result
      };
    }

    return {
      type: 'success',
      message: 'Export tamamlandı',
      data: result
    };
  } catch (error) {
    return {
      type: 'error',
      message: `Export işlemi başarısız: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
    };
  }
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

async function listCommand(): Promise<CommandResult> {
  try {
    // Fetch recent analyses from database
    const { getDB } = await import('@/lib/db/sqlite-client');
    const db = getDB();

    const stmt = db.prepare(`
      SELECT id, created_at, status,
        json_extract(data_pool, '$.basicInfo.kurum') as kurum,
        json_extract(data_pool, '$.basicInfo.butce') as butce,
        json_extract(deep, '$.karar_onerisi.karar') as karar
      FROM analysis_results
      ORDER BY created_at DESC
      LIMIT 10
    `);

    const analyses = stmt.all();

    if (analyses.length === 0) {
      return {
        type: 'info',
        message: '## 📋 Analiz Listesi\n\n' +
          '*Henüz analiz bulunmuyor.*\n\n' +
          'İhale analizi yapmak için:\n' +
          '1. İhale sayfasına gidin\n' +
          '2. Bir ihale seçin\n' +
          '3. Analiz başlatın'
      };
    }

    let listMessage = '## 📋 Son Analizler\n\n';

    analyses.forEach((analysis: any, idx: number) => {
      const date = new Date(analysis.created_at).toLocaleDateString('tr-TR');
      const time = new Date(analysis.created_at).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      listMessage += `**${idx + 1}. ${analysis.kurum || 'İsimsiz İhale'}**\n`;
      listMessage += `   📌 ID: \`${analysis.id}\`\n`;
      listMessage += `   💰 Bütçe: ${analysis.butce || 'Belirtilmemiş'}\n`;
      listMessage += `   🎯 Karar: ${analysis.karar || 'Bekliyor'}\n`;
      listMessage += `   📅 Tarih: ${date} ${time}\n`;
      listMessage += `   📊 Durum: ${analysis.status}\n\n`;
    });

    listMessage += '*Export için: `/export <format> <id>` komutunu kullanın*';

    return {
      type: 'success',
      message: listMessage,
      data: analyses
    };
  } catch (error) {
    return {
      type: 'error',
      message: `Liste yüklenemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
    };
  }
}

function helpCommand(): CommandResult {
  return {
    type: 'info',
    message: `## 💬 Kullanılabilir Komutlar\n\n` +
      `### Analiz\n` +
      `- \`/list\` - Son analizleri listele\n` +
      `- \`/export <format> <id>\` - Analiz raporu oluştur\n\n` +
      `### Piyasa\n` +
      `- \`/fiyat <ürün>\` - Ürün fiyatı sorgula\n\n` +
      `### Sistem\n` +
      `- \`/metrik\` - Sistem metrikleri\n` +
      `- \`/alert\` - Alert kontrolü çalıştır\n\n` +
      `### Export\n` +
      `- \`/export summary\` - Özet rapor\n` +
      `- \`/export trend\` - Trend analizi\n` +
      `- \`/rapor\` - Rapor bilgisi\n\n` +
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
    '/list',
    '/export',
    '/fiyat',
    '/rapor',
    '/alert',
    '/metrik',
    '/help'
  ];

  if (input.length <= 1) return commands;

  return commands.filter(cmd =>
    cmd.toLowerCase().startsWith(input.toLowerCase())
  );
}
