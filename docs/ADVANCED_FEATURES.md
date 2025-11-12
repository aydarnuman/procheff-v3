# Advanced Features Documentation

**Complete guide to advanced features in Procheff-v3**

This document covers the Chat System, Market Intelligence, Memory Graph, and other advanced capabilities.

**Last Updated**: 2025-01-12

---

## 📚 Table of Contents

- [Chat System](#chat-system)
- [Market Intelligence](#market-intelligence)
- [Memory Graph](#memory-graph)
- [Auto-Pipeline Orchestrator](#auto-pipeline-orchestrator)
- [Real-time Notifications](#real-time-notifications)

---

## Chat System

### Overview

AI-powered chat assistant integrated with Claude Sonnet 4.5 for context-aware tender analysis assistance.

**Location**: `/app/chat`  
**API**: `/api/chat`

### Features

- **Streaming Responses**: Real-time AI responses via Server-Sent Events
- **Context Awareness**: Learns from past analyses and conversations
- **Command Support**: Special commands for quick actions
- **Memory Integration**: Uses Memory Graph for knowledge retention
- **Learning Engine**: Improves responses based on user feedback

### Usage

```typescript
// Send message
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What is the best approach for this tender?',
    context: { analysisId: 'analysis_123' }
  })
});

// Stream response
const reader = response.body?.getReader();
// Process streaming chunks...
```

### Commands

- `/analyze [tender-id]` - Analyze specific tender
- `/compare [id1] [id2]` - Compare two tenders
- `/history` - Show analysis history
- `/help` - Show available commands

### Components

- `ChatInterface` - Main chat UI
- `MessageBubble` - Individual message display
- `InputArea` - Message input with command support
- `ContextWidgets` - Alerts, metrics, price widgets

---

## Market Intelligence

### Overview

Advanced market price intelligence system with multiple data sources and AI-powered forecasting.

**API**: `/api/market/*`

### Features

- **Multi-Source Pricing**: TÜIK, web scraping, database, AI estimation
- **Price History**: 12-month historical data
- **Forecasting**: AI-powered next-month price predictions
- **Bulk Queries**: Query up to 50 products at once
- **Caching**: Intelligent caching for performance

### Data Sources

1. **TÜIK (Turkish Statistical Institute)**: Official government data
2. **Web Scraping**: Real-time market prices
3. **Database**: Historical price records
4. **AI Estimation**: Claude-powered price estimation when data unavailable

### Usage

```typescript
// Single product price
const response = await fetch('/api/market/price', {
  method: 'POST',
  body: JSON.stringify({
    product: 'Tavuk Göğsü',
    unit: 'kg'
  })
});

// Bulk query
const bulkResponse = await fetch('/api/market/bulk', {
  method: 'POST',
  body: JSON.stringify({
    items: [
      { product: 'Tavuk', unit: 'kg' },
      { product: 'Pirinç', unit: 'kg' }
    ]
  })
});
```

### Price Response Format

```json
{
  "ok": true,
  "data": {
    "product": "Tavuk Göğsü",
    "price": 85.50,
    "unit": "kg",
    "source": "tuik",
    "confidence": 0.95,
    "history": [
      {"month": "2024-01", "price": 80.00},
      {"month": "2024-02", "price": 82.50}
    ],
    "forecast": {
      "nextMonth": 87.00,
      "confidence": 0.85
    }
  }
}
```

---

## Memory Graph

### Overview

Knowledge graph system for storing and retrieving analysis insights and relationships.

**API**: `/api/memory`

### Features

- **Entity Storage**: Store tender entities (organizations, products, prices)
- **Relationship Mapping**: Create relationships between entities
- **Graph Search**: Search for related entities
- **Learning**: System learns from past analyses

### Operations

#### Create Entities

```typescript
await fetch('/api/memory', {
  method: 'POST',
  body: JSON.stringify({
    action: 'create_entities',
    params: {
      entities: [
        { type: 'organization', name: 'Sağlık Bakanlığı' },
        { type: 'product', name: 'Tavuk', price: 85.50 }
      ]
    }
  })
});
```

#### Search Nodes

```typescript
await fetch('/api/memory', {
  method: 'POST',
  body: JSON.stringify({
    action: 'search_nodes',
    params: {
      query: 'tavuk',
      type: 'product'
    }
  })
});
```

#### Create Relations

```typescript
await fetch('/api/memory', {
  method: 'POST',
  body: JSON.stringify({
    action: 'create_relations',
    params: {
      from: 'entity_id_1',
      to: 'entity_id_2',
      relation: 'purchases'
    }
  })
});
```

---

## Auto-Pipeline Orchestrator

### Overview

End-to-end automated analysis pipeline that processes tenders from upload to final report.

**API**: `/api/orchestrate`

### Pipeline Steps

1. **Upload** - File upload and validation
2. **Extract** - Text extraction and OCR
3. **Analyze** - AI analysis (contextual, market, deep)
4. **Cost Analysis** - Cost calculation
5. **Decision** - Bid/no-bid recommendation
6. **Export** - PDF/Excel report generation

### Usage

```typescript
// Start orchestration
const formData = new FormData();
formData.append('file', file);

const response = await fetch('/api/orchestrate', {
  method: 'POST',
  body: formData
});

const { jobId } = await response.json();

// Track progress via SSE
const eventSource = new EventSource(`/api/orchestrate/jobs/${jobId}/events`);
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress:', data);
};
```

### Job Status

- `pending` - Queued for processing
- `running` - Currently processing
- `completed` - Successfully completed
- `failed` - Processing failed
- `cancelled` - User cancelled

---

## Real-time Notifications

### Overview

Server-Sent Events (SSE) based real-time notification system.

**API**: `/api/notifications/*`

### Features

- **Real-time Streaming**: SSE for instant notifications
- **Notification History**: Last 50 notifications
- **Level-based**: info, warn, error, success
- **Read/Unread Tracking**: Mark notifications as read
- **Auto-cleanup**: 30+ day old notifications removed

### Usage

```typescript
// Get notifications
const notifications = await fetch('/api/notifications').then(r => r.json());

// Stream notifications
const eventSource = new EventSource('/api/notifications/stream');
eventSource.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  console.log('New notification:', notification);
};

// Mark as read
await fetch('/api/notifications', {
  method: 'PATCH',
  body: JSON.stringify({ ids: ['notif_123'] })
});
```

### Notification Levels

- **info**: General information
- **warn**: Warning messages
- **error**: Error alerts
- **success**: Success confirmations

---

## Smart Alerting System

### Overview

Automated system health monitoring with intelligent alert rules.

**API**: `/api/alerts`

### Alert Rules

1. **High Error Rate**: >5% errors in last 24 hours
2. **Slow Performance**: Average response time >30 seconds
3. **High Token Usage**: Daily >100k tokens
4. **Auth Errors**: 401 errors detected
5. **Server Errors**: 500 errors detected
6. **High Activity**: >100 requests in 24 hours
7. **No Activity**: No requests in 6 hours
8. **Error Spike**: Sudden error increase
9. **Token Inefficiency**: >5k tokens per error

### Configuration

Alerts run automatically every 5 minutes via cron job.

**Manual Trigger:**
```bash
curl -X POST http://localhost:3001/api/alerts
```

**Slack Integration:**
Set `SLACK_WEBHOOK_URL` in environment variables.

---

## Integration Examples

### Complete Analysis Flow

```typescript
// 1. Upload files
const uploadResponse = await fetch('/api/analysis/upload', {
  method: 'POST',
  body: formData
});
const { analysisId } = await uploadResponse.json();

// 2. Process analysis
await fetch('/api/analysis/process', {
  method: 'POST',
  body: JSON.stringify({ analysisId, dataPool })
});

// 3. Get market prices
const prices = await fetch('/api/market/bulk', {
  method: 'POST',
  body: JSON.stringify({ items: menuItems })
});

// 4. Run cost analysis
const costAnalysis = await fetch('/api/ai/cost-analysis', {
  method: 'POST',
  body: JSON.stringify({ menu_data: prices })
});

// 5. Get decision recommendation
const decision = await fetch('/api/ai/decision', {
  method: 'POST',
  body: JSON.stringify({ costAnalysis, marketAnalysis })
});
```

---

**Last Updated**: 2025-01-12  
**Maintained By**: Procheff-v3 Development Team


