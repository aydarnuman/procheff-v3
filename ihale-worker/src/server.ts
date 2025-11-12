import express from 'express';
import cors from 'cors';
import { mountIhalebul } from './ihalebul';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'ihale-worker', timestamp: new Date().toISOString() });
});

mountIhalebul(app);

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0'; // Bind to all interfaces (IPv4 and IPv6)

app.listen(PORT, HOST, () => {
  console.log(`🚀 Ihale Worker running on ${HOST}:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 Also available at: http://127.0.0.1:${PORT}/health`);
});
