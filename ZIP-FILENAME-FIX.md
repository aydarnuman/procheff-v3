# 📦 ZIP Dosya İsmi Düzeltmesi

## Sorun
İhale detay sayfasından ZIP içindeki dökümanlar analize gönderildiğinde, dosya isimleri kayboluyordu:
```
❌ 66899240 (Diğer, %0-50 güven)
❌ 66899241 (Diğer, %0-50 güven)
```

## Neden Oldu?
1. **İhale detay sayfası** ZIP'ten çıkan dosyalar için özel URL formatı kullanıyor:
   ```typescript
   url: `zip:${zipDoc.url}#${filename}`
   // Örnek: zip:/api/ihale/proxy?sessionId=xxx&url=...#2025.1745912.idari-sartname.pdf
   ```

2. **Analiz sayfası** bu özel `zip:` URL'lerini anlayamıyordu:
   - `fetch(docUrl)` çağrısı başarısız oluyordu (geçersiz URL)
   - Dosya ismi çıkarma kodu pathname'den son parçayı alıyordu
   - Sonuç: Sadece ID numarası veya `proxy` gibi yanlış isimler

3. **AI detection** düzgün çalışamıyordu:
   - Dosya ismi yok → extension tespit edilemiyor
   - Extension yok → dosya türü belirlenemiyor
   - Sonuç: "Diğer" kategorisi, düşük güven skoru

## Çözüm
`UltimateFileUploader.tsx` güncellendi (satır 921-1008):

### 1. ZIP URL Tespiti
```typescript
if (docUrl.startsWith('zip:')) {
  // Extract ZIP URL and filename from special format
  const [, zipUrlAndPath] = docUrl.split('zip:');
  const [zipUrl, filename] = zipUrlAndPath.split('#');

  console.log('📦 Extracting from ZIP:', { zipUrl, filename });
```

### 2. ZIP İndirme ve Çıkarma
```typescript
// Fetch the ZIP file
const zipResponse = await fetch(zipUrl);
const zipBlob = await zipResponse.blob();

// Import JSZip dynamically
const JSZip = (await import('jszip')).default;
const zip = await JSZip.loadAsync(zipBlob);

// Extract the specific file from ZIP
const zipFile = zip.file(filename);
const fileBlob = await zipFile.async('blob');
```

### 3. Doğru MIME Type
```typescript
// Detect MIME type from filename
let mimeType = 'application/octet-stream';
const ext = filename.toLowerCase().split('.').pop();
if (ext === 'pdf') mimeType = 'application/pdf';
else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
else if (ext === 'doc') mimeType = 'application/msword';
else if (ext === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
else if (ext === 'txt') mimeType = 'text/plain';
```

### 4. Dosya Oluşturma
```typescript
// Create File object with proper filename
const file = new File([fileBlob], filename, { type: mimeType });
downloadedFiles.push(file);
```

## Test
1. **İhale Detay Sayfasına Git**: http://localhost:3000/ihale/[id]
2. **ZIP dosyası içeren bir ihale seç** (örn: "İdari Şartname" ZIP)
3. **ZIP'i genişlet** - içindeki dosyaları göreceksin
4. **İçindeki dosyaları seç** ve "Analize Gönder"
5. **Analiz sayfasında kontrol et**:
   - ✅ Dosya isimleri düzgün görünmeli (örn: `2025.1745912.idari-sartname.pdf`)
   - ✅ AI detection çalışmalı (%60-95 güven)
   - ✅ Kategori doğru tespit edilmeli (İdari Şartname, Teknik Şartname, vb)

## Beklenen Sonuç
```
✅ 2025.1745912.idari-sartname.pdf
   (İdari Şartname, %85 güven)
   PDF, TR, ~12.456 kelime, 23 varlık

✅ 2025.1745912.teknik-sartname.pdf
   (Teknik Şartname, %92 güven)
   PDF, TR, ~8.234 kelime, 15 varlık
```

## Gelecek İyileştirmeler
1. **Progress Bar**: ZIP extraction sırasında ilerleme göster
2. **Parallel Extraction**: Birden fazla ZIP varsa paralel işle
3. **Cache**: Aynı ZIP'i tekrar indirmemek için cache'le
4. **Error Recovery**: Bozuk ZIP dosyaları için fallback

---

**Tarih**: 12 Kasım 2025
**Durum**: ✅ Çözüldü
**Dosya**: `/src/app/analysis/components/UltimateFileUploader.tsx:921-1008`
