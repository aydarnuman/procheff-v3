# 📊 Procheff v3 - Monitoring Dashboard

## 🎯 Genel Bakış

Procheff v3 Monitoring Dashboard, Claude Sonnet 4.5 AI sisteminin performansını, token kullanımını ve hata oranlarını gerçek zamanlı olarak izlemenizi sağlayan kapsamlı bir gözlem panelidir.

---

## ✨ Özellikler

### 📈 Gerçek Zamanlı Metrikler

- **Toplam Log Sayısı**: Sistemde kayıtlı tüm loglar
- **Başarı Oranı**: Başarılı işlemlerin yüzdesi
- **Hata Sayısı**: Toplam hata kayıtları
- **Son 24 Saat**: Son 24 saatteki aktivite

### ⚡ Performans İzleme

- **Ortalama Süre**: Claude API çağrılarının ortalama süresi (ms)
- **Ortalama Token**: İşlem başına ortalama token kullanımı
- **Progress Bar**: Görsel performans göstergeleri

### 📊 Grafikler

1. **Performans Trendi** - Zaman serisi grafiği

   - Süre (ms) - Yeşil çizgi
   - Token kullanımı - Mavi çizgi
   - Son 20 veri noktası
   - Otomatik 10 saniyede bir güncelleme

2. **Log Seviye Dağılımı** - Bar chart

   - INFO (Mavi) - Bilgilendirme mesajları
   - SUCCESS (Yeşil) - Başarılı işlemler
   - WARN (Sarı) - Uyarılar
   - ERROR (Kırmızı) - Hatalar

3. **Son Aktiviteler** - Real-time log akışı
   - Son 10 log kaydı
   - Timestamp ve seviye bilgisi
   - Renkli kategorilendirme

---

## 🚀 Kullanım

### 1. Dashboard'a Erişim

```bash
http://localhost:3001/monitor
```

### 2. API Endpoint

```bash
curl http://localhost:3001/api/metrics
```

### 3. Otomatik Güncelleme

Dashboard her **10 saniyede** bir otomatik olarak güncellenir.

---

## 🏗️ Mimari

### Backend

```
src/app/api/metrics/route.ts
├── SQLite sorguları
├── Agregasyon işlemleri
├── İstatistik hesaplamaları
└── JSON response
```

### Frontend

```
src/app/monitor/page.tsx
├── Real-time data fetching
├── Recharts grafikleri
├── Card UI components
└── Responsive design
```

### UI Components

```
src/components/ui/card.tsx
├── Card
├── CardHeader
├── CardTitle
├── CardContent
└── CardFooter
```

---

## 📊 Metrik Detayları

### API Response Yapısı

```json
{
  "success": true,
  "metrics": {
    "total_logs": 10,
    "errors": 0,
    "success_rate": "100.00",
    "last_24h": 10,
    "avg_duration_ms": 21118,
    "avg_tokens": 700,
    "level_distribution": [
      { "level": "info", "count": 5 },
      { "level": "success", "count": 2 },
      { "level": "warn", "count": 3 },
      { "level": "error", "count": 0 }
    ],
    "recent_logs": [...]
  },
  "status": "healthy",
  "timestamp": "2025-11-10T07:45:00.000Z"
}
```

### SQL Sorguları

**Toplam Log**:

```sql
SELECT COUNT(*) AS count FROM logs
```

**Hata Sayısı**:

```sql
SELECT COUNT(*) AS count FROM logs WHERE level='error'
```

**Son 24 Saat**:

```sql
SELECT COUNT(*) AS count
FROM logs
WHERE created_at >= datetime('now','-1 day')
```

**Ortalama Süre**:

```sql
SELECT AVG(json_extract(data, '$.duration_ms')) AS avg_ms
FROM logs
WHERE level='success' AND json_extract(data, '$.duration_ms') IS NOT NULL
```

**Ortalama Token**:

```sql
SELECT AVG(json_extract(data, '$.total_estimated_tokens')) AS avg_tokens
FROM logs
WHERE level='success' AND json_extract(data, '$.total_estimated_tokens') IS NOT NULL
```

---

## 🎨 Renk Kodları

| Seviye  | Renk    | Tailwind Class    | Icon |
| ------- | ------- | ----------------- | ---- |
| INFO    | Mavi    | `text-blue-400`   | ℹ️   |
| SUCCESS | Yeşil   | `text-green-400`  | ✅   |
| WARN    | Sarı    | `text-yellow-400` | ⚠️   |
| ERROR   | Kırmızı | `text-red-400`    | ❌   |

---

## 🔧 Teknolojiler

- **Next.js 16** - React framework
- **Recharts** - Grafik kütüphanesi
- **better-sqlite3** - Database
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

---

## 📦 Kurulum

### 1. Bağımlılıkları Kur

```bash
npm install recharts
```

### 2. Dosyaları Oluştur

```bash
src/app/api/metrics/route.ts
src/app/monitor/page.tsx
src/components/ui/card.tsx
```

### 3. Dev Server Başlat

```bash
npm run dev
```

### 4. Dashboard'a Eriş

```
http://localhost:3001/monitor
```

---

## 🧪 Test

### Metrik API Testi

```bash
curl http://localhost:3001/api/metrics | python3 -m json.tool
```

### Test Verisi Oluşturma

```bash
curl -X POST http://localhost:3001/api/ai/deep-analysis \
  -H "Content-Type: application/json" \
  -d '{"extracted_data":{"kurum":"Test","ihale_turu":"Test"}}'
```

### Database Kontrolü

```bash
sqlite3 procheff.db "SELECT level, COUNT(*) FROM logs GROUP BY level;"
```

---

## 📈 Performans

- ✅ **İlk Yükleme**: ~1-2 saniye
- ✅ **Güncelleme Sıklığı**: 10 saniye
- ✅ **API Response Time**: ~50-100ms
- ✅ **Grafik Render**: ~200ms
- ✅ **Memory Usage**: Minimal (client-side)

---

## 🎯 Kullanım Senaryoları

### 1. Geliştirici Modu

- API çağrılarını izleme
- Hata ayıklama
- Performance profiling
- Token usage optimization

### 2. Operasyonel İzleme

- Sistem sağlığı kontrolü
- Anomali tespiti
- Kapasite planlama
- SLA monitoring

### 3. Business Intelligence

- Kullanım istatistikleri
- Maliyet analizi
- Trend analysis
- Reporting

---

## 🔮 Gelecek Geliştirmeler

- [ ] **Alert System** - Threshold-based notifications
- [ ] **Export Data** - CSV/JSON export
- [ ] **Advanced Filters** - Tarih aralığı, seviye filtreleme
- [ ] **Performance Benchmarks** - Model karşılaştırma
- [ ] **Cost Calculator** - Token maliyeti hesaplama
- [ ] **WebSocket Support** - Gerçek zamanlı push updates
- [ ] **Custom Dashboards** - Kullanıcı tanımlı paneller
- [ ] **Historical Data** - Uzun vadeli trend analizi

---

## 🎉 Sonuç

**Procheff v3 Monitoring Dashboard artık aktif!**

Sistem durumu: 🟢 **HEALTHY**

- ✅ Real-time monitoring
- ✅ Performance tracking
- ✅ Error monitoring
- ✅ Token usage analytics
- ✅ Visual insights

**Dashboard URL**: http://localhost:3001/monitor
