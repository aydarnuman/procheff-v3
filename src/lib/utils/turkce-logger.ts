/**
 * Türkçe ve açıklayıcı log mesajları için utility
 * Hem backend hem frontend tarafında kullanılabilir
 */

// Renk kodları (ANSI escape codes for terminal, CSS for browser)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Text colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
};

// Browser console styles
const browserStyles = {
  basla: 'color: #00bcd4; font-weight: bold; font-size: 12px;',
  basarili: 'color: #4caf50; font-weight: bold; font-size: 12px;',
  hata: 'color: #f44336; font-weight: bold; font-size: 12px;',
  uyari: 'color: #ff9800; font-weight: bold; font-size: 12px;',
  bilgi: 'color: #2196f3; font-weight: bold; font-size: 12px;',
  ilerleme: 'color: #9c27b0; font-weight: bold; font-size: 12px;',
  detay: 'color: #666; font-size: 11px; margin-left: 20px;'
};

// Browser mı yoksa Node.js mi kontrol et
const isBrowser = typeof window !== 'undefined';

export class TurkceLogger {
  private static formatZaman(): string {
    const now = new Date();
    const saat = String(now.getHours()).padStart(2, '0');
    const dakika = String(now.getMinutes()).padStart(2, '0');
    const saniye = String(now.getSeconds()).padStart(2, '0');
    const milisaniye = String(now.getMilliseconds()).padStart(3, '0');
    return `${saat}:${dakika}:${saniye}.${milisaniye}`;
  }

  private static formatDetay(detay: any): string {
    if (!detay) return '';
    
    if (typeof detay === 'string') {
      return detay;
    }
    
    if (typeof detay === 'object') {
      try {
        return JSON.stringify(detay, null, 2);
      } catch {
        return String(detay);
      }
    }
    
    return String(detay);
  }

  private static log(emoji: string, mesaj: string, renk: string, style: string, detay?: any) {
    const zaman = this.formatZaman();
    const fullMesaj = `${emoji} [${zaman}] ${mesaj}`;
    
    if (isBrowser) {
      // Browser console
      console.log(`%c${fullMesaj}`, style);
      if (detay) {
        const detayStr = this.formatDetay(detay);
        if (typeof detay === 'object' && detay !== null) {
          console.log('   📋 Detay:', detay);
        } else {
          console.log(`%c   📋 Detay: ${detayStr}`, browserStyles.detay);
        }
      }
    } else {
      // Terminal console
      console.log(`${renk}${fullMesaj}${colors.reset}`);
      if (detay) {
        const detayStr = this.formatDetay(detay);
        console.log(`${colors.dim}   📋 Detay: ${detayStr}${colors.reset}`);
      }
    }
  }

  static islemBaslat(islem: string, detay?: any) {
    this.log('🔄', `${islem} başlatılıyor...`, colors.cyan, browserStyles.basla, detay);
  }

  static basarili(islem: string, sonuc?: any) {
    this.log('✅', `${islem} tamamlandı`, colors.green, browserStyles.basarili, sonuc);
  }

  static hata(islem: string, hata: any) {
    const hataMesaj = hata?.message || hata;
    const fullMesaj = `${islem} başarısız${hataMesaj ? ': ' + hataMesaj : ''}`;
    
    if (isBrowser) {
      console.error(`%c❌ [${this.formatZaman()}] ${fullMesaj}`, browserStyles.hata);
      if (hata && typeof hata === 'object') {
        console.error('   🐛 Hata detayı:', hata);
      }
    } else {
      console.error(`${colors.red}❌ [${this.formatZaman()}] ${fullMesaj}${colors.reset}`);
      if (hata && typeof hata === 'object') {
        console.error(`${colors.dim}   🐛 Hata detayı:${colors.reset}`, hata);
      }
    }
  }

  static uyari(mesaj: string, detay?: any) {
    this.log('⚠️ ', mesaj, colors.yellow, browserStyles.uyari, detay);
  }

  static bilgi(mesaj: string, detay?: any) {
    this.log('ℹ️ ', mesaj, colors.blue, browserStyles.bilgi, detay);
  }

  static ilerleme(yuzde: number, islem: string) {
    const bar = '█'.repeat(Math.floor(yuzde / 5)) + '░'.repeat(20 - Math.floor(yuzde / 5));
    const mesaj = `${islem}: [${bar}] %${yuzde}`;
    this.log('📈', mesaj, colors.magenta, browserStyles.ilerleme);
  }

  // Özel kategoriler için yardımcı metodlar
  static onbellek = {
    kaydet: (veri?: string) => {
      TurkceLogger.bilgi(`Önbelleğe kaydedildi${veri ? ': ' + veri : ''}`, { emoji: '💾' });
    },
    yukle: (veri?: string) => {
      TurkceLogger.bilgi(`Önbellekten yüklendi${veri ? ': ' + veri : ''}`, { emoji: '📦' });
    },
    temizle: (veri?: string) => {
      TurkceLogger.bilgi(`Önbellek temizlendi${veri ? ': ' + veri : ''}`, { emoji: '🧹' });
    }
  };

  static veritabani = {
    baglan: () => TurkceLogger.islemBaslat('Veritabanı bağlantısı kuruluyor'),
    baglantiBasarili: () => TurkceLogger.basarili('Veritabanı bağlantısı kuruldu'),
    kaydet: (tablo: string, kayitSayisi?: number) => {
      TurkceLogger.islemBaslat(`${tablo} tablosuna kayıt`, { kayitSayisi });
    },
    kayitBasarili: (tablo: string, kayitSayisi?: number) => {
      TurkceLogger.basarili(`${tablo} tablosuna kayıt`, { kayitSayisi });
    },
    sorgula: (tablo: string) => TurkceLogger.islemBaslat(`${tablo} tablosu sorgulanıyor`),
    sorguBasarili: (tablo: string, sonucSayisi: number) => {
      TurkceLogger.basarili(`${tablo} sorgusu`, { sonucSayisi });
    }
  };

