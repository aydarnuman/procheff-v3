import express from 'express';
import cors from 'cors';
import { mountIhalebul } from './ihalebul';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'ihale-worker', timestamp: new Date().toISOString() });
});

// Mount ihalebul routes
mountIhalebul(app);

app.listen(PORT, () => {
  console.log(`🚀 İhale Worker running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
