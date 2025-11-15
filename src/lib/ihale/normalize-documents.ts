/**
 * Doküman Normalizasyonu
 * İhale belgelerinin AI → DB → UI arasında tek formatta tutulmasını sağlar
 */

export interface NormalizedDocument {
  title: string;
  url: string;
  type: 'teknik_sartname' | 'idari_sartname' | 'ek_dosya' | 'veri_dosyasi';
  filename?: string;
  fileType?: string;
}

export interface RawDocument {
  title?: string;
  name?: string;
  filename?: string;
  url?: string;
  type?: string;
  fileType?: string;
  [key: string]: unknown;
}

/**
 * Hash parametresinden ekap:// URL'sini decode et ve filename çıkar
 */
function decodeEkapHash(url: string): { decodedUrl: string; filename: string | null } {
  try {
    const urlObj = new URL(url);
    const hash = urlObj.searchParams.get('hash');
    
    if (hash) {
      // Base64 decode (e.g., ekap://2025/2025.1745912.idari.zip)
      const decoded = Buffer.from(hash, 'base64').toString('utf-8');
      
      // Filename extract et
      const filenameMatch = decoded.match(/([^/]+\.(pdf|docx?|xlsx?|txt|zip|rar|json|csv))$/i);
      if (filenameMatch) {
        return {
          decodedUrl: decoded,
          filename: filenameMatch[1]
        };
      }
      
      return { decodedUrl: decoded, filename: null };
    }
  } catch (error) {
    // URL parse hatası, devam et
  }
  
  return { decodedUrl: url, filename: null };
}

/**
 * Proxy URL'lerini normalize et
 */
function normalizeProxyUrl(url: string): string {
  // Eğer zaten proxy URL ise, içindeki gerçek URL'yi al
  if (url.includes('/api/ihale/proxy')) {
    try {
      const urlObj = new URL(url, 'http://localhost'); // Base URL gerekli
      const targetUrl = urlObj.searchParams.get('url');
      if (targetUrl) {
        return decodeURIComponent(targetUrl);
      }
    } catch (error) {
      // Parse hatası, orijinal URL'i döndür
    }
  }
  return url;
}

/**
 * ekap:// URL'lerini çöz
 * İhalebul.com'un özel protokolü: ekap:// -> downloadfile endpoint'ine hash parametresi ile dönüştür
 * Gerçek format: /downloadfile?hash=BASE64_ENCODED_ekap://...
 */
