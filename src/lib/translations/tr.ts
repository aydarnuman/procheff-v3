/**
 * Türkçe Dil Paketi
 * Tüm uygulama metinlerinin merkezi Türkçe çevirileri
 */

export const TR = {
  // Genel
  common: {
    loading: 'Yükleniyor...',
    error: 'Hata',
    success: 'Başarılı',
    save: 'Kaydet',
    cancel: 'İptal',
    delete: 'Sil',
    edit: 'Düzenle',
    close: 'Kapat',
    submit: 'Gönder',
    search: 'Ara',
    filter: 'Filtrele',
    export: 'Dışa Aktar',
    import: 'İçe Aktar',
    download: 'İndir',
    upload: 'Yükle',
    refresh: 'Yenile',
    back: 'Geri',
    next: 'İleri',
    previous: 'Önceki',
    finish: 'Bitir',
    start: 'Başla',
    stop: 'Durdur',
    pause: 'Duraklat',
    resume: 'Devam Et',
    retry: 'Tekrar Dene',
    reset: 'Sıfırla',
    clear: 'Temizle',
    select: 'Seç',
    selectAll: 'Tümünü Seç',
    deselectAll: 'Seçimi Kaldır',
    yes: 'Evet',
    no: 'Hayır',
    ok: 'Tamam',
    confirm: 'Onayla',
    warning: 'Uyarı',
    info: 'Bilgi',
    help: 'Yardım',
    more: 'Daha Fazla',
    less: 'Daha Az',
    show: 'Göster',
    hide: 'Gizle',
    expand: 'Genişlet',
    collapse: 'Daralt',
    copy: 'Kopyala',
    paste: 'Yapıştır',
    cut: 'Kes',
    undo: 'Geri Al',
    redo: 'Yinele',
    print: 'Yazdır',
    share: 'Paylaş',
    settings: 'Ayarlar',
    preferences: 'Tercihler',
    logout: 'Çıkış Yap',
    login: 'Giriş Yap',
    register: 'Kayıt Ol',
    profile: 'Profil',
    notifications: 'Bildirimler',
    messages: 'Mesajlar',
    tasks: 'Görevler',
    reports: 'Raporlar',
    analytics: 'Analitik',
    dashboard: 'Kontrol Paneli',
    overview: 'Genel Bakış',
    details: 'Detaylar',
    summary: 'Özet',
    description: 'Açıklama',
    status: 'Durum',
    priority: 'Öncelik',
    date: 'Tarih',
    time: 'Zaman',
    duration: 'Süre',
    progress: 'İlerleme',
    completed: 'Tamamlandı',
    pending: 'Bekliyor',
    active: 'Aktif',
    inactive: 'Pasif',
    enabled: 'Etkin',
    disabled: 'Devre Dışı',
    online: 'Çevrimiçi',
    offline: 'Çevrimdışı',
    available: 'Mevcut',
    unavailable: 'Mevcut Değil',
    required: 'Zorunlu',
    optional: 'İsteğe Bağlı',
    default: 'Varsayılan',
    custom: 'Özel',
    all: 'Tümü',
    none: 'Hiçbiri',
    other: 'Diğer',
    unknown: 'Bilinmiyor',
    noData: 'Veri Yok',
    noResults: 'Sonuç Bulunamadı',
    tryAgain: 'Tekrar Dene',
    learnMore: 'Daha Fazla Bilgi',
    viewAll: 'Tümünü Görüntüle',
    viewDetails: 'Detayları Görüntüle',
    clickHere: 'Buraya Tıklayın',
    dragHere: 'Buraya Sürükleyin',
    dropHere: 'Buraya Bırakın',
    chooseFile: 'Dosya Seç',
    chooseFiles: 'Dosyaları Seç',
    noFileSelected: 'Dosya Seçilmedi',
    filesSelected: 'dosya seçildi',
    uploading: 'Yükleniyor',
    uploadComplete: 'Yükleme Tamamlandı',
    uploadFailed: 'Yükleme Başarısız',
    downloading: 'İndiriliyor',
    downloadComplete: 'İndirme Tamamlandı',
    downloadFailed: 'İndirme Başarısız',
    processing: 'İşleniyor',
    processingComplete: 'İşlem Tamamlandı',
    processingFailed: 'İşlem Başarısız',
    sending: 'Gönderiliyor',
    sent: 'Gönderildi',
    sendFailed: 'Gönderilemedi',
    saving: 'Kaydediliyor',
    saved: 'Kaydedildi',
    saveFailed: 'Kaydedilemedi',
    deleting: 'Siliniyor',
    deleted: 'Silindi',
    deleteFailed: 'Silinemedi',
    loading: 'Yükleniyor',
    loaded: 'Yüklendi',
    loadFailed: 'Yüklenemedi',
    connecting: 'Bağlanıyor',
    connected: 'Bağlandı',
    disconnected: 'Bağlantı Kesildi',
    connectionFailed: 'Bağlantı Başarısız',
    authenticating: 'Kimlik Doğrulanıyor',
    authenticated: 'Kimlik Doğrulandı',
    authenticationFailed: 'Kimlik Doğrulanamadı',
    authorizing: 'Yetkilendiriliyor',
    authorized: 'Yetkilendirildi',
    authorizationFailed: 'Yetkilendirilemedi',
    validating: 'Doğrulanıyor',
    validated: 'Doğrulandı',
    validationFailed: 'Doğrulanamadı',
    submitting: 'Gönderiliyor',
    submitted: 'Gönderildi',
    submitFailed: 'Gönderilemedi'
  },

  // Chat Modülü
  chat: {
    title: 'AI İhale Asistanı',
    subtitle: 'Sorularınızı sorun, ihale analizi yapın',
    inputPlaceholder: 'Mesajınızı yazın...',
    send: 'Gönder',
    typing: 'Yazıyor...',
    thinking: 'Düşünüyor...',
    clearHistory: 'Geçmişi Temizle',
    emptyState: {
      title: 'Merhaba! Size nasıl yardımcı olabilirim?',
      subtitle: 'İhale analizi, maliyet hesaplama ve stratejik öneriler için buradayım',
      suggestions: {
        analysis: 'İhale Analizi',
        cost: 'Maliyet Hesaplama',
        strategy: 'Strateji Önerisi',
        comparison: 'İhale Karşılaştırma'
      }
    },
    errors: {
      sendFailed: 'Mesaj gönderilemedi',
      connectionLost: 'Bağlantı koptu',
      serverError: 'Sunucu hatası',
      timeout: 'Zaman aşımı'
    }
  },

  // Feedback Modülü
  feedback: {
    title: 'Bu yanıt nasıldı?',
    subtitle: 'Geri bildiriminiz ile öğreniyoruz',
    ratePrompt: 'Lütfen değerlendirin',
    commentPlaceholder: 'Ek yorumlarınız (opsiyonel)',
    improvementPrompt: 'Neleri geliştirebiliriz?',
    whatYouLikedPrompt: 'Neyi beğendiniz? (opsiyonel)',
    improvements: {
      accuracy: 'Daha doğru bilgi',
      detail: 'Daha fazla detay',
      speed: 'Daha hızlı yanıt',
      clarity: 'Daha açık ifade',
      relevance: 'Daha ilgili içerik',
      examples: 'Daha fazla örnek'
    },
    ratings: {
      1: 'Kötü 😞',
      2: 'Yetersiz 😐',
      3: 'Orta 🙂',
      4: 'İyi 😊',
      5: 'Mükemmel 🎉'
    },
    submit: 'Geri Bildirimi Gönder',
    submitting: 'Gönderiliyor...',
    submitted: 'Teşekkürler!',
    submitMessage: 'Geri bildiriminiz sistemi geliştirmemize yardımcı olacak'
  },

  // Proactive (Öneriler)
  proactive: {
    title: 'Akıllı Öneriler',
    types: {
      tip: 'İpucu',
      alert: 'Uyarı',
      opportunity: 'Fırsat',
      reminder: 'Hatırlatma',
      insight: 'İçgörü'
    },
    priorities: {
      critical: 'Kritik',
      high: 'Yüksek',
      medium: 'Orta',
      low: 'Düşük'
    },
    actions: {
      view: 'Görüntüle',
      dismiss: 'Kapat',
      later: 'Sonra',
      execute: 'Çalıştır',
      details: 'Detaylar'
    },
    messages: {
      loading: 'Öneriler yükleniyor...',
      noSuggestions: 'Şu anda öneri yok',
      executing: 'Çalışıyor...',
      executed: 'Komut çalıştırıldı',
      dismissed: 'Öneri kapatıldı'
    }
  },

  // Planning (Planlama)
  planning: {
    title: 'Planlama Sihirbazı',
    templates: {
      tenderEvaluation: 'İhale Değerlendirme',
      costOptimization: 'Maliyet Optimizasyonu',
      menuPlanning: 'Menü Planlama'
    },
    steps: {
      current: 'Mevcut Adım',
      next: 'Sonraki Adım',
      previous: 'Önceki Adım',
      completed: 'Tamamlandı',
      remaining: 'Kalan'
    },
    actions: {
      start: 'Planlamayı Başlat',
      continue: 'Devam Et',
      back: 'Geri',
      skip: 'Atla',
      finish: 'Bitir',
      cancel: 'İptal',
      save: 'Kaydet',
      load: 'Yükle'
    },
    messages: {
      saved: 'Plan kaydedildi',
      loaded: 'Plan yüklendi',
      completed: 'Planlama tamamlandı',
      cancelled: 'Planlama iptal edildi',
      error: 'Planlama hatası'
    }
  },

  // Analytics (Analitik)
  analytics: {
    title: 'Kullanım Analitikleri',
    metrics: {
      totalMessages: 'Toplam Mesaj',
      avgResponseTime: 'Ort. Yanıt Süresi',
      satisfactionRate: 'Memnuniyet Oranı',
      successRate: 'Başarı Oranı',
      errorRate: 'Hata Oranı',
      totalTokens: 'Toplam Token',
      avgTokensPerMessage: 'Mesaj Başına Token',
      totalCost: 'Toplam Maliyet',
      uniqueUsers: 'Benzersiz Kullanıcı',
      activeConversations: 'Aktif Konuşma'
    },
    periods: {
      today: 'Bugün',
      yesterday: 'Dün',
      thisWeek: 'Bu Hafta',
      lastWeek: 'Geçen Hafta',
      thisMonth: 'Bu Ay',
      lastMonth: 'Geçen Ay',
      thisYear: 'Bu Yıl',
      lastYear: 'Geçen Yıl',
      custom: 'Özel Tarih',
      allTime: 'Tüm Zamanlar'
    },
    charts: {
      messageVolume: 'Mesaj Hacmi',
      responseTime: 'Yanıt Süreleri',
      satisfaction: 'Memnuniyet Trendi',
      tokenUsage: 'Token Kullanımı',
      errorRate: 'Hata Oranları',
      userActivity: 'Kullanıcı Aktivitesi'
    },
    exports: {
      pdf: 'PDF Raporu',
      excel: 'Excel Raporu',
      csv: 'CSV Dosyası',
      json: 'JSON Verisi'
    }
  },

  // Export (Dışa Aktarım)
  export: {
    title: 'Rapor Oluştur',
    types: {
      pdf: 'PDF Raporu',
      excel: 'Excel Dosyası',
      csv: 'CSV Dosyası',
      json: 'JSON Verisi'
    },
    options: {
      includeCharts: 'Grafikleri Dahil Et',
      includeRawData: 'Ham Veriyi Dahil Et',
      includeSummary: 'Özeti Dahil Et',
      includeDetails: 'Detayları Dahil Et',
      dateRange: 'Tarih Aralığı',
      format: 'Format',
      language: 'Dil'
    },
    actions: {
      generate: 'Rapor Oluştur',
      download: 'İndir',
      email: 'E-posta Gönder',
      schedule: 'Zamanla'
    },
    messages: {
      generating: 'Rapor oluşturuluyor...',
      generated: 'Rapor hazır',
      downloading: 'İndiriliyor...',
      downloaded: 'İndirme tamamlandı',
      emailing: 'E-posta gönderiliyor...',
      emailed: 'E-posta gönderildi',
      scheduled: 'Rapor zamanlandı',
      error: 'Rapor oluşturulamadı'
    }
  },

  // Tender (İhale)
  tender: {
    title: 'İhale Yönetimi',
    fields: {
      institution: 'Kurum',
      budget: 'Bütçe',
      deadline: 'Son Teslim',
      participants: 'Katılımcı Sayısı',
      documents: 'Dokümanlar',
      requirements: 'Gereksinimler',
      specifications: 'Teknik Şartname',
      status: 'Durum',
      score: 'Puan',
      risk: 'Risk'
    },
    actions: {
      analyze: 'Analiz Et',
      calculate: 'Hesapla',
      compare: 'Karşılaştır',
      decide: 'Karar Ver',
      export: 'Dışa Aktar',
      save: 'Kaydet',
      submit: 'Teklif Ver'
    },
    status: {
      new: 'Yeni',
      analyzing: 'Analiz Ediliyor',
      analyzed: 'Analiz Edildi',
      calculating: 'Hesaplanıyor',
      calculated: 'Hesaplandı',
      deciding: 'Karar Veriliyor',
      decided: 'Karar Verildi',
      submitted: 'Teklif Verildi',
      won: 'Kazanıldı',
      lost: 'Kaybedildi',
      cancelled: 'İptal Edildi'
    },
    decisions: {
      participate: 'Katıl',
      skip: 'Katılma',
      careful: 'Dikkatli Katıl',
      analyze: 'Daha Fazla Analiz Gerekli'
    },
    risks: {
      veryLow: 'Çok Düşük',
      low: 'Düşük',
      medium: 'Orta',
      high: 'Yüksek',
      veryHigh: 'Çok Yüksek'
    }
  },

  // Cost (Maliyet)
  cost: {
    title: 'Maliyet Hesaplama',
    fields: {
      material: 'Malzeme',
      labor: 'İşçilik',
      overhead: 'Genel Gider',
      profit: 'Kar Marjı',
      tax: 'Vergi',
      total: 'Toplam',
      perPerson: 'Kişi Başı',
      perDay: 'Günlük',
      perMeal: 'Öğün Başı'
    },
    calculations: {
      calculating: 'Hesaplanıyor...',
      calculated: 'Hesaplandı',
      error: 'Hesaplama hatası',
      breakdown: 'Maliyet Dağılımı',
      summary: 'Özet',
      details: 'Detaylar'
    },
    optimizations: {
      title: 'Optimizasyon Önerileri',
      seasonal: 'Mevsimsel Ürünler',
      bulk: 'Toplu Alım',
      alternative: 'Alternatif Ürünler',
      supplier: 'Tedarikçi Değişimi'
    }
  },

  // Menu (Menü)
  menu: {
    title: 'Menü Yönetimi',
    fields: {
      name: 'Menü Adı',
      category: 'Kategori',
      items: 'Yemekler',
      portions: 'Porsiyonlar',
      calories: 'Kalori',
      allergens: 'Alerjenler',
      ingredients: 'Malzemeler',
      cost: 'Maliyet'
    },
    categories: {
      breakfast: 'Kahvaltı',
      lunch: 'Öğle Yemeği',
      dinner: 'Akşam Yemeği',
      snack: 'Ara Öğün',
      beverage: 'İçecek',
      dessert: 'Tatlı',
      soup: 'Çorba',
      mainCourse: 'Ana Yemek',
      sideDish: 'Yan Yemek',
      salad: 'Salata'
    },
    actions: {
      create: 'Menü Oluştur',
      edit: 'Menüyü Düzenle',
      duplicate: 'Menüyü Kopyala',
      delete: 'Menüyü Sil',
      import: 'Menü İçe Aktar',
      export: 'Menü Dışa Aktar',
      calculate: 'Maliyet Hesapla',
      optimize: 'Optimize Et'
    }
  },

  // Errors (Hatalar)
  errors: {
    general: 'Bir hata oluştu',
    network: 'Ağ hatası',
    server: 'Sunucu hatası',
    client: 'İstemci hatası',
    validation: 'Doğrulama hatası',
    authentication: 'Kimlik doğrulama hatası',
    authorization: 'Yetkilendirme hatası',
    notFound: 'Bulunamadı',
    timeout: 'Zaman aşımı',
    rateLimit: 'Hız limiti aşıldı',
    maintenance: 'Bakım modu',
    unknown: 'Bilinmeyen hata',
    tryAgain: 'Lütfen tekrar deneyin',
    contactSupport: 'Destek ile iletişime geçin',
    actions: {
      retry: 'Tekrar Dene',
      goBack: 'Geri Dön',
      home: 'Ana Sayfa',
      refresh: 'Sayfayı Yenile',
      report: 'Hatayı Bildir'
    }
  },

  // Success Messages (Başarı Mesajları)
  success: {
    saved: 'Başarıyla kaydedildi',
    deleted: 'Başarıyla silindi',
    updated: 'Başarıyla güncellendi',
    created: 'Başarıyla oluşturuldu',
    sent: 'Başarıyla gönderildi',
    uploaded: 'Başarıyla yüklendi',
    downloaded: 'Başarıyla indirildi',
    exported: 'Başarıyla dışa aktarıldı',
    imported: 'Başarıyla içe aktarıldı',
    completed: 'İşlem tamamlandı',
    copied: 'Panoya kopyalandı'
  },

  // Warnings (Uyarılar)
  warnings: {
    unsavedChanges: 'Kaydedilmemiş değişiklikleriniz var',
    confirmDelete: 'Silmek istediğinizden emin misiniz?',
    irreversible: 'Bu işlem geri alınamaz',
    dataLoss: 'Verileriniz kaybolabilir',
    experimental: 'Bu özellik deneyseldir',
    beta: 'Bu özellik beta aşamasındadır',
    deprecated: 'Bu özellik kullanımdan kaldırılmıştır',
    maintenance: 'Sistem bakımda',
    offline: 'Çevrimdışı moddasınız'
  },

  // Validations (Doğrulamalar)
  validations: {
    required: 'Bu alan zorunludur',
    email: 'Geçerli bir e-posta adresi girin',
    phone: 'Geçerli bir telefon numarası girin',
    url: 'Geçerli bir URL girin',
    number: 'Geçerli bir sayı girin',
    integer: 'Tam sayı girin',
    decimal: 'Ondalık sayı girin',
    min: 'Minimum değer: {min}',
    max: 'Maksimum değer: {max}',
    minLength: 'En az {min} karakter',
    maxLength: 'En fazla {max} karakter',
    pattern: 'Geçersiz format',
    unique: 'Bu değer zaten kullanımda',
    match: 'Değerler eşleşmiyor',
    strongPassword: 'Daha güçlü bir şifre seçin',
    acceptTerms: 'Şartları kabul etmelisiniz',
    fileSize: 'Dosya boyutu çok büyük',
    fileType: 'Desteklenmeyen dosya tipi'
  }
} as const;

export default TR;