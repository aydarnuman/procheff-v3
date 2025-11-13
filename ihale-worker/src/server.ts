import express from 'express';
import cors from 'cors';
import { mountIhalebul, cleanupBrowsers } from './ihalebul';

// Türkçe logger
const Log = {
  basla: (msg: string) => console.log(`\x1b[36m🔄 [${new Date().toLocaleTimeString('tr-TR')}] ${msg} başlatılıyor...\x1b[0m`),
  basarili: (msg: string, detay?: any) => {
    console.log(`\x1b[32m✅ [${new Date().toLocaleTimeString('tr-TR')}] ${msg} tamamlandı\x1b[0m`);
    if (detay) console.log(`\x1b[2m   📋 Detay:`, detay, '\x1b[0m');
  },
  hata: (msg: string, err?: any) => {
    console.error(`\x1b[31m❌ [${new Date().toLocaleTimeString('tr-TR')}] ${msg} başarısız\x1b[0m`);
    if (err) console.error(`\x1b[2m   🐛 Hata:`, err, '\x1b[0m');
  },
  bilgi: (msg: string) => console.log(`\x1b[34mℹ️  [${new Date().toLocaleTimeString('tr-TR')}] ${msg}\x1b[0m`),
  uyari: (msg: string) => console.log(`\x1b[33m⚠️  [${new Date().toLocaleTimeString('tr-TR')}] ${msg}\x1b[0m`)
};

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ 
    service: 'ihale-worker', 
    status: 'running',
    endpoints: ['/health', '/api/ihale/*'],
    timestamp: new Date().toISOString() 
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'ihale-worker', timestamp: new Date().toISOString() });
});

mountIhalebul(app);

const PORT = Number(process.env.PORT) || 8080;
const HOST = '0.0.0.0'; // Bind to all interfaces (IPv4 and IPv6)

const server = app.listen(PORT, HOST, () => {
  Log.basarili(`İhale Worker servisi başlatıldı`, {
    host: HOST,
    port: PORT,
    adresler: [
      `http://localhost:${PORT}`,
      `http://127.0.0.1:${PORT}`,
      `http://${HOST}:${PORT}`
    ]
  });
  Log.bilgi(`Sağlık kontrolü: http://localhost:${PORT}/health`);
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  Log.bilgi(`${signal} sinyali alındı - düzgün kapatma başlatılıyor`);
  
  // Close HTTP server first
  server.close(async () => {
    Log.basarili('HTTP sunucu kapatıldı');
    
    // Clean up Playwright browsers
    Log.basla('Playwright tarayıcıları temizleniyor');
    await cleanupBrowsers();
    Log.basarili('Tarayıcılar temizlendi');
    
    Log.basarili('Düzgün kapatma tamamlandı');
    process.exit(0);
  });
  
  // Force exit if shutdown takes too long
  setTimeout(() => {
    Log.uyari('Kapatma zaman aşımı, zorla çıkılıyor...');
    process.exit(1);
  }, 10000); // 10 saniye timeout
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', async (error) => {
  Log.hata('Yakalanmamış hata', error);
  await cleanupBrowsers();
  server.close(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', async (reason, promise) => {
  Log.hata('İşlenmemiş Promise reddi', { sebep: reason, promise });
  await cleanupBrowsers();
  server.close(() => {
    process.exit(1);
  });
});