function resolveEkapUrl(url: string): string {
  // https://www.ihalebul.com/ekap://2025/2025.1656030.teknik.zip formatını çöz
  if (url.includes('ekap://')) {
    // ekap:// kısmını bul
    const match = url.match(/ekap:\/\/(.+?)(?:\?|$|#)/);
    if (match) {
      const ekapPath = match[1];
      // ekap://2025/2025.1656030.teknik.zip -> base64 encode -> hash parametresi
      const ekapUrl = `ekap://${ekapPath}`;
      // Base64 encode the ekap:// URL
      const encoded = Buffer.from(ekapUrl).toString('base64');
      // Use downloadfile endpoint with hash parameter (ihalebul.com's actual format)
      return `https://www.ihalebul.com/downloadfile?hash=${encoded}`;
    }
    
    // Alternatif: Direkt ekap:// ile başlıyorsa
    if (url.startsWith('ekap://')) {
      const encoded = Buffer.from(url).toString('base64');
      return `https://www.ihalebul.com/downloadfile?hash=${encoded}`;
    }
  }
  return url;
}

/**
 * Dokümanları normalize et - temizle ve standartlaştır
 * @param docs - Ham doküman dizisi
 * @returns Normalize edilmiş doküman dizisi
 */
export function normalizeDocuments(docs: RawDocument[]): NormalizedDocument[] {
  if (!Array.isArray(docs)) return [];

  const normalized = docs.map((d, idx) => {
    // Title'ı bul (title, name, filename sırasıyla)
    let title = (d.title || d.name || d.filename || '').trim();
    let url = (d.url || '').trim();
    let type: NormalizedDocument['type'] = 'ek_dosya';
    let extractedFilename = d.filename || d.name;
    const fileType = (d.fileType || '').toLowerCase();

    // 1. Proxy URL'leri normalize et (eğer proxy URL ise)
    url = normalizeProxyUrl(url);

    // 2. Hash parametresinden filename çıkar (URL'yi değiştirmeden)
    // Worker'dan gelen URL'ler zaten doğru formatta, sadece filename çıkarıyoruz
    const { decodedUrl, filename: hashFilename } = decodeEkapHash(url);
    if (hashFilename && !extractedFilename) {
      extractedFilename = hashFilename;
    }

    // 3. Relative URL düzeltme (sadece relative ise)
    if (url && !url.startsWith('http')) {
      const baseUrl = 'https://www.ihalebul.com';
      url = baseUrl + (url.startsWith('/') ? url : '/' + url);
    }
    
    // NOT: Worker'dan gelen URL'ler zaten doğru formatta (/downloadfile?hash=... veya /download/...)
    // Bu yüzden URL'yi değiştirmiyoruz, olduğu gibi kullanıyoruz

    // 5. Filename'i hash'ten veya URL'den çıkar
    if (!extractedFilename) {
      // URL'den filename çıkarmayı dene
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && lastPart.includes('.')) {
          extractedFilename = lastPart;
        }
      } catch (error) {
        // URL parse hatası
      }
    }

    // 6. Boş title düzelt
    if (!title || title.length < 3) {
      // Filename'den title oluştur
      if (extractedFilename && extractedFilename.length > 3) {
        title = extractedFilename.replace(/\.[^/.]+$/, ''); // Extension'ı kaldır
        title = title.replace(/[_-]/g, ' '); // Underscore ve tire'leri boşluk yap
        title = title.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' '); // Her kelimenin ilk harfini büyük yap
      } else {
        title = `Doküman ${idx + 1}`;
      }
    }

    // 7. Tip tespiti - title, URL ve filename'den çıkar
    const lower = (title + ' ' + url + ' ' + (extractedFilename || '') + ' ' + decodedUrl).toLowerCase();
    
    if (lower.includes('teknik') || lower.includes('technical')) {
      type = 'teknik_sartname';
    } else if (lower.includes('idari') || lower.includes('administrative') || lower.includes('yönetim')) {
      type = 'idari_sartname';
    } else if (lower.includes('.csv') || lower.includes('.json') || lower.includes('.txt') || lower.includes('veri') || lower.includes('data')) {
      type = 'veri_dosyasi';
    } else if (lower.includes('.pdf') || lower.includes('.doc') || lower.includes('.docx') || lower.includes('.xls') || lower.includes('.xlsx')) {
      type = 'ek_dosya';
    } else if (d.type) {
      // Mevcut type'ı kontrol et
      const existingType = d.type.toLowerCase();
      if (existingType.includes('teknik')) type = 'teknik_sartname';
      else if (existingType.includes('idari')) type = 'idari_sartname';
      else if (existingType.includes('veri') || existingType.includes('data')) type = 'veri_dosyasi';
    }

    // 8. FileType'ı filename'den çıkar
    let finalFileType = fileType;
    if (!finalFileType && extractedFilename) {
      const extMatch = extractedFilename.match(/\.([a-z0-9]+)$/i);
      if (extMatch) {
        finalFileType = extMatch[1].toLowerCase();
      }
    }

    return {
      title,
      url,
      type,
      filename: extractedFilename || undefined,
      fileType: finalFileType || undefined
    };
  });

  // Tekrarlayan URL'leri filtrele (son geleni tut)
  const urlMap = new Map<string, NormalizedDocument>();
  normalized.forEach(doc => {
    if (doc.url) {
      urlMap.set(doc.url, doc);
    }
  });

  // URL'si olmayan dokümanları da ekle
  const unique = Array.from(urlMap.values());
  normalized.forEach(doc => {
    if (!doc.url && !unique.find(u => u.title === doc.title)) {
      unique.push(doc);
    }
  });

  return unique;
}

