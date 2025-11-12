/**
 * Document pattern definitions for Turkish tender documents
 * Includes variations, synonyms, and common misspellings
 */

/**
 * Document type patterns with Turkish variations
 * Each pattern array contains regex patterns that match different variations
 */
export const DOCUMENT_PATTERNS = {
  zeylname: [
    /\bzeyl(?:name)?\b/i,
    /\b(zeyil|zeyilname)\b/i,
    /\bek\s*ilan\b/i,
    /\bdegisiklik\s*ilan[ıi]?\b/i,
    /\bduzeltme\s*ilan[ıi]?\b/i,
    /\baddendum\b/i,
    /\bamendment\b/i,
    /\brevize\b/i,
    /\bguncel(?:lenmis|leme)?\b/i,
    /\bdegistirilmis\b/i,
    /\biptal\s*ilan[ıi]?\b/i,
    /\berteleme\s*ilan[ıi]?\b/i
  ],
  idari: [
    /\bidari\s*sartname\b/i,
    /\bidari\s*ve\s*mali\s*sartname\b/i,
    /\badministrative\s*specification\b/i,
    /\bidari\s*husus(lar)?\b/i,
    /\bidari\s*sart(lar)?\b/i,
    /\bgenel\s*sartname\b/i,
    /\bidari\s*teknik\s*sartname\b/i
  ],
  teknik: [
    /\bteknik\s*sartname\b/i,
    /\btechnical\s*specification\b/i,
    /\bteknik\s*ozellik(ler)?\b/i,
    /\bteknik\s*sart(lar)?\b/i,
    /\bozel\s*teknik\s*sartname\b/i,
    /\bteknik\s*dokuman\b/i,
    /\bteknik\s*detay(lar)?\b/i
  ],
  sozlesme: [
    /\bsozlesme\s*tasla[gğ][ıi]\b/i,
    /\bcontract\s*draft\b/i,
    /\bmukavele\s*tasla[gğ][ıi]\b/i,
    /\bsozlesme\s*orne[gğ]i\b/i,
    /\bsozlesme\s*metni\b/i,
    /\bsozlesme\s*sureti\b/i
  ],
  ihale: [
    /\bihale\s*ilan[ıi]\b/i,
    /\bihale\s*dokuman[ıi]\b/i,
    /\btender\s*announcement\b/i,
    /\bihale\s*davet\b/i,
    /\bihale\s*duyuru(su)?\b/i,
    /\bilan\s*metni\b/i,
    /\b(yemek|g[ıi]da|catering|iaşe)\s*(hizmeti|alınacaktır|al[ıi]m[ıi]|ihalesi)\b/i,
    /\b\d{4}_\d{7}_\d{4}-\d{2}-\d{2}\b/i, // İhalebul format: 2025_1727143_2025-11-11
    /\bikn[:\s]*\d+/i, // İhale kayıt numarası
    /\bkamu\s*ihale/i
  ],
  fatura: [
    /\bfatura\b/i,
    /\binvoice\b/i,
    /\bfatura\s*orne[gğ]i\b/i,
    /\bfatura\s*bilgi(leri)?\b/i,
    /\bvergi\s*fatura(s[ıi])?\b/i
  ],
  menu: [
    /\bmenu\b/i,
    /\byemek\s*liste(si)?\b/i,
    /\byemek\s*menu(su)?\b/i,
    /\bgida\s*liste(si)?\b/i,
    /\byiyecek\s*liste(si)?\b/i,
    /\bmutfak\s*liste(si)?\b/i,
    /\bg[uü]nl[uü]k\s*(yemek\s*)?men[uü](s[uü])?\b/i,
    /\bhaftal[ıi]k\s*(yemek\s*)?men[uü](s[uü])?\b/i,
    /\bkahvalt[ıi]\s*(men[uü]s[uü])?\b/i,
    /\b[oö][gğ]le\s*(yeme[gğ]i|men[uü]s[uü])?\b/i,
    /\bak[sş]am\s*(yeme[gğ]i|men[uü]s[uü])?\b/i,
    /\byemek\s*plan[ıi]\b/i,
    /\bbes?lenme\s*(plan[ıi]|liste(si)?)\b/i,
    /\bdiyet\s*liste(si)?\b/i
  ],
  rapor: [
    /\brapor\b/i,
    /\breport\b/i,
    /\bdegerlendirme\s*rapor(u)?\b/i,
    /\banaliz\s*rapor(u)?\b/i,
    /\bteknik\s*rapor\b/i,
    /\bfizibilite\s*rapor(u)?\b/i
  ],
  teklif: [
    /\bteklif\b/i,
    /\bproposal\b/i,
    /\bfiyat\s*teklif(i)?\b/i,
    /\bteklif\s*mektub(u)?\b/i,
    /\bteklif\s*dosya(s[ıi])?\b/i,
    /\bprice\s*offer\b/i
  ],
  makine: [
    /\bmakine\s*liste(si)?\b/i,
    /\bekipman\s*liste(si)?\b/i,
    /\barac\s*liste(si)?\b/i,
    /\bdemirba[sş]\s*liste(si)?\b/i,
    /\btechizat\s*liste(si)?\b/i,
    /\bmalzeme\s*liste(si)?\b/i
  ],
  personel: [
    /\bpersonel\s*liste(si)?\b/i,
    /\bpersonel\s*cetvel(i)?\b/i,
    /\bkadro\s*cetvel(i)?\b/i,
    /\bcal[ıi][sş]an\s*liste(si)?\b/i,
    /\bistihdam\s*liste(si)?\b/i,
    /\binsan\s*kaynak(lar[ıi])?\b/i
  ]
};

