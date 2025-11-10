# Batch Processing System

## Overview

The batch processing system enables uploading and processing multiple files concurrently. Features persistent queues, retry logic, priority handling, and real-time progress tracking.

## Features

- **Multi-file upload** - Up to 50 files per batch
- **Persistent queue** - SQLite-backed (survives server restart)
- **Concurrent processing** - 3 files in parallel
- **Retry logic** - Auto-retry failures up to 3 times
- **Priority queues** - High/Normal/Low priority
- **Progress tracking** - Real-time status updates
- **Rate limited** - 3 batch uploads per hour

## Architecture

```
src/features/batch-processing/
├── init-batch-schema.ts   # Database schema & CRUD
└── queue-manager.ts       # Background processor

src/app/api/batch/
├── upload/route.ts        # POST multi-file upload
├── jobs/route.ts          # GET list all jobs
└── jobs/[id]/route.ts     # GET job details
```

### Database Schema

**batch_jobs** table:
```sql
CREATE TABLE batch_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  status TEXT,              -- pending, processing, completed, failed
  total_files INTEGER,
  processed_files INTEGER,
  failed_files INTEGER,
  priority TEXT,            -- high, normal, low
  created_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  error TEXT
);
```

**batch_files** table:
```sql
CREATE TABLE batch_files (
  id TEXT PRIMARY KEY,
  batch_id TEXT,
  filename TEXT,
  file_size INTEGER,
  file_hash TEXT,
  status TEXT,              -- pending, processing, completed, failed
  progress INTEGER,
  result TEXT,              -- JSON result
  error TEXT,
  retry_count INTEGER,
  created_at TEXT,
  started_at TEXT,
  completed_at TEXT
);
```

## Configuration

### Environment Variables

```bash
# Enable batch processing
ENABLE_BATCH=true

# No additional dependencies required (uses SQLite)
```

### Limits

Configured in `src/features/config.ts`:

```typescript
export const BATCH_CONFIG = {
  MAX_FILES_PER_BATCH: 50,
  CONCURRENT_JOBS: 3,
  MAX_RETRIES: 3,
  PROCESSING_TIMEOUT: 1800000,  // 30 minutes
};
```

## Usage

### Upload Multiple Files

**Endpoint**: `POST /api/batch/upload`

**Form Data**:
```javascript
const formData = new FormData();
formData.append("file", file1);
formData.append("file", file2);
formData.append("file", file3);
formData.append("priority", "high");  // Optional: high/normal/low
formData.append("user_id", "user-123");  // Optional

const response = await fetch("/api/batch/upload", {
  method: "POST",
  body: formData,
});
```

**Response**:
```json
{
  "success": true,
  "data": {
    "batchId": "550e8400-e29b-41d4-a716-446655440000",
    "totalFiles": 3,
    "status": "pending",
    "files": [
      {
        "id": "file-1",
        "filename": "menu1.pdf",
        "fileSize": 1024000,
        "status": "pending"
      }
    ]
  }
}
```

### List All Batch Jobs

**Endpoint**: `GET /api/batch/jobs`

**Query Parameters**:
- `limit` - Max jobs to return (default: 50)
- `offset` - Pagination offset (default: 0)
- `status` - Filter by status (pending/processing/completed/failed)
- `userId` - Filter by user

**Example**:
```bash
curl "http://localhost:3000/api/batch/jobs?limit=10&status=completed"
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "batch-123",
      "status": "completed",
      "total_files": 5,
      "processed_files": 5,
      "failed_files": 0,
      "priority": "high",
      "created_at": "2024-01-01T10:00:00Z",
      "completed_at": "2024-01-01T10:05:00Z"
    }
  ]
}
```

### Get Batch Job Details

**Endpoint**: `GET /api/batch/jobs/[id]`