  static ihale = {
    listeGetir: () => TurkceLogger.islemBaslat('İhale listesi getiriliyor'),
    listeBasarili: (ihaleSayisi: number) => {
      TurkceLogger.basarili('İhale listesi alındı', { toplamIhale: ihaleSayisi });
    },
    detayGetir: (ihaleNo: string) => {
      TurkceLogger.islemBaslat('İhale detayı getiriliyor', { ihaleNo });
    },
    detayBasarili: (ihaleBaslik: string) => {
      TurkceLogger.basarili('İhale detayı alındı', { baslik: ihaleBaslik?.substring(0, 50) + '...' });
    },
    belgeIndir: (belgeAdi: string) => {
      TurkceLogger.islemBaslat('İhale belgesi indiriliyor', { belge: belgeAdi });
    },
    belgeBasarili: (belgeAdi: string, boyut?: number) => {
      TurkceLogger.basarili('İhale belgesi indirildi', { belge: belgeAdi, boyut });
    }
  };

  static ai = {
    ocrBaslat: (motor: 'tesseract' | 'gemini', dil?: string) => {
      TurkceLogger.islemBaslat(`${motor === 'tesseract' ? 'Tesseract' : 'Gemini Vision'} OCR işlemi`, { dil });
    },
    ocrIlerleme: (yuzde: number) => {
      TurkceLogger.ilerleme(yuzde, 'OCR işlemi');
    },
    ocrBasarili: (karakterSayisi: number, sure?: number) => {
      TurkceLogger.basarili('OCR işlemi', { karakterSayisi, sure: sure ? `${sure}ms` : undefined });
    },
    analiz: (tur: string) => {
      TurkceLogger.islemBaslat(`Yapay zeka ${tur} analizi`);
    },
    analizBasarili: (tur: string, sonuc?: any) => {
      TurkceLogger.basarili(`Yapay zeka ${tur} analizi`, sonuc);
    },
    parseHTML: () => TurkceLogger.islemBaslat('HTML içeriği ayrıştırılıyor'),
    parseBasarili: (bolumSayisi: number, tabloSayisi: number) => {
      TurkceLogger.basarili('HTML ayrıştırma', { bolumler: bolumSayisi, tablolar: tabloSayisi });
    }
  };

  static dosya = {
    yukle: (dosyaAdi: string, boyut?: number) => {
      TurkceLogger.islemBaslat('Dosya yükleniyor', { dosya: dosyaAdi, boyut });
    },
    yukleBasarili: (dosyaAdi: string) => {
      TurkceLogger.basarili('Dosya yüklendi', { dosya: dosyaAdi });
    },
    isle: (dosyaAdi: string, tur: string) => {
      TurkceLogger.islemBaslat(`${tur} dosyası işleniyor`, { dosya: dosyaAdi });
    },
    isleBasarili: (dosyaAdi: string, sonuc?: any) => {
      TurkceLogger.basarili('Dosya işlendi', { dosya: dosyaAdi, ...sonuc });
    },
    zipAc: (dosyaAdi: string) => {
      TurkceLogger.islemBaslat('ZIP dosyası açılıyor', { dosya: dosyaAdi });
    },
    zipBasarili: (dosyaSayisi: number) => {
      TurkceLogger.basarili('ZIP dosyası açıldı', { cikarilanDosyalar: dosyaSayisi });
    }
  };

  static auth = {
    girisYap: () => TurkceLogger.islemBaslat('Kullanıcı girişi yapılıyor'),
    girisBasarili: (kullaniciAdi?: string) => {
      TurkceLogger.basarili('Kullanıcı girişi başarılı', { kullanici: kullaniciAdi });
    },
    cikisYap: () => TurkceLogger.bilgi('Kullanıcı çıkış yaptı'),
    oturumKontrol: () => TurkceLogger.islemBaslat('Oturum kontrol ediliyor'),
    oturumGecerli: () => TurkceLogger.basarili('Oturum geçerli'),
    oturumGecersiz: () => TurkceLogger.uyari('Oturum süresi dolmuş, yeniden giriş yapılması gerekiyor')
  };

  static api = {
    istek: (metod: string, url: string, parametreler?: any) => {
      TurkceLogger.islemBaslat(`${metod} isteği gönderiliyor`, { url, parametreler });
    },
    yanit: (metod: string, url: string, durum: number, sure?: number) => {
      const emoji = durum >= 200 && durum < 300 ? '✅' : durum >= 400 ? '❌' : '⚠️';
      const mesaj = `${metod} ${url} - Durum: ${durum}${sure ? ` (${sure}ms)` : ''}`;
      
      if (durum >= 200 && durum < 300) {
        TurkceLogger.basarili(mesaj);
      } else if (durum >= 400) {
        TurkceLogger.hata(mesaj, { durum });
      } else {
        TurkceLogger.uyari(mesaj);
      }
    }
  };

  // Progress bar helper
  static progressBar(current: number, total: number, label: string) {
    const percentage = Math.round((current / total) * 100);
    this.ilerleme(percentage, `${label} (${current}/${total})`);
  }
}

// Kısa yol için export
export const Log = TurkceLogger;



