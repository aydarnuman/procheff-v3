# 🗄️ Database Best Practices

Bu döküman Procheff-v3 projesinde uyguladığımız SQLite best practices'lerini açıklar.

## ✅ Uygulanan Best Practices

### 1. Singleton Pattern (✅ UYGULANMIŞ)

Her zaman `getDB()` kullanarak tek bir database connection'ı paylaşıyoruz:

```typescript
import { getDB } from '@/lib/db/sqlite-client';

const db = getDB(); // ✅ Singleton - reuses connection
```

**Neden?**
- Memory efficient
- Connection pooling gerekmiyor
- Prepared statements otomatik cache'leniyor

**Yanlış Kullanım:**
```typescript
import Database from 'better-sqlite3';

const db = new Database('procheff.db'); // ❌ Her seferinde yeni connection
```

---

### 2. Prepared Statements (✅ UYGULANMIŞ)

Tüm SQL sorguları prepared statements kullanıyor:

```typescript
// ✅ Doğru: Prepared statement + parametreler
const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
const user = stmt.get(email);

// ❌ Yanlış: String interpolation (SQL injection riski!)
const users = db.prepare(`SELECT * FROM users WHERE email = '${email}'`).all();
```

**Avantajları:**
- **Security**: SQL injection koruması
- **Performance**: Statement'lar cache'leniyor
- **Type Safety**: Parametreler type-safe

**Örnek Kullanım:**
```typescript
// src/lib/db/analysis-repository.ts
const insertStmt = db.prepare(`
  INSERT INTO analysis_results_v2 (id, status, ...) 
  VALUES (?, ?, ...)
`);

insertStmt.run(analysisId, status, ...);
```

---

### 3. Transactions (✅ UYGULANMIŞ)

Bulk operations için transaction wrapper kullanıyoruz:

```typescript
import { transaction } from '@/lib/db/sqlite-client';

// Transaction wrapper
const saveAnalysis = transaction((result: TenderAnalysisResult) => {
  // Insert to analysis_results_v2
  insertStmt.run(...);
  
  // Update FTS index
  ftsStmt.run(...);
  
  // Her ikisi de başarılı olursa commit, hata olursa rollback
});

saveAnalysis(result); // Atomic operation
```

**Avantajları:**
- **Atomicity**: Ya hepsi başarılı olur ya hiçbiri
- **Performance**: Bulk inserts 10-50x daha hızlı
- **Data Integrity**: Partial writes önleniyor

**Kullanım Senaryoları:**
- Multiple related inserts
- Update + Insert kombinasyonları
- Bulk data imports

**Örnek:**
```typescript
// AnalysisRepository.save()
const saveTransaction = transaction(() => {
  insertStmt.run(...); // Insert analysis
  ftsStmt.run(...);    // Update search index
});

saveTransaction(); // Execute atomically
```

---

### 4. JSON Validation (✅ UYGULANMIŞ)

JSON columns store'dan önce validate ediliyor:

```typescript
import { validateJSON } from '@/lib/db/sqlite-client';

// Validate before storing
const dataPoolJson = validateJSON(dataPool); // ✅ Throws if invalid

db.prepare('INSERT INTO data_pools (data_pool_json) VALUES (?)').run(dataPoolJson);
```

**Neden?**
- Corrupted JSON önleniyor
- Parse errors yakalanıyor
- Data integrity garantileniyor

**Otomatik Kontroller:**
```typescript
export function validateJSON(value: any): string {
  try {
    const jsonString = JSON.stringify(value);
    JSON.parse(jsonString); // Round-trip test
    return jsonString;
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }
}
```

**Kullanım:**
```typescript
// src/lib/db/analysis-repository.ts
const extractedFieldsJson = validateJSON(result.extracted_fields || {});
const dataPoolJson = validateJSON(dataPool);
```

---

### 5. Indexes (✅ UYGULANMIŞ)

Frequently queried columns için indexes:

```sql
-- Status queries için
CREATE INDEX idx_analysis_results_status 
ON analysis_results_v2(status, created_at DESC);

-- Institution searches için
CREATE INDEX idx_analysis_results_institution 
ON analysis_results_v2(institution);

-- Data pool expiration cleanup için
CREATE INDEX idx_data_pools_expires 
ON data_pools(expires_at);

-- Notifications queries için
CREATE INDEX idx_notifications_unread 
ON notifications(is_read, created_at DESC);
```

**Index Strategy:**
```typescript
// Migration dosyalarında (src/lib/db/migrations/*.sql)
CREATE INDEX IF NOT EXISTS idx_table_column ON table(column);
```

**Performance İyileştirmesi:**
- Query time: O(n) → O(log n)
- WHERE, ORDER BY, JOIN'lerde hızlandırma
- Trade-off: Insert biraz yavaşlar ama kabul edilebilir

---

### 6. Migration System (✅ UYGULANMIŞ)

Schema değişiklikleri migration files ile yönetiliyor:

```
src/lib/db/migrations/
├── 000_create_analysis_history.sql
├── 003_analysis_repository.sql
└── 004_add_missing_indexes.sql
```

**Migration Flow:**
```typescript
// src/lib/db/run-migration.ts
export function runMigrations() {
  const migrations = [
    '000_create_analysis_history.sql',
    '003_analysis_repository.sql',
    '004_add_missing_indexes.sql'
  ];
  
  migrations.forEach(file => {
    // Execute SQL statements
  });
}
```

**Otomatik Çalışma:**
```typescript
// src/lib/db/sqlite-client.ts
export function getDB() {
  if (!db) {
    db = new Database("procheff.db");
    runMigrations(); // Auto-run on first connection
  }
  return db;
}
```

