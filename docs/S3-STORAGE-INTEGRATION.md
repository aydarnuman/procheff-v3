# S3 Object Storage Integration Plan

**Version**: 1.0  
**Date**: 2025-11-12  
**Purpose**: Replace local file storage with cloud object storage for scalability

## Current State

### Local File Storage Issues

**Current Implementation**:
- Files uploaded via formidable → saved to `/tmp` or `/uploads`
- Files processed in memory
- No persistent storage strategy
- No CDN integration

**Problems**:
1. **No Persistence**: Files lost on server restart
2. **Disk Space**: Limited by server disk
3. **Scaling**: Can't share files across multiple servers
4. **Bandwidth**: Server bandwidth for file downloads
5. **Cost**: Server storage more expensive than object storage

## Solution: S3-Compatible Object Storage

### Why S3?

**Benefits**:
- Scalable (unlimited storage)
- Durable (99.999999999% durability)
- Cost-effective ($0.023/GB/month)
- CDN integration
- Global availability
- Multi-server compatible

### Provider Options

| Provider | Free Tier | Paid (25GB) | CDN | Notes |
|----------|-----------|-------------|-----|-------|
| **AWS S3** | 5GB for 12mo | ~$0.58/mo | CloudFront | Industry standard |
| **Cloudflare R2** | 10GB forever | $0.36/mo | Free CDN | Zero egress fees |
| **DigitalOcean Spaces** | None | $5/mo (250GB) | Included | Simple pricing |
| **Backblaze B2** | 10GB forever | $1.50/mo | Free | Cheapest |

**Recommendation**: **Cloudflare R2**
- Free egress (saves 90% costs)
- Built-in CDN
- S3-compatible API
- Better pricing than AWS

## Implementation Plan

### Phase 1: SDK Setup & Configuration

**Install AWS SDK** (works with R2):
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Environment Variables**:
```bash
# .env.local
S3_ENDPOINT="https://your-account.r2.cloudflarestorage.com"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET_NAME="procheff-uploads"
S3_REGION="auto" # For R2
S3_PUBLIC_URL="https://files.procheff.com" # CDN URL
```

**S3 Client** (`src/lib/storage/s3-client.ts`):
```typescript
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command 
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

class S3StorageClient {
  private client: S3Client;
  private bucket: string;
  
  constructor() {
    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'auto',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
    
    this.bucket = process.env.S3_BUCKET_NAME!;
  }
  
  /**
   * Upload file to S3
   */
  async upload(
    key: string, 
    buffer: Buffer, 
    metadata?: Record<string, string>
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: metadata?.contentType || 'application/octet-stream',
      Metadata: metadata,
    });
    
    await this.client.send(command);
    
    return this.getPublicUrl(key);
  }
  
  /**
   * Generate presigned download URL (expires in 1 hour)
   */
  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    
    return await getSignedUrl(this.client, command, { expiresIn });
  }
  
  /**
   * Generate presigned upload URL (for client-side uploads)
   */
  async getSignedUploadUrl(
    key: string, 
    expiresIn = 3600
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    
    return await getSignedUrl(this.client, command, { expiresIn });
  }
  
  /**
   * Delete file from S3
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    
    await this.client.send(command);
  }
  
  /**
   * Get public URL (if bucket is public or CDN is configured)
   */
  getPublicUrl(key: string): string {
    if (process.env.S3_PUBLIC_URL) {
      return `${process.env.S3_PUBLIC_URL}/${key}`;
    }
    return `${process.env.S3_ENDPOINT}/${this.bucket}/${key}`;
  }
  
  /**
   * List files with prefix
   */
  async list(prefix: string): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
    });
    
    const response = await this.client.send(command);
    return response.Contents?.map(obj => obj.Key!).filter(Boolean) || [];
  }
}

export const s3Client = new S3StorageClient();
```

### Phase 2: Upload API Integration

**Modified Upload Handler** (`src/app/api/ihale/upload/route.ts`):

