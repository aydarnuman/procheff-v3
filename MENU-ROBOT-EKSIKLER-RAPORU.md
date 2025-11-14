# 🔍 Menu Robotu - Eksikler ve Uyumsuzluklar Raporu

**Tarih:** 14 Kasım 2025
**Versiyon:** 3.0.0
**Kapsam:** File Parser, Gramaj Calculator, Menu Planner tab'ları

---

## 🎯 Genel Bulgular

Menu Robotu sayfası 3 farklı araç barındırıyor ancak **kullanıcı deneyimi ve teknik tutarlılık** açısından ciddi eksiklikler var.

### Ana Sorunlar:
1. **Konsept Belirsizliği** - 3 araç farklı amaçlara hizmet ediyor ama bu net değil
2. **Pipeline Uyumsuzluğu** - Sadece File Parser pipeline'da, diğerleri bağımsız
3. **API-UI Senkronizasyon Hatası** - API veri döndürüyor ama UI göstermiyor
4. **Eksik Feedback** - AI açıklamaları, validasyon uyarıları yok
5. **Menü Havuzu Yönetimi Yok** - Kritik bileşen ama kullanıcı yönetemiyor

---

## 📄 TAB 1: FILE PARSER (Dosya Çözümleyici)

### ✅ Çalışan Özellikler:
- AI parse çalışıyor (`/api/parser/menu`)
- MenuItem[] döndürüyor
- Pipeline'a veri gönderiyor (`usePipelineStore.setMenuData()`)
- Export (JSON/CSV) var
- Drag & drop upload çalışıyor

### ❌ Kritik Eksikler:

#### 1. **Parse Sonrası Akış YOK**
```typescript
// FileParserTab.tsx - 88-91. satır
if (data.success && data.data) {
  setMenuData(data.data);
  markStepCompleted(PIPELINE_STEPS.MENU_UPLOAD);
}
// ❌ SONRA NE OLMALI? Kullanıcıya "Next Step" butonu yok!
```

**Sorun:** Parse başarılı ama kullanıcı "şimdi ne yapacağım?" bilmiyor.
**Beklenen:** "Maliyet Analizine Git →" butonu ya da otomatik yönlendirme

---

#### 2. **Parse Kalitesi Feedback YOK**
```typescript
// API response (route.ts - 82-94)
return NextResponse.json({
  success: true,
  data: menuItems,
  meta: {
    duration_ms,
    model,
    items_count: menuItems.length
  }
});
// ❌ Parse confidence, hata sayısı, uyarılar yok!
```

**Sorun:** AI %100 doğru parse etmiyor ama kullanıcı bilmiyor.
**Beklenen:**
- Parse confidence score (örn: %85 güvenle parse edildi)
- Problematik satırlar (gramaj 0, kategori eksik)
- Düzeltme önerileri

---

#### 3. **Manuel Düzeltme İmkanı YOK**
```typescript
// FileParserTab.tsx - tablo (285-298. satır)
<tr>
  <td>{item.yemek}</td>
  <td>{item.gramaj.toLocaleString()}g</td>
  <td>{item.kategori || '-'}</td>
</tr>
// ❌ Edit butonu yok, kullanıcı düzeltemez!
```

**Sorun:** AI "Kuru Fasülye" yerine "Kuru Fasulte" parse ettiyse, kullanıcı düzeltemez.
**Beklenen:** Inline edit, cell tıkla → input aç → kaydet

---

#### 4. **Validasyon Uyarıları YOK**
```typescript
// Şu kontroller yapılmıyor:
// ❌ Gramaj === 0 uyarısı
// ❌ Kategori === null uyarısı
// ❌ Duplicate yemek uyarısı
// ❌ Outlier gramaj uyarısı (1000000g gibi)
```

**Beklenen:** Parse sonrası validation summary:
```
⚠️ 3 problem tespit edildi:
- "Mercimek Çorbası" gramaj bilgisi eksik
- "Tavuk Eti" kategori atanamadı
- "Pirinç" 2 kez tekrarlanıyor
```

---

#### 5. **Pipeline Progress Göstergesi YOK**
```typescript
// FileParserTab.tsx
// ❌ Bu sayfada PipelineProgress komponenti yok
// Kullanıcı pipeline'ın neresinde bilmiyor
```

**Beklenen:** Sayfanın üstünde progress bar:
```
[✓ İhale Seçildi] → [✓ Detay Alındı] → [● Menü Yükleniyor] → [ Maliyet] → [ Karar]
```

---

