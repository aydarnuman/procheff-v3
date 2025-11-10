import { Parser } from 'json2csv';

export interface TenderExportData {
  id: string;
  tenderNumber: string;
  title: string;
  organization: string;
  city: string;
  tenderType: string;
  partialBidAllowed: boolean;
  publishDate: string;
  tenderDate: string;
  daysRemaining: number | null;
  url: string;
}

/**
 * Convert tender data to CSV format
 */
export function toCSV(tenders: TenderExportData[]): string {
  const fields = [
    { label: 'ID', value: 'id' },
    { label: 'İlan No', value: 'tenderNumber' },
    { label: 'Başlık', value: 'title' },
    { label: 'İdare', value: 'organization' },
    { label: 'Şehir', value: 'city' },
    { label: 'İhale Türü', value: 'tenderType' },
    { label: 'Kısmi Teklif', value: 'partialBidAllowed' },
    { label: 'Yayın Tarihi', value: 'publishDate' },
    { label: 'Teklif Tarihi', value: 'tenderDate' },
    { label: 'Kalan Gün', value: 'daysRemaining' },
    { label: 'URL', value: 'url' },
  ];

  const parser = new Parser({ fields, withBOM: true }); // BOM for Excel UTF-8 support
  const csv = parser.parse(tenders);
  return csv;
}

/**
 * Convert tender data to TXT format (human-readable report)
 */
export function toTXT(tenders: TenderExportData[]): string {
  let output = '';
  output += '═══════════════════════════════════════════════════════════\n';
  output += '           İHALEBUL - İHALE LİSTESİ RAPORU\n';
  output += '═══════════════════════════════════════════════════════════\n';
  output += `Toplam İhale Sayısı: ${tenders.length}\n`;
  output += `Rapor Tarihi: ${new Date().toLocaleString('tr-TR')}\n`;
  output += '═══════════════════════════════════════════════════════════\n\n';

  tenders.forEach((tender, index) => {
    output += `${index + 1}. İHALE\n`;
    output += `${'─'.repeat(60)}\n`;
    output += `📋 İlan No       : ${tender.tenderNumber}\n`;
    output += `📌 Başlık        : ${tender.title}\n`;
    output += `🏢 İdare         : ${tender.organization}\n`;
    output += `📍 Şehir         : ${tender.city}\n`;
    output += `📝 İhale Türü    : ${tender.tenderType}\n`;
    output += `✅ Kısmi Teklif  : ${tender.partialBidAllowed ? 'Evet' : 'Hayır'}\n`;
    output += `📅 Yayın Tarihi  : ${tender.publishDate}\n`;
    output += `⏰ Teklif Tarihi : ${tender.tenderDate}\n`;

    if (tender.daysRemaining !== null) {
      const daysText = tender.daysRemaining === 0
        ? 'BUGÜN'
        : tender.daysRemaining > 0
          ? `${tender.daysRemaining} gün kaldı`
          : `${Math.abs(tender.daysRemaining)} gün geçti (Süresi dolmuş)`;
      output += `⏳ Durum         : ${daysText}\n`;
    }

    output += `🔗 Link          : ${tender.url}\n`;
    output += '\n';
  });

  output += '═══════════════════════════════════════════════════════════\n';
  output += `Rapor Sonu - ${tenders.length} ihale listelendi\n`;
  output += '═══════════════════════════════════════════════════════════\n';

  return output;
}

/**
 * Convert tender data to JSON format (pretty-printed)
 */
export function toJSON(tenders: TenderExportData[]): string {
  return JSON.stringify(
    {
      metadata: {
        totalCount: tenders.length,
        exportDate: new Date().toISOString(),
        source: 'ihalebul.com',
      },
      tenders,
    },
    null,
    2
  );
}
