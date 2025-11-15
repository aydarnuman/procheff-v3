import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { mountIhalebul, cleanupBrowsers } from './ihalebul';
import { browserPool } from './browser-pool';
import { rateLimiter, getRateLimiterStats } from './middleware/rate-limiter';
import { config } from './config';

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

// Middleware
app.use(cors({ origin: '*' }));
app.use(compression()); // Gzip compression
app.use(express.json());

// Rate limiting (apply to all routes)
app.use(rateLimiter);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    service: 'ihale-worker',
    status: 'running',
    version: '2.0.0',
    endpoints: [
      '/health',
      '/auth/login',
      '/list',
      '/detail/:id',
      '/proxy',
      '/export',
      '/debug/html'
    ],
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint (detailed)
app.get('/health', (_req, res) => {
  const browserStats = browserPool.getStats();
  const rateLimiterStats = getRateLimiterStats();
  const memoryUsage = process.memoryUsage();

  res.json({
    ok: true,
    service: 'ihale-worker',
    version: '2.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
    },
    browserPool: browserStats,
    rateLimiter: rateLimiterStats,
    config: {
      maxConcurrentBrowsers: config.MAX_CONCURRENT_BROWSERS,
      sessionTTL: `${config.SESSION_TTL_MS / 1000}s`,
      rateLimit: `${config.RATE_LIMIT_MAX_REQUESTS} requests/${config.RATE_LIMIT_WINDOW_MS / 1000}s`,
    }
  });
});

mountIhalebul(app);

// Initialize browser pool before starting server
async function startServer() {
  try {
    Log.basla('Browser pool başlatılıyor');
    await browserPool.initialize();
    Log.basarili('Browser pool hazır');

    const server = app.listen(config.PORT, config.HOST, () => {
      Log.basarili(`İhale Worker servisi başlatıldı`, {
        host: config.HOST,
        port: config.PORT,
        adresler: [
          `http://localhost:${config.PORT}`,
          `http://127.0.0.1:${config.PORT}`,
          `http://${config.HOST}:${config.PORT}`
        ]
      });
      Log.bilgi(`Sağlık kontrolü: http://localhost:${config.PORT}/health`);
    });

    return server;
  } catch (error) {
    Log.hata('Sunucu başlatılamadı', error);
    process.exit(1);
  }
}

// Start server
const serverPromise = startServer();
let server: any;

serverPromise.then(s => {
  server = s;
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  Log.bilgi(`${signal} sinyali alındı - düzgün kapatma başlatılıyor`);

  // Wait for server if still initializing
  if (!server) {
    server = await serverPromise;
  }

  // Close HTTP server first
  server.close(async () => {
    Log.basarili('HTTP sunucu kapatıldı');

    // Clean up browser pool
    Log.basla('Browser pool temizleniyor');
    await cleanupBrowsers();
    Log.basarili('Browser pool temizlendi');

    Log.basarili('Düzgün kapatma tamamlandı');
    process.exit(0);
  });

  // Force exit if shutdown takes too long
  setTimeout(() => {
    Log.uyari('Kapatma zaman aşımı, zorla çıkılıyor...');
    process.exit(1);
  }, config.SHUTDOWN_TIMEOUT_MS);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', async (error) => {
  Log.hata('Yakalanmamış hata', error);

  if (!server) {
    server = await serverPromise.catch(() => null);
  }

  await cleanupBrowsers();

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on('unhandledRejection', async (reason, promise) => {
  Log.hata('İşlenmemiş Promise reddi', { sebep: reason, promise });

  if (!server) {
    server = await serverPromise.catch(() => null);
  }

  await cleanupBrowsers();

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});
