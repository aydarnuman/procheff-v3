# İhale Worker Service Documentation

**Complete guide to the ihale-worker service**

**Last Updated**: 2025-01-12

---

## Overview

The **ihale-worker** is a standalone Playwright-based service for scraping tender data from ihalebul.com. It runs as a separate service and communicates with the main Next.js application via HTTP API.

**Location**: `/ihale-worker`  
**Port**: `8080` (default)

---

## Features

- **Playwright-based Scraping**: Reliable browser automation
- **Session Management**: Maintains login sessions
- **Document Proxy**: Proxies document downloads
- **Health Monitoring**: Health check endpoint
- **TypeScript**: Fully typed implementation

---

## Setup

### Installation

```bash
cd ihale-worker
npm install
```

### Development

```bash
npm run dev
```

Service runs on `http://localhost:8080`

### Build

```bash
npm run build
```

### Docker

```bash
docker build -t ihale-worker .
docker run -p 8080:8080 ihale-worker
```

---

## API Endpoints

### POST /auth/login

Login to ihalebul.com.

**Request Body:**
```json
{
  "username": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session_abc123"
}
```

### GET /list?sessionId=xxx

Get list of tenders.

**Query Parameters:**
- `sessionId` (required): Session ID from login

**Response:**
```json
{
  "success": true,
  "tenders": [
    {
      "id": "tender_id",
      "title": "İhale Başlığı",
      "city": "İstanbul",
      "tender_date": "2025-01-15",
      "days_remaining": 5
    }
  ]
}
```

### GET /detail/:id?sessionId=xxx

Get detailed tender information.

**Path Parameters:**
- `id`: Tender ID

**Query Parameters:**
- `sessionId` (required): Session ID

**Response:**
```json
{
  "success": true,
  "tender": {
    "id": "tender_id",
    "title": "...",
    "details": {...},
    "documents": [...]
  }
}
```

### GET /proxy?sessionId=xxx&url=xxx

Proxy document download (for CORS).

**Query Parameters:**
- `sessionId` (required): Session ID
- `url` (required): Document URL to proxy

**Response:** Document file (binary)

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-12T10:00:00Z"
}
```

---

## Integration with Main App

The main Next.js app calls the worker service:

```typescript
// Login
const loginResponse = await fetch('http://localhost:8080/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username, password })
});
const { sessionId } = await loginResponse.json();

// Get tenders
const tendersResponse = await fetch(`http://localhost:8080/list?sessionId=${sessionId}`);
const { tenders } = await tendersResponse.json();
```

---

## Architecture

```
┌─────────────┐         ┌──────────────┐
│  Next.js    │  HTTP   │ ihale-worker │
│   App       │ ──────> │   Service    │
│  (Port 3001)│         │  (Port 8080) │
└─────────────┘         └──────┬───────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  ihalebul.com│
                        │   (Scraping) │
                        └──────────────┘
```

---

## Environment Variables

No environment variables required - credentials passed via API calls.

---

## Troubleshooting

### Service won't start
- Check port 8080 is available: `lsof -ti:8080`
- Kill existing process: `lsof -ti:8080 | xargs kill -9`

### Login fails
- Verify credentials are correct
- Check ihalebul.com is accessible
- Review Playwright logs

### Timeout errors
- Increase timeout in Playwright config
- Check network connectivity

---

**Last Updated**: 2025-01-12  
**Maintained By**: Procheff-v3 Development Team


