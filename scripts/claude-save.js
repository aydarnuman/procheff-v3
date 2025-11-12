#!/usr/bin/env node
/**
 * 📝 Claude Output Saver
 * 
 * Claude'dan gelen çıktıyı otomatik olarak dosyaya kaydeder
 * ve hemen workflow script'ini çalıştırır.
 * 
 * Kullanım (3 yöntem):
 * 
 *   1. Clipboard'dan (macOS - EN KOLAY):
 *      - Claude'dan çıktıyı kopyala (Cmd+C)
 *      - Terminal'de: pbpaste | node scripts/claude-save.js
 *   
 *   2. Interactive mode:
 *      - node scripts/claude-save.js
 *      - Claude çıktısını yapıştır
 *      - Ctrl+D ile bitir
 * 
 *   3. Dosyadan:
 *      - node scripts/claude-save.js < claude-output.txt
 * 
 * Script otomatik olarak:
 *   - Claude çıktısını .workflow/claude-cevap.md'ye kaydeder
 *   - Workflow script'ini çalıştırır (todo list + plan oluşturur)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Çıktı dosyası adı
const outputDir = path.join(process.cwd(), '.workflow');
const outputFile = path.join(outputDir, 'claude-cevap.md');

// Clipboard'dan oku (macOS)
function readClipboard() {
  try {
    if (process.platform === 'darwin') {
      return execSync('pbpaste', { encoding: 'utf8' });
    }
  } catch (error) {
    return null;
  }
  return null;
}

// stdin'den oku
let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  input += chunk;
});

process.stdin.on('end', () => {
  // Eğer stdin boşsa, clipboard'dan dene
  if (!input.trim() && process.stdin.isTTY) {
    console.log('📋 Clipboard kontrol ediliyor...');
    const clipboard = readClipboard();
    if (clipboard && clipboard.trim()) {
      input = clipboard;
      console.log('✅ Clipboard\'dan okundu!\n');
    }
  }

  if (!input.trim()) {
    console.error('❌ Boş input! Claude çıktısını yapıştırdığınızdan emin olun.');
    console.error('\nKullanım:');
    console.error('  1. Claude çıktısını kopyala, sonra: pbpaste | node scripts/claude-save.js');
    console.error('  2. VEYA: node scripts/claude-save.js (sonra yapıştır, Ctrl+D)');
    process.exit(1);
  }

  try {
    // .workflow klasörünü oluştur
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Dosyaya kaydet
    fs.writeFileSync(outputFile, input, 'utf8');
    console.log(`✅ Claude çıktısı kaydedildi: ${outputFile}`);
    console.log(`📊 Dosya boyutu: ${(input.length / 1024).toFixed(2)} KB`);
    console.log(`📝 Satır sayısı: ${input.split('\n').length}`);

    // Otomatik olarak workflow script'ini çalıştır
    console.log('\n🔄 Workflow script\'i çalıştırılıyor...\n');
    
    try {
      execSync(`node scripts/auto-workflow.js "${outputFile}"`, {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('\n✨ Tamamlandı! `.workflow/` klasöründe sonuçları kontrol edebilirsin.');
    } catch (error) {
      console.error('\n⚠️  Workflow script hatası (dosya kaydedildi):', error.message);
      console.log(`\nManuel olarak çalıştırabilirsin:`);
      console.log(`   node scripts/auto-workflow.js "${outputFile}"`);
    }

  } catch (error) {
    console.error('❌ Dosya kaydetme hatası:', error.message);
    process.exit(1);
  }
});

// Eğer stdin kapalıysa (interactive mode için)
if (process.stdin.isTTY) {
  console.log('📝 Claude çıktısını yapıştır (Ctrl+D ile bitir):\n');
  process.stdin.resume();
}