```typescript
import { s3Client } from '@/lib/storage/s3-client';
import { nanoid } from 'nanoid';
import path from 'path';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  
  // Read file buffer
  const buffer = Buffer.from(await file.arrayBuffer());
  
  // Generate unique file key
  const fileId = nanoid();
  const extension = path.extname(file.name);
  const key = `uploads/${new Date().toISOString().slice(0, 7)}/${fileId}${extension}`;
  
  // Upload to S3
  const url = await s3Client.upload(key, buffer, {
    contentType: file.type,
    originalName: file.name,
    uploadedBy: 'user-id', // From auth session
    uploadedAt: new Date().toISOString(),
  });
  
  // Save metadata to database
  await db.prepare(`
    INSERT INTO uploaded_files (id, key, url, filename, size, mime_type, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(fileId, key, url, file.name, file.size, file.type, 'user-id');
  
  return NextResponse.json({
    success: true,
    data: {
      id: fileId,
      url,
      filename: file.name,
      size: file.size,
    }
  });
}
```

### Phase 3: Database Schema for File Tracking

**Migration** (`src/lib/db/migrations/005_add_file_storage.sql`):

```sql
-- File storage tracking
CREATE TABLE IF NOT EXISTS uploaded_files (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  user_id TEXT,
  metadata TEXT, -- JSON metadata
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  accessed_at TEXT,
  expires_at TEXT -- Optional: for temporary files
);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_user 
ON uploaded_files(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_expires 
ON uploaded_files(expires_at);

-- Audit log for file operations
CREATE TABLE IF NOT EXISTS file_operations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id TEXT NOT NULL,
  operation TEXT NOT NULL, -- upload, download, delete
  user_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_file_operations_file 
ON file_operations(file_id, created_at DESC);
```

### Phase 4: Client-Side Direct Upload

**For Large Files**: Use presigned URLs for direct browser → S3 upload

**API Endpoint** (`src/app/api/storage/presigned-url/route.ts`):
```typescript
export async function POST(request: Request) {
  const { filename, contentType } = await request.json();
  
  // Validate user permission
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Generate unique key
  const fileId = nanoid();
  const key = `uploads/${session.user.id}/${fileId}-${filename}`;
  
  // Get presigned upload URL
  const uploadUrl = await s3Client.getSignedUploadUrl(key, 3600);
  
  return NextResponse.json({
    uploadUrl,
    fileId,
    key,
  });
}
```

**Client Component** (`src/components/upload/DirectUpload.tsx`):
```typescript
'use client';

import { useState } from 'react';

export function DirectUpload() {
  const [uploading, setUploading] = useState(false);
  
  async function handleUpload(file: File) {
    setUploading(true);
    
    try {
      // 1. Get presigned URL
      const response = await fetch('/api/storage/presigned-url', {
        method: 'POST',
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });
      
      const { uploadUrl, fileId } = await response.json();
      
      // 2. Upload directly to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
      
      // 3. Notify backend of completion
      await fetch('/api/storage/upload-complete', {
        method: 'POST',
        body: JSON.stringify({ fileId }),
      });
      
      alert('Upload successful!');
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  }
  
  return (
    <input
      type="file"
      onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
      disabled={uploading}
    />
  );
}
```

### Phase 5: File Cleanup & Lifecycle

**Automatic Cleanup Script** (`scripts/cleanup-expired-files.ts`):
```typescript
import { s3Client } from '@/lib/storage/s3-client';
import { getDB } from '@/lib/db/sqlite-client';

async function cleanupExpiredFiles() {
  const db = getDB();
  
  // Find expired files
  const expiredFiles = db.prepare(`
    SELECT id, key FROM uploaded_files
    WHERE expires_at IS NOT NULL 
      AND expires_at < datetime('now')
  `).all();
  
  console.log(`Found ${expiredFiles.length} expired files`);
  
  for (const file of expiredFiles) {
    try {
      // Delete from S3
      await s3Client.delete(file.key);
      
      // Delete from database
      db.prepare('DELETE FROM uploaded_files WHERE id = ?').run(file.id);
      
      console.log(`✅ Deleted: ${file.key}`);
    } catch (error) {
      console.error(`❌ Failed to delete ${file.key}:`, error);
    }
  }
}

// Run if called directly
if (require.main === module) {
  cleanupExpiredFiles().then(() => {
    console.log('Cleanup completed');
    process.exit(0);
  });
}
```

**Cron Job** (vercel.json):
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-files",
      "schedule": "0 2 * * *"
    }
  ]
}
```

## Migration from Local Storage

### Step 1: Identify Existing Files

```typescript
import fs from 'fs';
import path from 'path';

async function migrateLocalFiles() {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('No local files to migrate');
    return;
  }
  
  const files = fs.readdirSync(uploadsDir);
  
  for (const filename of files) {
    const filePath = path.join(uploadsDir, filename);
    const buffer = fs.readFileSync(filePath);
    
    // Upload to S3
    const key = `migrated/${filename}`;
    const url = await s3Client.upload(key, buffer);
    
    console.log(`✅ Migrated: ${filename} → ${url}`);
  }
}
```

## Cost Estimation

### Cloudflare R2 Pricing

**Storage**: $0.015/GB/month
- 25GB = $0.375/month
- 100GB = $1.50/month
- 500GB = $7.50/month

**Operations** (Class A - writes):
- $4.50 per million requests
- 10k uploads/month = $0.045

**Egress**: **FREE** (R2's killer feature)

**Total Monthly Cost** (estimated):
- 50GB storage: $0.75
- 20k uploads: $0.09
- Unlimited downloads: $0
- **Total: ~$1/month**

Compare to AWS S3:
- Same storage: $1.15
- Same uploads: $0.09
- Downloads (100GB): $9.00
- **Total: ~$10/month**

## Security Considerations

### Access Control

**Bucket Policy**:
- Private by default
- Access only via presigned URLs
- No public listing

**File Validation**:
```typescript
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'application/vnd.ms-excel',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function validateFile(file: File) {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large');
  }
}
```

**Virus Scanning** (optional):
- Use ClamAV or VirusTotal API
- Scan before upload to S3

### Data Encryption

**At Rest**: S3 server-side encryption (SSE-S3)
**In Transit**: HTTPS/TLS

## Monitoring & Alerts

**Metrics to Track**:
- Upload success rate
- Average upload time
- Storage used
- Download bandwidth
- Failed operations

**Alerts**:
- Storage > 80% quota
- Upload failures > 5%
- Unusual download patterns

## Rollback Plan

**Feature Flag**:
```typescript
const USE_S3_STORAGE = process.env.ENABLE_S3_STORAGE === 'true';

if (USE_S3_STORAGE) {
  await s3Client.upload(key, buffer);
} else {
  fs.writeFileSync(localPath, buffer);
}
```

**Emergency Rollback**:
1. Set `ENABLE_S3_STORAGE=false`
2. Restart application
3. Files fall back to local storage

## Next Steps

**Immediate**:
1. ✅ Create Cloudflare R2 bucket
2. ⏳ Set up access keys
3. ⏳ Install SDK dependencies
4. ⏳ Test upload/download

**Short-term**:
1. Implement S3 client
2. Update upload endpoints
3. Add file tracking database
4. Test in staging

**Long-term**:
1. Migrate existing files
2. Set up CDN
3. Implement lifecycle policies
4. Monitor costs

---

**Last Updated**: 2025-11-12  
**Status**: Ready for Implementation






