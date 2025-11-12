# 🛠️ ProCheff-v3 Implementation Guide

> **Oluşturulma:** 2025-01-12
> **Versiyon:** 1.0
> **Status:** Active Development Reference

---

## 📋 İçindekiler

1. [Hızlı Başlangıç](#hızlı-başlangıç)
2. [Development Workflow](#development-workflow)
3. [Code Patterns](#code-patterns)
4. [Testing Guidelines](#testing-guidelines)
5. [Deployment Checklist](#deployment-checklist)

---

## 🚀 Hızlı Başlangıç

### Environment Setup

```bash
# 1. Dependencies
npm install

# 2. Environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# 3. Database
npm run db:migrate

# 4. Development server
npm run dev
```

### Required API Keys

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
GOOGLE_API_KEY=AIzaSy...
GEMINI_API_KEY=AIzaSy...
```

---

## 🔄 Development Workflow

### 1. Feature Development

```typescript
// 1. Create feature branch
git checkout -b feature/new-feature

// 2. Implement following patterns
// - Create types in types.ts
// - Add API route if needed
// - Create UI component
// - Add to navigation

// 3. Test locally
npm run dev
npm run build

// 4. Commit with conventional commits
git commit -m "feat: add new feature"
```

### 2. AI Integration Pattern

```typescript
// 1. Use provider factory
import { AIProviderFactory } from '@/lib/ai/provider-factory';

const client = AIProviderFactory.getClaude();

// 2. Call with proper error handling
try {
  const result = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    messages: [{ role: 'user', content: prompt }],
  });
} catch (error) {
  AILogger.error('AI call failed', { error });
  // Handle error
}
```

### 3. Data Processing Pattern

```typescript
// 1. Extract data to DataPool
const dataPool = await extractToDataPool(document);

// 2. Process with analysis engine
const analysis = await performContextualAnalysis(dataPool);

// 3. Store results
await saveAnalysisResults(analysis);
```

---

## 📐 Code Patterns

### Component Structure

```typescript
'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { DataPool } from '@/lib/document-processor/types';

interface ComponentProps {
  dataPool: DataPool;
  searchTerm?: string;
}

export function ComponentName({ dataPool, searchTerm = '' }: ComponentProps) {
  const [loading, setLoading] = useState(false);
  
  const filteredData = useMemo(() => {
    // Filter logic
  }, [dataPool, searchTerm]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-card"
    >
      {/* Component content */}
    </motion.div>
  );
}
```

### API Route Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { AILogger } from '@/lib/ai/logger';
import { z } from 'zod';

const RequestSchema = z.object({
  // Schema definition
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = RequestSchema.parse(body);
    
    // Process request
    const result = await processRequest(data);
    
    AILogger.success('Request processed', { result });
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    AILogger.error('Request failed', { error });
    return NextResponse.json(
      { success: false, error: 'Request failed' },
      { status: 500 }
    );
  }
}
```

### Error Handling Pattern

```typescript
import { createErrorResponse, getErrorDetails } from '@/lib/utils/error-codes';

try {
  // Operation
} catch (error) {
  const errorCode = categorizeError(error);
  const errorDetails = getErrorDetails(errorCode);
  
  return NextResponse.json(
    createErrorResponse(errorCode, error.message),
    { status: errorDetails.httpStatus }
  );
}
```

---

## 🧪 Testing Guidelines

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from './module';

describe('Module Tests', () => {
  it('should handle valid input', () => {
    const result = functionToTest(validInput);
    expect(result).toBeDefined();
  });
});
```

### Integration Tests

```typescript
// Test API endpoints
const response = await fetch('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify(testData),
});

expect(response.status).toBe(200);
```

---

## 📦 Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] Build succeeds (`npm run build`)
- [ ] No linter errors
- [ ] API keys configured
- [ ] Documentation updated

### Production Deployment

```bash
# 1. Build
npm run build

# 2. Test production build
npm start

# 3. Deploy to Vercel
vercel --prod

# 4. Verify deployment
curl https://your-domain.com/api/health
```

---

## 🔍 Debugging Tips

### AI API Issues

```typescript
// Enable debug logging
process.env.AI_DEBUG = 'true';

// Check API key
console.log('API Key configured:', !!process.env.ANTHROPIC_API_KEY);

// Log request details
AILogger.info('AI request', { model, promptLength });
```

### Database Issues

```typescript
// Check database connection
import { db } from '@/lib/database';
const result = db.prepare('SELECT 1').get();
console.log('DB connected:', !!result);
```

---

## 📚 Additional Resources

- **System Analysis:** `docs/architecture/SYSTEM-ANALYSIS-2025-01-12.md`
- **Architecture Docs:** `docs/ARCHITECTURE.md`
- **Workflow Guide:** `docs/Claude-Cursor-Workflow.md`

---

*Bu guide aktif development sırasında referans olarak kullanılır.*

