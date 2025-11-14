#!/usr/bin/env node

/**
 * SQLite to PostgreSQL Data Migration Script
 * ===========================================
 * Bu script SQLite veritabanınızdaki tüm verileri PostgreSQL'e aktarır
 */

const Database = require('better-sqlite3');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Renk kodları için ANSI escape
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function migrate() {
  console.log(`${colors.cyan}🚀 SQLite → PostgreSQL Migration Başlıyor...${colors.reset}`);
  console.log('=' .repeat(50));
  
  // SQLite bağlantısı
  const sqlite = new Database('./procheff.db', { readonly: true });
  
  // PostgreSQL bağlantısı
  const pg = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/procheff_db'
  });

  try {
    await pg.connect();
    console.log(`${colors.green}✓ PostgreSQL bağlantısı kuruldu${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ PostgreSQL bağlantı hatası:${colors.reset}`, error.message);
    process.exit(1);
  }

  // Migration istatistikleri
  const stats = {
    tables: 0,
    totalRows: 0,
    errors: [],
    warnings: []
  };

  try {
    // Transaction kullanmıyoruz - her tablo bağımsız
    // await pg.query('BEGIN');

    // Tüm tabloları al (SQLite system tablolarını ve FTS tablolarını hariç tut)
    const tables = sqlite.prepare(`
      SELECT name, sql FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%' 
      AND name NOT LIKE '_migrations'
      AND name NOT LIKE '%_fts%'
      AND name NOT LIKE '%_fts'
      AND name NOT LIKE 'fts_%'
      ORDER BY name
    `).all();

    console.log(`\n📊 ${tables.length} tablo bulundu`);
    console.log('-'.repeat(50));

    for (const table of tables) {
      console.log(`\n📋 Tablo: ${colors.blue}${table.name}${colors.reset}`);
      
      try {
        // Tablo kolonlarını al
        const columns = sqlite.prepare(`PRAGMA table_info(${table.name})`).all();
        
        // PostgreSQL tablo oluştur
        let createTableSQL = `DROP TABLE IF EXISTS ${table.name} CASCADE;\n`;
        createTableSQL += `CREATE TABLE ${table.name} (\n`;
        
        const columnDefs = columns.map(col => {
          let pgType = sqliteToPostgresType(col.type);
          let def = `  "${col.name}" ${pgType}`;
          
          // Primary key
          if (col.pk) {
            // AUTOINCREMENT için SERIAL kullan
            if (pgType === 'INTEGER' && col.name.toLowerCase() === 'id') {
              def = `  "${col.name}" SERIAL PRIMARY KEY`;
            } else {
              def += ' PRIMARY KEY';
            }
          }
          
          // NOT NULL constraint
          if (col.notnull && !col.pk) {
            def += ' NOT NULL';
          }
          
          // Default değer
          if (col.dflt_value !== null) {
            // CURRENT_TIMESTAMP dönüşümü
            if (col.dflt_value.includes('CURRENT_TIMESTAMP')) {
              def += ' DEFAULT CURRENT_TIMESTAMP';
            } else if (col.dflt_value.includes('datetime')) {
              // datetime('now') -> CURRENT_TIMESTAMP
              def += ' DEFAULT CURRENT_TIMESTAMP';
            } else {
              def += ` DEFAULT ${col.dflt_value}`;
            }
          }
          
          return def;
        }).join(',\n');
        
        createTableSQL += columnDefs + '\n);';
        
        // Tabloyu oluştur
        await pg.query(createTableSQL);
        console.log(`  ${colors.green}✓${colors.reset} Tablo yapısı oluşturuldu`);

        // Verileri aktar
        const rows = sqlite.prepare(`SELECT * FROM ${table.name}`).all();
        
        if (rows.length > 0) {
          // Batch insert için hazırlık
          const batchSize = 100;
          let insertedRows = 0;
          
          for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, Math.min(i + batchSize, rows.length));
            
            for (const row of batch) {
              const keys = Object.keys(row);
              const values = keys.map(key => {
                const value = row[key];
                // NULL değerleri kontrol et
                if (value === null || value === undefined) {
                  return null;
                }
                // JSON objelerini string'e çevir
                if (typeof value === 'object') {
                  return JSON.stringify(value);
                }
                return value;
              });
              
              const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
              const insertSQL = `
                INSERT INTO ${table.name} (${keys.map(k => `"${k}"`).join(', ')}) 
                VALUES (${placeholders})
                ON CONFLICT DO NOTHING
              `;
              
              try {
                await pg.query(insertSQL, values);
                insertedRows++;
              } catch (insertError) {
                stats.warnings.push({
                  table: table.name,
                  error: insertError.message,
                  row: row
                });
              }
            }
            
            // İlerleme göster
            process.stdout.write(`\r  ${colors.cyan}→${colors.reset} Veri aktarılıyor: ${insertedRows}/${rows.length}`);
          }
          
          console.log(`\n  ${colors.green}✓${colors.reset} ${insertedRows} kayıt aktarıldı`);
          stats.totalRows += insertedRows;
          
          // Sequence'ları güncelle (SERIAL kolonlar için)
          const idColumn = columns.find(col => col.pk && col.name.toLowerCase() === 'id');
          if (idColumn && sqliteToPostgresType(idColumn.type) === 'INTEGER') {
            const maxIdResult = await pg.query(`SELECT MAX("${idColumn.name}") as max_id FROM ${table.name}`);
            const maxId = maxIdResult.rows[0].max_id;
            if (maxId) {
              await pg.query(`SELECT setval(pg_get_serial_sequence('${table.name}', '${idColumn.name}'), ${maxId})`);
              console.log(`  ${colors.green}✓${colors.reset} Sequence güncellendi`);
            }
          }
        } else {
          console.log(`  ${colors.yellow}⚠${colors.reset} Tabloda veri yok`);
        }
        
        stats.tables++;
        
      } catch (tableError) {
        console.error(`  ${colors.red}✗ Hata:${colors.reset}`, tableError.message);
        stats.errors.push({
          table: table.name,
          error: tableError.message
        });
      }
    }

    // Indexleri oluştur
    console.log(`\n${colors.cyan}📑 Index'ler oluşturuluyor...${colors.reset}`);
    const indexes = sqlite.prepare(`
      SELECT name, tbl_name, sql FROM sqlite_master 
      WHERE type='index' 
      AND sql IS NOT NULL
      AND name NOT LIKE 'sqlite_%'
    `).all();

    for (const index of indexes) {
      try {
        // SQLite index SQL'ini PostgreSQL'e dönüştür
        let pgIndexSQL = index.sql
          .replace(/CREATE INDEX/i, 'CREATE INDEX IF NOT EXISTS')
          .replace(/COLLATE NOCASE/gi, '');
        
        await pg.query(pgIndexSQL);
        console.log(`  ${colors.green}✓${colors.reset} ${index.name}`);
      } catch (indexError) {
        // Index zaten varsa veya başka bir hata varsa
        if (!indexError.message.includes('already exists')) {
          stats.warnings.push({
            index: index.name,
            error: indexError.message
          });
        }
      }
    }

    // Transaction kullanmıyoruz
    // await pg.query('COMMIT');
    console.log(`\n${colors.green}✅ Migration başarıyla tamamlandı!${colors.reset}`);
    
  } catch (error) {
    // Transaction kullanmıyoruz
    // await pg.query('ROLLBACK');
    console.error(`\n${colors.red}❌ Migration başarısız:${colors.reset}`, error.message);
    stats.errors.push({
      general: error.message
    });
  } finally {
    // Bağlantıları kapat
    sqlite.close();
    await pg.end();
    
    // Özet rapor
    console.log('\n' + '='.repeat(50));
    console.log(`${colors.cyan}📊 Migration Özeti:${colors.reset}`);
    console.log(`  • Tablolar: ${stats.tables}`);
    console.log(`  • Toplam Kayıt: ${stats.totalRows}`);
    console.log(`  • Hatalar: ${stats.errors.length}`);
    console.log(`  • Uyarılar: ${stats.warnings.length}`);
    
    // Hataları göster
    if (stats.errors.length > 0) {
      console.log(`\n${colors.red}Hatalar:${colors.reset}`);
      stats.errors.forEach(err => {
        console.log(`  • ${JSON.stringify(err)}`);
      });
    }
    
    // Uyarıları göster
    if (stats.warnings.length > 0) {
      console.log(`\n${colors.yellow}Uyarılar:${colors.reset}`);
      stats.warnings.slice(0, 5).forEach(warn => {
        console.log(`  • ${warn.table || warn.index}: ${warn.error}`);
      });
      if (stats.warnings.length > 5) {
        console.log(`  ... ve ${stats.warnings.length - 5} uyarı daha`);
      }
    }
    
    // Detaylı raporu kaydet
    const reportPath = `migration-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));
    console.log(`\n📄 Detaylı rapor: ${reportPath}`);
  }
}

/**
 * SQLite veri tipini PostgreSQL veri tipine dönüştür
 */
function sqliteToPostgresType(sqliteType) {
  const typeMap = {
    'INTEGER': 'INTEGER',
    'INT': 'INTEGER',
    'BIGINT': 'BIGINT',
    'REAL': 'REAL',
    'FLOAT': 'DOUBLE PRECISION',
    'DOUBLE': 'DOUBLE PRECISION',
    'DECIMAL': 'DECIMAL',
    'NUMERIC': 'NUMERIC',
    'TEXT': 'TEXT',
    'VARCHAR': 'VARCHAR',
    'CHAR': 'CHAR',
    'BLOB': 'BYTEA',
    'DATETIME': 'TIMESTAMP',
    'DATE': 'DATE',
    'TIME': 'TIME',
    'BOOLEAN': 'BOOLEAN',
    'JSON': 'JSONB'
  };

  // Tip dönüşümü
  const upperType = sqliteType.toUpperCase();
  for (const [sqliteKey, pgValue] of Object.entries(typeMap)) {
    if (upperType.includes(sqliteKey)) {
      // VARCHAR(255) gibi durumlara dikkat et
      if (sqliteKey === 'VARCHAR' && upperType.includes('(')) {
        return upperType.replace('VARCHAR', 'VARCHAR');
      }
      return pgValue;
    }
  }
  
  // Bilinmeyen tip için TEXT kullan
  console.warn(`  ⚠️  Bilinmeyen tip: ${sqliteType} → TEXT`);
  return 'TEXT';
}

// Script'i çalıştır
if (require.main === module) {
  migrate().catch(error => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  });
}