/**
 * Amendment-specific words for detecting changes/updates
 */
export const AMENDMENT_WORDS = [
  "zeyl", "zeyil", "zeyilname", "duzeltme ilan", "düzeltme ilan",
  "degisiklik", "değişiklik", "addendum", "amendment", "revize", 
  "guncellendi", "güncellendi", "guncellenmis", "güncellenmis", 
  "iptal", "ertelendi", "erteleme", "degistirildi", "değiştirildi",
  "tadilat", "modifikasyon", "yenileme", "guncelleme", "güncelleme"
];

/**
 * Words indicating changes or modifications in content
 */
export const DELTA_WORDS = [
  "iptal", "revize", "degistirildi", "değiştirildi", "degisti", "değişti",
  "ertelendi", "guncellendi", "güncellendi", "guncellenmis", "güncellenmis",
  "yenilendi", "tadil edildi", "modifiye edildi", "duzeltildi", "düzeltildi",
  "kaldırıldı", "kaldirildi", "eklendi", "cikarildi", "çıkarıldı"
];

/**
 * Reference keywords for tender documents
 */
export const REFERENCE_KEYWORDS = [
  "ihale kayit no", "ihale kayıt no", "ikn", "ilan no", "ilan numarası",
  "ihale no", "ihale numarası", "referans no", "dosya no", "evrak no",
  "tender no", "tender number", "reference number", "kik no"
];

/**
 * Date-related keywords
 */
export const DATE_KEYWORDS = [
  "tarih", "tarihi", "son basvuru", "son başvuru", "ihale tarihi",
  "teslim tarihi", "gecerlilik suresi", "geçerlilik süresi", "vade",
  "deadline", "due date", "submission date", "validity period"
];

/**
 * Cost/price related keywords
 */
export const COST_KEYWORDS = [
  "tutar", "maliyet", "fiyat", "bedel", "ucret", "ücret",
  "tahmini bedel", "yaklaşık maliyet", "yaklasik maliyet",
  "toplam tutar", "kdv", "vergi", "teminat", "depozito",
  "cost", "price", "amount", "fee", "total"
];

/**
 * Document header patterns for quick identification
 */
export const HEADER_PATTERNS = {
  zeylname: /^\s*(zey[il]+(name)?|d[uü]zeltme\s*ilan[ıi]?|addendum|amendment)\b/im,
  idari: /^\s*(idari\s*(ve\s*mali\s*)?[sş]artname|administrative\s*specification)\b/im,
  teknik: /^\s*(teknik\s*[sş]artname|technical\s*specification)\b/im,
  sozlesme: /^\s*(s[oö]zle[sş]me\s*tasla[gğ][ıi]|contract\s*draft)\b/im,
  ihale: /^\s*(ihale\s*ilan[ıi]|tender\s*announcement)\b/im
};

