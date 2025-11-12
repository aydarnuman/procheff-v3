# API Reference Documentation

**Complete API Reference for Procheff-v3**

This document provides comprehensive documentation for all 48+ API endpoints in the Procheff-v3 system.

**Last Updated**: 2025-01-12  
**Base URL**: `http://localhost:3001` (development) or your production domain

---

## 📚 Table of Contents

- [Authentication](#authentication)
- [Analysis Endpoints](#analysis-endpoints)
- [AI Endpoints](#ai-endpoints)
- [İhale (Tender) Endpoints](#ihale-tender-endpoints)
- [Market Intelligence](#market-intelligence)
- [Orchestration](#orchestration)
- [Notifications](#notifications)
- [Export](#export)
- [System](#system)
- [Chat](#chat)
- [Memory](#memory)
- [Performance](#performance)
- [Cron Jobs](#cron-jobs)

---

## Authentication

### Register User

**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "User Name"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Validation error
- `409` - User already exists

---

## Analysis Endpoints

### Upload Files for Analysis

**POST** `/api/analysis/upload`

Upload files to start a new analysis.

**Request:** `multipart/form-data`
- `files`: File[] (multiple files supported)

**Response:**
```json
{
  "success": true,
  "analysisId": "analysis_1234567890",
  "files": [
    {
      "id": "file_id",
      "name": "document.pdf",
      "size": 1024000,
      "type": "application/pdf"
    }
  ]
}
```

### Process Analysis

**POST** `/api/analysis/process`

Run complete analysis pipeline (upload → extract → analyze).

**Request Body:**
```json
{
  "analysisId": "analysis_1234567890",
  "dataPool": {
    "documents": [...],
    "textBlocks": [...],
    "tables": [...],
    "entities": [...]
  },
  "options": {
    "skipOCR": false,
    "enableMarketAnalysis": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "analysisId": "analysis_1234567890",
  "result": {
    "contextual": {...},
    "market": {...},
    "deep": {...}
  },
  "duration": 45000
}
```

### Process Single Document

**POST** `/api/analysis/process-single`

Process a single document file.

**Request:** `multipart/form-data`
- `file`: File

**Response:**
```json
{
  "success": true,
  "dataPool": {
    "documents": [...],
    "textBlocks": [...],
    "tables": [...]
  }
}
```

### Get Analysis Results

**GET** `/api/analysis/results/[id]?stage=contextual|market|deep`

Retrieve analysis results by ID and stage.

**Query Parameters:**
- `stage` (optional): `contextual` | `market` | `deep`

**Response:**
```json
{
  "success": true,
  "analysis": {
    "id": "analysis_1234567890",
    "contextual": {...},
    "market": {...},
    "deep": {...}
  }
}
```

### Contextual Analysis

**POST** `/api/analysis/contextual`

Run contextual (risk) analysis only.

**Request Body:**
```json
{
  "analysisId": "analysis_1234567890",
  "dataPool": {...}
}
```

**Response:**
```json
{
  "success": true,
  "contextualAnalysis": {
    "operationalRisk": {...},
    "costDeviation": {...},
    "timeSuitability": {...}
  }
}
```

### Market Analysis

**POST** `/api/analysis/market`

Run market intelligence analysis.

**Request Body:**
```json
{
  "analysisId": "analysis_1234567890",
  "dataPool": {...},
  "menuItems": [...] // optional
}
```

**Response:**
```json
{
  "success": true,
  "marketAnalysis": {
    "priceComparison": {...},
    "marketTrends": {...},
    "recommendations": [...]
  }
}
```

### Complete Analysis

**POST** `/api/analysis/complete`

Mark analysis as completed.

**Request Body:**
```json
{
  "analysisId": "analysis_1234567890",
  "scores": {
    "overall": 85,
    "risk": 20,
    "profitability": 90
  }
}
```

### Get Analysis by ID

**GET** `/api/analysis/[id]`

Get full analysis details by ID.

**Response:**
```json
{
  "success": true,
  "analysis": {
    "id": "analysis_1234567890",
    "status": "completed",
    "dataPool": {...},
    "contextual": {...},
    "market": {...},
    "deep": {...}
  }
}
```

---

## AI Endpoints

### Deep Analysis

**POST** `/api/ai/deep-analysis`

Claude Sonnet 4.5 powered deep strategic analysis.

**Request Body:**
```json
{
  "extracted_data": {
    "kurum": "Sağlık Bakanlığı",
    "ihale_turu": "Medikal Malzeme",
    "butce": "1000000 TL"
  },
  "contextual_analysis": {...} // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendation": "katil",
    "confidence": 0.85,
    "reasoning": "...",
    "risks": [...],
    "opportunities": [...]
  },
  "metadata": {
    "tokens": 5000,
    "duration": 12000
  }
}
```

**Rate Limiting:** 5 requests/minute

### Cost Analysis

**POST** `/api/ai/cost-analysis`

AI-powered cost calculation and optimization.

**Request Body:**
```json
{
  "kurum": "Sağlık Bakanlığı",
  "ihale_turu": "Yemek Hizmeti",
  "menu_data": [
    {"item": "Tavuk", "quantity": 100, "unit": "kg"}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "costAnalysis": {
    "dailyCostPerPerson": 45.50,
    "totalCost": 136500,
    "profitability": 0.15,
    "riskyItems": [...],
    "optimizations": [...]
  }
}
```

### Decision Engine

**POST** `/api/ai/decision`

Bid/no-bid decision recommendations.

**Request Body:**
```json
{
  "tenderData": {...},
  "costAnalysis": {...},
  "marketAnalysis": {...}
}
```

**Response:**
```json
{
  "success": true,
  "decision": {
    "recommendation": "katil" | "katilma",
    "confidence": 0.92,
    "reasoning": "...",
    "factors": [...]
  }
}
```

---

## İhale (Tender) Endpoints

### List Tenders

**GET** `/api/ihale/list?page=1&limit=20`

Get paginated list of tenders.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "tenders": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Get Tender Detail

**GET** `/api/ihale/detail/[id]`

Get detailed information about a specific tender.

**Response:**
```json
{
  "success": true,
  "tender": {
    "id": "tender_id",
    "title": "İhale Başlığı",
    "organization": "Kurum Adı",
    "details": {...},
    "documents": [...],
    "html_formatted": "..."
  }
}
```

### Fetch Full Content

**POST** `/api/ihale/fetch-full-content`

Fetch and parse full tender content from URL (with OCR).

**Request Body:**
```json
{
  "url": "https://ihalebul.com/tender/12345"
}
```

**Response:**
```json
{
  "success": true,
  "content": {
    "html": "...",
    "text": "...",
    "screenshot": "base64...",
    "parsed": {
      "title": "...",
      "details": {...},
      "documents": [...]
    }
  }
}
```

### Upload Tender Document

**POST** `/api/ihale/upload`

Upload tender document file.

**Request:** `multipart/form-data`
- `file`: File

**Response:**
```json
{
  "success": true,
  "tenderId": "tender_id",
  "document": {
    "id": "doc_id",
    "name": "document.pdf",
    "size": 1024000
  }
}
```

### Export Tender as CSV

**GET** `/api/ihale/export-csv/[id]`

Export tender data as CSV file.

**Response:** CSV file download

### İhale Proxy

**GET** `/api/ihale/proxy?url=...`

Proxy request to ihalebul.com (for CORS).

**Query Parameters:**
- `url`: Target URL to proxy

### İhale Login

**POST** `/api/ihale/login`

Login to ihalebul.com (for scraping).

**Request Body:**
```json
{
  "username": "user@example.com",
  "password": "password"
}
```

### Get Job Events (SSE)

**GET** `/api/ihale/jobs/[id]/events`

Server-Sent Events stream for job progress.

**Response:** SSE stream with events:
```
event: progress
data: {"step": "fetching", "progress": 50}

event: complete
data: {"success": true, "result": {...}}
```

---

## Market Intelligence

### Get Product Price

**POST** `/api/market/price`

Get current market price for a product.

**Request Body:**
```json
{
  "product": "Tavuk Göğsü",
  "unit": "kg" // optional
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "product": "Tavuk Göğsü",
    "price": 85.50,
    "unit": "kg",
    "source": "tuik" | "web" | "db" | "ai",
    "confidence": 0.95,
    "history": [...],
    "forecast": {...}
  },
  "cached": false,
  "normalized": {
    "product_key": "tavuk_gogsu",
    "base": "tavuk"
  }
}
```

### Bulk Price Query

**POST** `/api/market/bulk`

Query prices for multiple products.

**Request Body:**
```json
{
  "items": [
    {"product": "Tavuk", "unit": "kg"},
    {"product": "Pirinç", "unit": "kg"}
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {"product": "Tavuk", "ok": true, "data": {...}},
    {"product": "Pirinç", "ok": true, "data": {...}}
  ]
}
```

### Get Price History

**GET** `/api/market/history?product=...&months=12`

Get historical price data.

**Query Parameters:**
- `product`: Product name
- `months` (optional): Number of months (default: 12)

**Response:**
```json
{
  "ok": true,
  "product": "Tavuk Göğsü",
  "history": [
    {"month": "2024-01", "price": 80.00},
    {"month": "2024-02", "price": 82.50}
  ]
}
```

### Market Admin Init

**POST** `/api/market/admin/init`

Initialize market data (admin only).

**GET** `/api/market/admin/init`

Get initialization status.

---

## Orchestration

### Start Orchestration

**POST** `/api/orchestrate`

Start end-to-end automated analysis pipeline.

**Request:** `multipart/form-data`
- `file`: File (PDF/DOCX)

**Response:**
```json
{
  "success": true,
  "jobId": "job_abc123",
  "status": "pending"
}
```

**Status:** `202 Accepted` - Processing starts asynchronously

### List Orchestration Jobs

**GET** `/api/orchestrate/jobs?status=pending&limit=50&search=...`

List all orchestration jobs with filtering.

**Query Parameters:**
- `status` (optional): `pending` | `running` | `completed` | `failed` | `cancelled`
- `search` (optional): Search term
- `limit` (optional): Max results (default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "jobs": [
    {
      "id": "job_abc123",
      "status": "completed",
      "result": {...},
      "steps_json": [...],
      "created_at": "2025-01-12T10:00:00Z"
    }
  ],
  "count": 10
}
```

### Get Job Details

**GET** `/api/orchestrate/jobs/[id]`

Get detailed information about a specific job.

**Response:**
```json
{
  "success": true,
  "job": {
    "id": "job_abc123",
    "status": "completed",
    "result": {...},
    "steps": [...],
    "created_at": "2025-01-12T10:00:00Z",
    "completed_at": "2025-01-12T10:05:00Z"
  }
}
```

### Delete Job

**DELETE** `/api/orchestrate/jobs/[id]`

Delete an orchestration job.

**Response:**
```json
{
  "success": true,
  "message": "Job deleted"
}
```

### Update Job Status

**PATCH** `/api/orchestrate/jobs/[id]`

Update job status (e.g., cancel).

**Request Body:**
```json
{
  "status": "cancelled"
}
```

### Get Job Events (SSE)

**GET** `/api/orchestrate/jobs/[id]/events`

Server-Sent Events stream for job progress.

**Response:** SSE stream

### Get Active Job Count

**GET** `/api/orchestrate/active-count`

Get count of active (pending/running) jobs.

**Response:**
```json
{
  "success": true,
  "count": 5
}
```

### Get Orchestration History

**GET** `/api/orchestrate/history?limit=20`

Get recent orchestration history.

**Query Parameters:**
- `limit` (optional): Number of results (default: 20)

---

## Notifications

### Get Notifications

**GET** `/api/notifications?unreadOnly=true`

Get user notifications.

**Query Parameters:**
- `unreadOnly` (optional): Only return unread notifications

**Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "notif_123",
      "level": "info" | "warn" | "error" | "success",
      "title": "Notification Title",
      "message": "Notification message",
      "read": false,
      "created_at": "2025-01-12T10:00:00Z"
    }
  ]
}
```

### Mark Notifications as Read

**PATCH** `/api/notifications`

Mark all notifications as read.

**Request Body:**
```json
{
  "ids": ["notif_123", "notif_456"] // optional, omit to mark all
}
```

**Response:**
```json
{
  "success": true,
  "updated": 5
}
```

### Notification Stream (SSE)

**GET** `/api/notifications/stream`

Server-Sent Events stream for real-time notifications.

**Response:** SSE stream with notification events

### Test Notification

**POST** `/api/notifications/test`

Send a test notification (admin only).

**Request Body:**
```json
{
  "level": "info",
  "title": "Test Notification",
  "message": "This is a test"
}
```

---

## Export

### Export as PDF

**POST** `/api/export/pdf`

Generate and download PDF report.

**Request Body:**
```json
{
  "data": {...},
  "template": "analysis" | "tender" | "cost"
}
```

**Response:** PDF file download

### Export as Excel

**POST** `/api/export/xlsx`

Generate and download Excel report.

**Request Body:**
```json
{
  "data": {...},
  "sheets": [
    {"name": "Sheet1", "data": [...]}
  ]
}
```

**Response:** XLSX file download

---

## System

### Health Check

**GET** `/api/health`

System health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-12T10:00:00Z",
  "services": {
    "database": "ok",
    "redis": "ok",
    "ai": "ok"
  }
}
```

### Get Metrics

**GET** `/api/metrics`

System performance metrics.

**Response:**
```json
{
  "success": true,
  "metrics": {
    "totalRequests": 1500,
    "averageResponseTime": 250,
    "errorRate": 0.02,
    "tokenUsage": {
      "total": 500000,
      "average": 5000
    }
  }
}
```

### Get Alerts

**GET** `/api/alerts`

Get system alerts.

**POST** `/api/alerts`

Trigger alert check manually.

**Response:**
```json
{
  "success": true,
  "alerts": [
    {
      "id": "alert_123",
      "level": "error",
      "message": "High error rate detected",
      "created_at": "2025-01-12T10:00:00Z"
    }
  ]
}
```

### Get Logs

**GET** `/api/logs?level=error&limit=50`

Get system logs.

**Query Parameters:**
- `level` (optional): `info` | `warn` | `error` | `success`
- `limit` (optional): Max results (default: 50)

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": "log_123",
      "level": "error",
      "message": "Error message",
      "metadata": {...},
      "timestamp": "2025-01-12T10:00:00Z"
    }
  ]
}
```

### Performance Config

**GET** `/api/performance/config`

Get performance configuration.

**POST** `/api/performance/config`

Update performance configuration.

**Request Body:**
```json
{
  "rateLimiting": {
    "enabled": true,
    "globalLimit": 100
  },
  "caching": {
    "enabled": true,
    "ttl": 3600
  }
}
```

### Performance Stats

**GET** `/api/performance/stats`

Get performance statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "cacheHitRate": 0.95,
    "averageResponseTime": 250,
    "rateLimitHits": 10
  }
}
```

---

## Chat

### Send Chat Message

**POST** `/api/chat`

Send message to AI assistant (streaming).

**Request Body:**
```json
{
  "message": "What is the best approach for this tender?",
  "context": {...} // optional
}
```

**Response:** Streaming response (text/event-stream)

### Update Chat History

**PUT** `/api/chat`

Update chat conversation history.

**Request Body:**
```json
{
  "conversationId": "conv_123",
  "messages": [...]
}
```

---

## Memory

### Memory Operations

**POST** `/api/memory`

Memory graph operations (MCP integration).

**Request Body:**
```json
{
  "action": "create_entities" | "search_nodes" | "create_relations",
  "params": {...}
}
```

**Response:**
```json
{
  "success": true,
  "message": "Operation completed",
  "results": [...] // for search_nodes
}
```

---

## Cron Jobs

### İhale Refresh

**GET** `/api/cron/ihale-refresh`

Cron job to refresh tender data.

**Headers:**
- `Authorization: Bearer <cron-secret>` (required)

**Response:**
```json
{
  "success": true,
  "refreshed": 25,
  "duration": 5000
}
```

### Market Refresh

**GET** `/api/cron/market-refresh`

Cron job to refresh market data.

**Headers:**
- `Authorization: Bearer <cron-secret>` (required)

---

## Parser

### Menu Parser

**POST** `/api/parser/menu`

Parse menu data from CSV/TXT/PDF.

**Request:** `multipart/form-data`
- `file`: File

**Response:**
```json
{
  "success": true,
  "menuItems": [
    {
      "name": "Tavuk",
      "quantity": 100,
      "unit": "kg",
      "category": "protein"
    }
  ]
}
```

---

## Documents

### Document Preview

**POST** `/api/documents/preview`

Generate preview for document.

**Request Body:**
```json
{
  "documentId": "doc_123",
  "format": "html" | "text"
}
```

**Response:**
```json
{
  "success": true,
  "preview": "...",
  "format": "html"
}
```

---

## Error Responses

All endpoints may return error responses in this format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {...} // optional
}
```

**Common Error Codes:**
- `INVALID_REQUEST` - Missing or invalid request parameters
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `AUTHENTICATION_REQUIRED` - Authentication needed
- `NOT_FOUND` - Resource not found
- `INTERNAL_ERROR` - Server error

**Status Codes:**
- `200` - Success
- `201` - Created
- `202` - Accepted (async processing)
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## Rate Limiting

Some endpoints have rate limiting enabled:

- **AI Endpoints**: 5 requests/minute
- **Market Endpoints**: 10 requests/minute
- **Analysis Endpoints**: 3 requests/minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time (Unix timestamp)

---

## Authentication

Most endpoints require authentication via NextAuth session cookie or JWT token.

**Headers:**
```
Cookie: next-auth.session-token=...
```

or

```
Authorization: Bearer <jwt-token>
```

---

**Last Updated**: 2025-01-12  
**Total Endpoints**: 48+  
**Maintained By**: Procheff-v3 Development Team


