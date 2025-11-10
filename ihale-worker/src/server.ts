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
app.listen(PORT, () => {
  console.log(`🚀 Ihale Worker running on port :${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