## ⚖️ TAB 2: GRAMAJ CALCULATOR (Gramaj Hesaplayıcı)

### ✅ Çalışan Özellikler:
- Gramaj hesaplama çalışıyor
- Kurum tipi seçimi var (özel/resmi/okul/hastane)
- Kişi sayısı input var
- Excel export çalışıyor
- Modal search iyi

### ❌ Kritik Eksikler:

#### 1. **MALİYET Gösterilmiyor (API'da var, UI'da yok!)**
```typescript
// API Response (gramaj/route.ts - 82-93)
return NextResponse.json({
  results: [{
    totalCost: 125.50,  // ✅ API hesaplıyor!
    // ...
  }],
  summary: {
    total_cost: 3850.00,        // ✅ Var!
    cost_per_person: 7.70       // ✅ Var!
  }
});

// UI (GramajCalculatorTab.tsx - 310-357)
<table>
  <th>Kişi Başı</th>  <!-- ✅ Gramaj gösteriliyor -->
  <th>Toplam</th>     <!-- ✅ Gramaj gösteriliyor -->
  <!-- ❌ MALİYET KOLONU YOK! -->
</table>
```

**BU BÜYÜK BİR HATA!** API maliyet hesaplıyor ama UI göstermiyor.

**Beklenen:** Tablo şöyle olmalı:
```
Yemek          | Kişi Başı | Toplam  | Birim Fiyat | Toplam Maliyet
Mercimek Çorbası | 250g    | 125 kg  | 15 TL/kg    | 1,875 TL
```

---

#### 2. **Kurum Tipi Fark Etmiyor (API bug!)**
```typescript
// gramaj/route.ts - 63-67. satır
const results = menuItems.map((item: any) => {
  const perPerson = item.default_gramaj;  // ❌ Sabit!
  // institution_type kullanılmıyor!
});
```

**Sorun:** Özel vs Resmi kurum için gramaj değişmiyor.
**Beklenen:** Kurum tipine göre gramaj multiplier:
```typescript
const multiplier = {
  'hastane': 0.8,   // Daha az gramaj
  'okul': 1.0,      // Standart
  'ozel': 1.2,      // Daha fazla
  'resmi': 1.0
}[institution_type] || 1.0;

const perPerson = item.default_gramaj * multiplier;
```

---

#### 3. **Menü Havuzu Sınırlı (Yeni Yemek Eklenemiyor)**
```typescript
// GramajCalculatorTab.tsx - 59-72
async function loadMenuItems() {
  const res = await fetch('/api/menu/havuz');
  // ❌ Sadece DB'deki itemler geliyor
  // ❌ Kullanıcı yeni yemek ekleyemez!
}
```

**Sorun:** Havuzda olmayan yemek için gramaj hesaplanamaz.
**Beklenen:**
- "Yeni Yemek Ekle" butonu
- Modal form: Ad, Kategori, Default Gramaj, Birim Fiyat
- Havuza kaydet

---

#### 4. **Summary Kartlar Eksik**
```typescript
// API summary var ama UI'da sadece 2 kart gösteriliyor:
summary: {
  total_cost: 3850.00,           // ❌ UI'da yok
  cost_per_person: 7.70,         // ❌ UI'da yok
  total_calories: 450000,        // ❌ UI'da yok
  calories_per_person: 900       // ❌ UI'da yok
}
```

**Beklenen:** 6 summary kartı:
```
[Toplam Gramaj] [Toplam Maliyet] [Kişi Başı Maliyet]
[Toplam Kalori] [Kişi Başı Kalori] [Öğün Sayısı]
```

---

## 📅 TAB 3: MENU PLANNER (Menü Planlayıcı)

### ✅ Çalışan Özellikler:
- AI plan üretiyor
- Şablon sistemi güzel (5 hazır şablon)
- Edit mode + alternatif seçimi çalışıyor
- Excel/PDF export var
- 30 günlük takvim tablosu iyi

### ❌ Kritik Eksikler:

#### 1. **AI Plan Açıklaması YOK**
```typescript
// API muhtemelen AI'a prompt gönderiyor ve plan alıyor
// ❌ AMA AI neden bu yemekleri seçti? Hiç açıklama yok!
```

**Beklenen:** Her gün için AI açıklaması:
```
Gün 1 - Öğle:
  Mercimek Çorbası + Tavuk Sote + Pirinc Pilav

  💡 AI Açıklaması:
  "Dengeli protein ve karbonhidrat dengesi için seçildi.
   Bütçe: 8.50 TL/kişi (hedef: 10 TL altında ✓)
   Mevsimsel uygunluk: Kış sebzeleri tercih edildi."
```

