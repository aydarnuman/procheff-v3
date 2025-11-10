# İhale Worker

Playwright-based scraper service for Ihalebul.com

## Development

```bash
npm install
npm run dev
```

## Build & Deploy

```bash
npm run build
docker build -t ihale-worker .
docker run -p 8080:8080 ihale-worker
```

## API Endpoints

- `POST /auth/login` - Login to ihalebul.com
- `GET /list?sessionId=xxx` - Get tender list
- `GET /detail/:id?sessionId=xxx` - Get tender detail
- `GET /proxy?sessionId=xxx&url=xxx` - Proxy document download
- `GET /health` - Health check

## Environment Variables

None required - credentials passed via API calls.