**Example**:
```bash
curl "http://localhost:3000/api/batch/jobs/batch-123"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "batch": {
      "id": "batch-123",
      "status": "processing",
      "total_files": 5,
      "processed_files": 3,
      "failed_files": 0,
      "progressPercent": 60
    },
    "files": [
      {
        "id": "file-1",
        "filename": "menu1.pdf",
        "status": "completed",
        "progress": 100,
        "result": "{...}"
      },
      {
        "id": "file-2",
        "filename": "menu2.pdf",
        "status": "processing",
        "progress": 45
      }
    ],
    "summary": {
      "total": 5,
      "completed": 2,
      "processing": 1,
      "pending": 2,
      "failed": 0
    }
  }
}
```

## Frontend Integration

### React Hook Example

```typescript
import { useState, useEffect } from "react";

export function useBatchStatus(batchId: string) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/batch/jobs/${batchId}`);
      const data = await res.json();
      setStatus(data.data);

      // Stop polling if completed or failed
      if (["completed", "failed"].includes(data.data.batch.status)) {
        clearInterval(interval);
      }
    }, 2000);  // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [batchId]);

  return status;
}
```

### Progress UI

```tsx
function BatchProgress({ batchId }: { batchId: string }) {
  const status = useBatchStatus(batchId);

  if (!status) return <div>Loading...</div>;

  const { batch, files, summary } = status;

  return (
    <div>
      <h2>Batch {batchId}</h2>
      <progress value={batch.progressPercent} max={100} />
      <p>{batch.progressPercent}% Complete</p>

      <ul>
        {files.map(file => (
          <li key={file.id}>
            {file.filename} - {file.status}
            {file.error && <span>Error: {file.error}</span>}
          </li>
        ))}
      </ul>

      <p>
        {summary.completed} completed,
        {summary.processing} processing,
        {summary.pending} pending,
        {summary.failed} failed
      </p>
    </div>
  );
}
```

## Queue Processing

### How It Works

1. **Upload** → Files saved to `batch_files` table with status "pending"
2. **Queue Manager** → Polls every 5 seconds for pending files
3. **Process** → Takes up to 3 files, processes concurrently
4. **Update** → Updates status, progress, result in real-time
5. **Retry** → Auto-retries failures up to 3 times
6. **Complete** → Marks batch as completed when all files done

### Queue Manager

Auto-starts on server boot:

```typescript
// src/features/batch-processing/queue-manager.ts
class QueueManager {
  start() {
    this.processingInterval = setInterval(() => {
      this.processQueue().catch(console.error);
    }, 5000);  // Check every 5 seconds
  }

  private async processQueue() {
    const availableSlots = BATCH_CONFIG.CONCURRENT_JOBS - this.activeJobs.size;
    const pendingFiles = getPendingBatchFiles(availableSlots);

    for (const file of pendingFiles) {
      this.processFile(file);  // Fire and forget
    }
  }
}

queueManager.start();  // Auto-start
```

### Priority Queue

High priority files processed first:

```sql
SELECT * FROM batch_files
WHERE status = 'pending'
ORDER BY
  CASE priority
    WHEN 'high' THEN 1
    WHEN 'normal' THEN 2
    WHEN 'low' THEN 3
  END,
  created_at ASC
LIMIT ?
```

## Testing

### Test Upload

```bash
curl -X POST http://localhost:3000/api/batch/upload \
  -F "file=@menu1.pdf" \
  -F "file=@menu2.pdf" \
  -F "priority=high"
```

### Test Status Check

```bash
# Get batch ID from upload response
BATCH_ID="550e8400-e29b-41d4-a716-446655440000"

curl "http://localhost:3000/api/batch/jobs/$BATCH_ID"
```

### Test Queue Processing

```bash
# Upload files
BATCH_ID=$(curl -X POST http://localhost:3000/api/batch/upload \
  -F "file=@test1.pdf" -F "file=@test2.pdf" | jq -r '.data.batchId')

