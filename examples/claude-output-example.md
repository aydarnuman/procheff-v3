# 📝 Claude Çıktı Örneği

Bu dosya, Claude-Cursor workflow script'lerinin nasıl çalıştığını gösteren bir örnektir.

## 🎯 Görev: Notification System

Yeni bir notification sistemi ekle.

## 📋 Implementation Plan

1. Notification component oluştur
2. WebSocket bağlantısı kur  
3. Backend API endpoint ekle
4. Frontend'de notification center ekle

## 💻 Kod Örnekleri

### Component

```typescript
// src/components/NotificationCenter.tsx
'use client';

import { useState, useEffect } from 'react';

export function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  
  useEffect(() => {
    // WebSocket connection
  }, []);
  
  return <div>Notifications</div>;
}
```

### API Route

```12:45:src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ notifications: [] });
}
```

## 📝 Notlar

⚠️ Dikkat: WebSocket bağlantısı için rate limiting ekle
✅ Öneri: Zustand store kullan
❌ Hata: Mevcut sistemde notification yok
💡 İpucu: Mevcut SSE pattern'ini takip et
🔍 Not: Backend'de notification queue gerekli

## 🔗 Dependencies

- @/store/notificationStore
- @/lib/websocket/client
- @/lib/utils/rate-limiter