---

#### 2. **Bütçe Aşım Uyarısı YOK**
```typescript
// MenuPlannerTab.tsx - bütçe input var (472-486)
<input
  value={budget || ''}
  placeholder="Kişi başı TL"
/>
// ❌ Ama bütçe aşımı kontrolü yok!
```

**Sorun:** Kullanıcı 10 TL bütçe verdi ama plan 15 TL/kişi olabilir.
**Beklenen:**
```
⚠️ Bütçe Aşımı Tespit Edildi!
Hedef: 10 TL/kişi
Gerçekleşen: 12.50 TL/kişi (+%25 aşım)

Öneriler:
- Tavuk yerine piliç kullan (-1.50 TL)
- Zeytinyağlı yetkili yemek (-0.80 TL)
```

---

#### 3. **Alternatif Seçim Açıklaması YOK**
```typescript
// MenuPlannerTab.tsx - 266-285
async function fetchAlternatives(day, meal) {
  // ✅ Alternatifler getiriliyor
  // ❌ AMA neden bu alternatifler? Hiç açıklama yok
}
```

**Beklenen:** Alternatif kartında:
```
[Tavuk Döner]
120g · 25 TL/kg · 180 kcal
→ Seç

💡 Benzer: Protein ana yemek
📊 Maliyet: Mevcut yemekten %15 daha ucuz
🔥 Kalori: %20 daha yüksek
```

---

#### 4. **Nutritional Summary YOK**
```typescript
// API'da calories var (menuItems.calories)
// ❌ Ama plan özeti kalori göstermiyor!
```

**Beklenen:** Plan özeti:
```
📊 7 Günlük Özet:
- Ortalama günlük kalori: 2,200 kcal/kişi
- Protein: 85g/gün
- Karbonhidrat: 280g/gün
- Yağ: 75g/gün

⚠️ Dikkat: Gün 3 ve 5'te protein düşük (60g)
```

---

#### 5. **Maliyet Breakdown YOK**
```typescript
// summary.costPerDay ve costPerPerson var
// ❌ Ama detaylı breakdown yok
```

**Beklenen:**
```
💰 Maliyet Analizi:
Toplam 7 gün: 5,250 TL
- Hammadde: 3,800 TL (%72)
- İşçilik: 950 TL (%18)
- Genel Gider: 500 TL (%10)

Günlük dağılım:
En ucuz gün: Gün 2 (650 TL)
En pahalı gün: Gün 5 (850 TL)
```

---

## 🔗 GENEL UYUMSUZLUKLAR

### 1. **Tab Arası İlişki Belirsiz**
```
❌ Şu an:
[File Parser] [Gramaj Calculator] [Menu Planner]
    ↓             ↓                  ↓
Pipeline'da    Bağımsız          Bağımsız

Kullanıcı: "Ben hangi tab'ı ne zaman kullanmalıyım?"
```

**Öneri:** Tab header'larına açıklama ekle:
```
📄 Dosya Çözümleyici
   "İhale menü dosyasını parse et (Pipeline)"

⚖️ Gramaj Hesaplayıcı
   "Operasyonel gramaj ve maliyet hesapla"

📅 Menü Planlayıcı
   "AI ile uzun vadeli menü planla"
```

---

### 2. **API Naming Tutarsızlığı**
```
/api/parser/menu     ← Farklı pattern
/api/menu/gramaj     ← Tutarlı
/api/menu/planner    ← Tutarlı
/api/menu/havuz      ← Tutarlı
```

**Öneri:** Hepsini `/api/menu/*` altına al:
```
/api/menu/parse      (parser yerine)
/api/menu/gramaj     (aynı)
/api/menu/planner    (aynı)
/api/menu/havuz      (aynı)
```

---

### 3. **Menü Havuzu Yönetimi YOK**
```
Menü Havuzu (menu_items tablosu) kritik ama:
❌ Yeni item eklenemiyor
❌ Mevcut item düzenlenemiyor
❌ Fiyat güncellenemiyor
❌ Kategori yönetimi yok
❌ Bulk import/export yok
```

**Öneri:** Yeni tab ekle:
```
[Dosya Çözümleyici] [Gramaj] [Planlayıcı] [⚙️ Menü Havuzu Yönetimi]
```

İçeriği:
- Tablo: Tüm menu items
- CRUD: Ekle, Düzenle, Sil
- Bulk Import: CSV yükle
- Kategori Yönetimi
- Fiyat Güncelle (toplu)