# Watch progress
watch -n 2 "curl -s http://localhost:3000/api/batch/jobs/$BATCH_ID | jq '.data.batch.progressPercent'"
```

## Error Handling

### Retry Logic

Files auto-retry on failure:

```typescript
async processFile(file: BatchFileRecord) {
  try {
    const result = await analyzeFile(file);
    updateBatchFile(file.id, {
      status: "completed",
      progress: 100,
      result: JSON.stringify(result),
    });
  } catch (error) {
    if (file.retry_count < BATCH_CONFIG.MAX_RETRIES) {
      // Retry
      updateBatchFile(file.id, {
        retry_count: file.retry_count + 1,
        status: "pending",  // Back to queue
      });
    } else {
      // Failed permanently
      updateBatchFile(file.id, {
        status: "failed",
        error: error.message,
      });
    }
  }
}
```

### Timeout Handling

Files time out after 30 minutes:

```typescript
if (Date.now() - startTime > BATCH_CONFIG.PROCESSING_TIMEOUT) {
  updateBatchFile(file.id, {
    status: "failed",
    error: "Processing timeout exceeded",
  });
}
```

## Monitoring

### Check Queue Status

```bash
# Active jobs
sqlite3 procheff.db "SELECT COUNT(*) FROM batch_files WHERE status='processing';"

# Pending jobs
sqlite3 procheff.db "SELECT COUNT(*) FROM batch_files WHERE status='pending';"

# Failed jobs
sqlite3 procheff.db "SELECT COUNT(*) FROM batch_files WHERE status='failed';"
```

### View Recent Batches

```bash
sqlite3 procheff.db "
  SELECT id, status, total_files, processed_files, failed_files, created_at
  FROM batch_jobs
  ORDER BY created_at DESC
  LIMIT 10;
"
```

## Best Practices

1. **Set priority** - Use "high" for user-initiated uploads
2. **Poll for status** - Check every 2-5 seconds
3. **Handle failures** - Show error messages to users
4. **Validate files** - Check type/size before upload
5. **Cleanup old jobs** - Periodically delete completed jobs

## Troubleshooting

### Files stuck in pending

1. Check queue manager is running:
   ```bash
   # Should see logs: [Queue] Processing 3 files...
   ```

2. Check for errors in logs:
   ```bash
   npm run dev 2>&1 | grep Queue
   ```

3. Manually process file:
   ```sql
   UPDATE batch_files SET status='pending', retry_count=0 WHERE id='file-123';
   ```

### Processing too slow

1. Increase concurrent jobs:
   ```typescript
   CONCURRENT_JOBS: 5,  // From 3
   ```

2. Reduce polling interval:
   ```typescript
   setInterval(processQueue, 2000);  // From 5000
   ```

### High failure rate

1. Check retry count:
   ```sql
   SELECT AVG(retry_count) FROM batch_files WHERE status='failed';
   ```

2. Increase max retries:
   ```typescript
   MAX_RETRIES: 5,  // From 3
   ```

3. Increase timeout:
   ```typescript
   PROCESSING_TIMEOUT: 3600000,  // 1 hour
   ```

## Performance

### Throughput

With 3 concurrent jobs:
- 5 seconds per file → 36 files/minute
- 10 seconds per file → 18 files/minute
- 30 seconds per file → 6 files/minute

### Scaling

To increase throughput:
1. Increase `CONCURRENT_JOBS` (limited by CPU/memory)
2. Add more servers (share SQLite database)
3. Migrate to Redis queue for distributed processing

## Security

- Rate limited: 3 uploads per hour per user
- File type validation (PDF, Excel, CSV only)
- Max file size: 50MB
- Max files per batch: 50
- User authentication required (add middleware)

## Related

- [Rate Limiting](./RATE-LIMITING.md) - Upload endpoint is rate limited
- [Caching](./CACHING.md) - Can cache batch results
- [Architecture](./ARCHITECTURE.md) - System design