/**
 * Common file name patterns
 */
export const FILENAME_PATTERNS = {
  zeylname: /zeyl|zeyil|duzeltme|d[uü]zeltme|degisiklik|de[gğ]i[sş]iklik|addendum|amendment|revize|ek[-_\s]*ilan/i,
  idari: /idari|administrative|genel[-_\s]*[sş]art/i,
  teknik: /teknik|technical|[oö]zel[-_\s]*[sş]art/i,
  sozlesme: /s[oö]zle[sş]me|contract|mukavele|anla[sş]ma/i,
  ihale: /ihale|tender|ilan|duyuru|announcement|al[ıi]nacakt[ıi]r|hizmeti.*al[ıi]m[ıi]|_\d{7}_\d{4}-\d{2}-\d{2}/i,
  fatura: /fatura|invoice|fat/i,
  menu: /men[uü]|yemek|g[ıi]da|food|kahvalt[ıi]|[oö][gğ]le|ak[sş]am|beslenme|diyet/i,
  rapor: /rapor|report|analiz|de[gğ]erlendirme/i,
  teklif: /teklif|proposal|offer|fiyat/i,
  personel: /personel|kadro|cetvel|cal[ıi][sş]an|istihdam|[iİ]nsan[-_\s]*kaynak/i,
  makine: /makine|ekipman|arac|ara[cç]|demirba[sş]|techizat|malzeme/i
};

/**
 * Priority order for document categories
 */
export const CATEGORY_PRIORITY = [
  'zeylname',    // Amendments have highest priority
  'ihale',       // Tender announcements
  'idari',       // Administrative specifications
  'teknik',      // Technical specifications
  'sozlesme',    // Contract drafts
  'teklif',      // Proposals
  'fatura',      // Invoices
  'rapor',       // Reports
  'menu',        // Menus
  'makine',      // Equipment lists
  'personel',    // Personnel lists
  'diğer'        // Other
];

/**
 * Get Turkish label for document category
 */
export const getCategoryLabel = (category: string): string => {
  const labels: { [key: string]: string } = {
    zeylname: 'Zeyilname',
    idari: 'İdari Şartname',
    teknik: 'Teknik Şartname',
    sozlesme: 'Sözleşme Taslağı',
    ihale: 'İhale İlanı',
    fatura: 'Fatura',
    menu: 'Menü',
    rapor: 'Rapor',
    teklif: 'Teklif',
    makine: 'Makine/Ekipman Listesi',
    personel: 'Personel Listesi',
    diğer: 'Diğer'
  };
  
  return labels[category] || category;
};

/**
 * Get icon name for document category
 */
export const getCategoryIcon = (category: string): string => {
  const icons: { [key: string]: string } = {
    zeylname: 'FileEdit',
    idari: 'FileText',
    teknik: 'Tool',
    sozlesme: 'FileSignature',
    ihale: 'Megaphone',
    fatura: 'Receipt',
    menu: 'UtensilsCrossed',
    rapor: 'FileBarChart',
    teklif: 'FileCheck',
    makine: 'Wrench',
    personel: 'Users',
    diğer: 'File'
  };
  
  return icons[category] || 'File';
};

/**
 * Get color class for document category
 */
export const getCategoryColor = (category: string): string => {
  const colors: { [key: string]: string } = {
    zeylname: 'bg-yellow-500 text-black',
    idari: 'bg-blue-500 text-white',
    teknik: 'bg-purple-500 text-white',
    sozlesme: 'bg-green-500 text-white',
    ihale: 'bg-red-500 text-white',
    fatura: 'bg-orange-500 text-white',
    menu: 'bg-pink-500 text-white',
    rapor: 'bg-indigo-500 text-white',
    teklif: 'bg-teal-500 text-white',
    makine: 'bg-gray-500 text-white',
    personel: 'bg-cyan-500 text-white',
    diğer: 'bg-slate-500 text-white'
  };
  
  return colors[category] || 'bg-slate-500 text-white';
};