**Migration Best Practices:**
- ✅ CREATE TABLE IF NOT EXISTS kullan
- ✅ CREATE INDEX IF NOT EXISTS kullan
- ✅ Idempotent olmalı (çoklu çalıştırılabilir)
- ✅ Forward-only (rollback desteklenmez)

---

### 7. Graceful Shutdown (✅ UYGULANMIŞ)

Process termination'da database connection'ları düzgün kapatılıyor:

```typescript
import { closeDB } from '@/lib/db/sqlite-client';

// Otomatik signal handlers
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  closeDB();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDB();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  closeDB();
  process.exit(1);
});
```

**Shutdown Steps:**
```typescript
export function closeDB(): void {
  if (db && !isShuttingDown) {
    isShuttingDown = true;
    
    // 1. Run checkpoint (commit WAL to main DB)
    db.pragma('wal_checkpoint(TRUNCATE)');
    
    // 2. Close connection
    db.close();
    
    console.log('✅ Database closed gracefully');
  }
}
```

**Neden Önemli?**
- WAL data loss önleniyor
- Corruption riski minimize ediliyor
- Clean shutdown garantileniyor

---

## 🚀 Performance Optimizations

### WAL Mode

```typescript
db.pragma("journal_mode = WAL");
```

**Avantajları:**
- Readers ve writers birbirini bloklamaz
- 2-3x write performance artışı
- Better concurrency

### Cache Size

```typescript
db.pragma("cache_size = -64000"); // 64MB cache
```

**Etki:**
- Hot data RAM'de kalıyor
- Disk I/O azalıyor
- Query response time iyileşiyor

### Temp Storage

```typescript
db.pragma("temp_store = MEMORY");
```

**Avantajları:**
- Temporary tables RAM'de
- Sort operations hızlanıyor
- JOIN performance artışı

---

## 📊 Query Patterns

### 1. Single Record Insert
```typescript
const stmt = db.prepare('INSERT INTO users (email, name) VALUES (?, ?)');
stmt.run(email, name);
```

### 2. Bulk Insert (Transaction)
```typescript
const insertMany = transaction((users: User[]) => {
  const stmt = db.prepare('INSERT INTO users (email, name) VALUES (?, ?)');
  users.forEach(user => stmt.run(user.email, user.name));
});

insertMany(users); // 10-50x faster!
```

### 3. Conditional Insert/Update
```typescript
const stmt = db.prepare(`
  INSERT INTO cache (key, value) VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`);
stmt.run(key, value);
```

### 4. Full-Text Search
```typescript
const results = db.prepare(`
  SELECT a.* FROM analysis_results_v2 a
  INNER JOIN analysis_fts f ON a.id = f.analysis_id
  WHERE analysis_fts MATCH ?
  ORDER BY rank
  LIMIT ?
`).all(query, limit);
```

---

## 🔒 Security

### SQL Injection Prevention

✅ **Doğru:**
```typescript
const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
const user = stmt.get(email); // Parametreli sorgu
```

❌ **Yanlış:**
```typescript
const user = db.prepare(`SELECT * FROM users WHERE email = '${email}'`).get();
// SQL injection riski!
```

### Input Validation

```typescript
// JSON validation
const data = validateJSON(input);

// Type checking
if (typeof email !== 'string') {
  throw new Error('Invalid email type');
}

// Sanitization
const sanitized = email.trim().toLowerCase();
```

---

## 📈 Monitoring

### Query Performance

```typescript
// Development'ta query logging
if (process.env.NODE_ENV === 'development') {
  const start = Date.now();
  const result = stmt.all();
  console.log(`Query took ${Date.now() - start}ms`);
}
```

### Database Size

```typescript
import fs from 'fs';

const stats = fs.statSync('procheff.db');
console.log(`Database size: ${stats.size / 1024 / 1024} MB`);
```

### WAL File

```typescript
// Check WAL file size
const walStats = fs.statSync('procheff.db-wal');
if (walStats.size > 10 * 1024 * 1024) { // 10MB
  db.pragma('wal_checkpoint(TRUNCATE)');
}
```

---

## 🧹 Maintenance

### Vacuum (Space Reclaim)

```typescript
// Old logs temizledikten sonra
db.prepare('DELETE FROM logs WHERE created_at < datetime("now", "-90 days")').run();
db.prepare('VACUUM').run(); // Space geri al
```

### Analyze (Statistics Update)

```typescript
db.prepare('ANALYZE').run(); // Query planner için statistics güncelle
```

### Checkpoint (WAL Merge)

```typescript
db.pragma('wal_checkpoint(TRUNCATE)'); // WAL'ı main DB'ye merge et
```

---

## 📚 Best Practice Checklist

Yeni kod yazarken kontrol et:

- [ ] `getDB()` singleton kullanıyorum
- [ ] Prepared statements kullanıyorum (string interpolation yok)
- [ ] Bulk operations için transaction kullanıyorum
- [ ] JSON validation yapıyorum
- [ ] Frequently queried columns için index var
- [ ] Migration file oluşturdum
- [ ] Error handling var
- [ ] Graceful shutdown destekli

---

## 📖 Referanslar

- **better-sqlite3 Docs**: https://github.com/WiseLibs/better-sqlite3/wiki
- **SQLite Performance Tips**: https://www.sqlite.org/optoverview.html
- **WAL Mode**: https://www.sqlite.org/wal.html
- **FTS5**: https://www.sqlite.org/fts5.html

---

Son Güncelleme: 2025-11-12

