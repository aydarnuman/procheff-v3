# 🐍 Python Logging Utility for Procheff-v3

Bu dokümantasyon Procheff-v3 projesi için oluşturulan Python logging sistemini açıklar.

## 📁 Dosya Yapısı

```
src/lib/utils/logging.py      # Ana logging utility
examples/logging_demo.py      # Kullanım örnekleri
logs/                        # Log dosyaları
├── app.log                  # Ana uygulama logları  
├── api.log                  # API handler logları
└── pipeline_orchestrator.log # Pipeline işlem logları
```

## 🚀 Hızlı Başlangıç

```python
# Basit kullanım - global fonksiyonlar
from lib.utils.logging import info, error, success, warn, debug

info("Uygulama başlatılıyor", {"version": "3.0.0"})
success("Database bağlantısı başarılı", {"host": "localhost"})
error("Redis bağlantı hatası", {"error": "Timeout"})

# AI işlemleri
from lib.utils.logging import log_claude_request, log_claude_response

log_claude_request("claude-sonnet-4-20250514", 150, {"task": "cost_analysis"})
log_claude_response("claude-sonnet-4-20250514", 420, 570, 2340, {"success": True})
```

## 🔧 Özellikler

### ✅ Yapısal Loglama (Structured Logging)
- JSON formatında context bilgileri
- ISO 8601 timestamp formatı
- Zengin metadata desteği
- Consistent log seviyeleri

### ✅ AI İşlem Takibi
- Claude Sonnet request/response logging
- Gemini Vision OCR işlem takibi
- Token kullanım metrikleri
- AI hata loglama

### ✅ Modüler Logger Sistemi
```python
from lib.utils.logging import configure_logger

# Özel logger oluşturma
api_logger = configure_logger(
    name="api_handler",
    log_file="logs/api.log",
    console_output=True
)

api_logger.info("API çağrısı", {"endpoint": "/api/cost-analysis"})
```

### ✅ TypeScript Uyumluluğu
- Mevcut AILogger pattern'i ile uyumlu
- Benzer log format yapısı
- Cross-language log consistency

## 📊 Log Format

### Console Output (Renkli)
```
2025-11-10 19:05:15 | INFO    | procheff | API request received {"method": "POST"}
2025-11-10 19:05:15 | SUCCESS | procheff | Analysis completed {"tokens": 420}
2025-11-10 19:05:15 | ERROR   | procheff | Rate limit exceeded {"retry_after": 15}
```

### File Output (JSON Structured)
```
[2025-11-10T16:05:15.352Z] INFO: API request received
Context: {
  "method": "POST",
  "endpoint": "/api/ai/cost-analysis",
  "user_id": "user_123",
  "request_size": 1024
}
```

## 🎯 Kullanım Senaryoları

### 1. Temel Loglama
```python
info("İşlem başladı", {"operation_id": "op_001"})
warn("Yüksek bellek kullanımı", {"usage": "87%"})
error("Database hatası", {"error_code": "23505"})
success("İşlem tamamlandı", {"duration_ms": 1200})
debug("Debug bilgisi", {"state": "processing"})
```

### 2. AI İşlem Takibi
```python
# Claude işlemi
log_claude_request(
    model="claude-sonnet-4-20250514",
    prompt_tokens=150,
    context={"task": "cost_analysis", "user_id": "123"}
)

log_claude_response(
    model="claude-sonnet-4-20250514",
    completion_tokens=420,
    total_tokens=570,
    duration_ms=2340,
    context={"success": True, "cost": 15750.50}
)

# Gemini OCR
log_gemini_request(context={"file": "document.pdf", "density": 0.15})
log_gemini_response(1800, {"pages": 3, "confidence": 0.94})

# AI Hatalar
log_ai_error("claude", "claude-sonnet-4-20250514", 
            "Rate limit exceeded", {"retry_after": 15})
```

### 3. Pipeline Loglama
```python
pipeline_logger = configure_logger("pipeline_orchestrator")

pipeline_logger.info("Pipeline başladı", {
    "pipeline_id": "pipe_001",
    "steps": ["upload", "parse", "analyze", "decide", "report"]
})

pipeline_logger.success("Adım tamamlandı", {
    "step": "menu_parsing",
    "duration_ms": 850,
    "items_parsed": 45
})
```

### 4. Batch Processing
```python
batch_logger = configure_logger("batch_processor")

batch_logger.info("Batch işleme başladı", {
    "batch_id": "batch_001",
    "total_files": 12
})

for file in files:
    batch_logger.info("Dosya işleniyor", {
        "file_name": file.name,
        "worker_id": worker.id
    })
```

## 🔄 TypeScript Entegrasyonu

Python ve TypeScript logging sistemlerini birleştirmek için:

### TypeScript'ten Python Logger Çağrısı
```typescript
import { spawn } from 'child_process';

async function logToPython(level: string, message: string, context: object) {
  const python = spawn('python3', ['-c', `
    import sys
    sys.path.append('src')
    from lib.utils.logging import ${level}
    ${level}('${message}', ${JSON.stringify(context)})
  `]);
}

// Kullanım
await logToPython('info', 'API call completed', { tokens: 420 });
```

### Unified Log Viewer
```bash
# Tüm logları birleştir
tail -f logs/*.log | grep -E "(INFO|ERROR|SUCCESS|WARN|DEBUG)"
```

## 📈 Monitoring Dashboard Entegrasyonu

Monitoring dashboard'a Python logları eklemek için:

```python
# logs/app.log dosyasını /app/monitor sayfasında görüntüle
# Recharts için JSON format log export
# Real-time log streaming için SSE endpoint
```

## 🧪 Test Etme

```bash
# Demo çalıştır
cd /Users/numanaydar/procheff-v3
python3 examples/logging_demo.py

# Log dosyalarını kontrol et
ls -la logs/
cat logs/api.log
```

## ⚙️ Konfigürasyon

### Log Seviyeleri
- `DEBUG`: Ayrıntılı geliştirme bilgileri
- `INFO`: Genel bilgi mesajları  
- `SUCCESS`: Başarılı işlemler (özel seviye)
- `WARNING`: Uyarı mesajları
- `ERROR`: Hata mesajları

### Log Dosyası Rotasyonu
```python
# Gelecekte eklenecek - log rotation
import logging.handlers

handler = logging.handlers.RotatingFileHandler(
    'logs/app.log', 
    maxBytes=10*1024*1024,  # 10MB
    backupCount=5
)
```

## 🔗 İlişkili Dosyalar

- `src/lib/ai/logger.ts` - TypeScript AILogger
- `src/app/monitor/page.tsx` - Monitoring dashboard
- `src/app/logs/page.tsx` - Log viewer sayfası
- `src/app/api/logs/route.ts` - Log API endpoint

## 📝 Best Practices

1. **Structured Context**: Her log için zengin context bilgisi ekle
2. **Consistent Naming**: Logger isimlerinde tutarlı naming convention
3. **Error Handling**: AI işlemlerinde error context'i mutlaka logla
4. **Performance**: Log seviyelerini production'da optimize et
5. **Security**: Sensitive bilgileri loglama

## 🚧 Gelecek Özellikler

- [ ] Log rotation sistemi
- [ ] Real-time log streaming
- [ ] Elasticsearch entegrasyonu  
- [ ] Log aggregation dashboard
- [ ] Alert system integration

---

**AI Model**: Claude Sonnet 4.5 (claude-sonnet-4-20250514)  
**Oluşturulma**: 10 Kasım 2025  
**Durum**: ✅ Production Ready