---

### 4. **State Persistence Eksik**
```typescript
// MenuRobotuPage - state'ler sadece component'te
const [activeTab, setActiveTab] = useState<TabType>('gramaj');

// ❌ Sayfa refresh → state kaybolur
// ❌ Tab değiştir → önceki tab'daki form sıfırlanır
```

**Öneri:** Zustand store ekle:
```typescript
// useMenuRobotStore.ts
interface MenuRobotState {
  activeTab: TabType;
  gramajForm: { items: [], institution: '', persons: 0 };
  plannerForm: { days: 7, meals: [], ... };
  // ...
}
```

---

### 5. **Loading & Error States Tutarsız**
```typescript
// File Parser: ✅ LoadingState, ErrorState var
// Gramaj: ✅ Loading var, ❌ error alert() ile
// Planner: ✅ Loading var, ❌ error console.error() ile
```

**Öneri:** Hepsinde uniform error handling:
```typescript
import { ErrorState } from '@/components/ui/ErrorState';

{error && <ErrorState message={error} onRetry={retry} />}
```

---

## 📊 ÖNCELİK SIRASI

### 🔴 Kritik (Hemen Yapılmalı):
1. **Gramaj Tab: Maliyet gösterim** (API'da var, UI'da yok - 30dk)
2. **File Parser: Next Step butonu** (Pipeline uyumsuzluğu - 20dk)
3. **Gramaj Tab: Kurum tipi multiplier** (API bug - 15dk)

### 🟡 Önemli (1 Hafta İçinde):
4. **File Parser: Manuel düzeltme** (UX kritik - 2 saat)
5. **Planner: AI açıklama sistemi** (Transparency - 3 saat)
6. **Gramaj: Summary kartlar** (API'da var, UI'da yok - 1 saat)
7. **Planner: Bütçe aşım uyarısı** (Kullanıcı beklentisi - 2 saat)

### 🟢 İyi Olur (2 Hafta İçinde):
8. **File Parser: Parse kalite feedback** (AI transparency - 4 saat)
9. **Menü Havuzu Yönetimi tab** (Operasyonel gereksinim - 8 saat)
10. **State persistence** (UX iyileştirme - 2 saat)
11. **API naming refactor** (Teknik borç - 3 saat)

---

## 💡 EK ÖNERİLER

### 1. **Tab Açıklamaları**
Her tab'ın altına küçük info card:
```
ℹ️ Bu araç ne zaman kullanılır?
File Parser: İhale menüsünü parse etmek için
Gramaj: Günlük operasyon için miktar/maliyet hesaplamak için
Planner: 7-30 günlük menü planlamak için
```

### 2. **Quick Actions**
Her tab'da sık kullanılan aksiyonlar:
```
File Parser:
  [Örnek Dosya İndir] [Geçmiş Parse'lar] [Şablon Kullan]

Gramaj:
  [Hızlı Hesapla (okul)] [Favori Menü Kullan] [Son Hesaplama]

Planner:
  [Hızlı 7 Gün] [Geçen Ay Planını Kopyala] [Şablon Kaydet]
```

### 3. **Keyboard Shortcuts**
```
Ctrl+1: File Parser
Ctrl+2: Gramaj
Ctrl+3: Planner
Ctrl+S: Export
Ctrl+E: Edit Mode
```

### 4. **Mobile Responsive**
```
❌ Şu an 3 tab yan yana -> mobilde taşıyor
✅ Öneri: Mobilde dropdown:
  [▼ Dosya Çözümleyici]
  [ ] Gramaj
  [ ] Planlayıcı
```

---

## 🎯 SONUÇ

Menu Robotu **güçlü bir araç** ama:
- ❌ API-UI senkronizasyon hataları var (maliyet gösterilmiyor!)
- ❌ UX feedback eksik (AI açıklama, validasyon yok)
- ❌ Konsept belirsiz (3 farklı araç, ilişkileri net değil)
- ❌ Menü havuzu yönetimi eksik

**Toplam Tahmini Süre:** 25-30 saat (kritikler 1 gün, hepsi 1 hafta)

**En Acil:**
1. Gramaj tab'ında maliyet göster (30dk)
2. File Parser'a next step butonu (20dk)
3. Kurum tipi multiplier ekle (15dk)

**İlk 3 düzeltme 1 saat!** Sonrası daha iyi planlanabilir.

---

**Rapor Hazırlayan:** Claude (Sonnet 4.5)
**Tarih:** 14 Kasım 2025
**Güncelleme:** Menu Robotu codebase analizi
