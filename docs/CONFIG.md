# Configuration Files Documentation

**Complete guide to configuration files in Procheff-v3**

**Last Updated**: 2025-01-12

---

## 📚 Table of Contents

- [Next.js Configuration](#nextjs-configuration)
- [TypeScript Configuration](#typescript-configuration)
- [Vitest Configuration](#vitest-configuration)
- [ESLint Configuration](#eslint-configuration)
- [Cursor Rules](#cursor-rules)

---

## Next.js Configuration

**File**: `next.config.ts`

### Key Settings

```typescript
{
  output: 'standalone',        // Docker/Cloud Run optimization
  compress: true,              // Gzip compression
  poweredByHeader: false,      // Security: hide Next.js header
  
  images: {
    remotePatterns: [...],     // Allowed image domains
    formats: ['image/avif', 'image/webp']  // Modern formats
  },
  
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'    // Large file uploads
    }
  },
  
  env: {
    NEXT_PUBLIC_APP_VERSION: '3.0.0'  // Exposed to client
  }
}
```

### Output Mode: `standalone`

Optimized for Docker/Cloud deployments:
- Smaller Docker images
- Faster cold starts
- Self-contained builds

### Image Optimization

- **Remote Patterns**: Configure allowed image domains
- **Formats**: AVIF and WebP for modern browsers
- **Optimization**: Automatic image optimization

### Server Actions

- **Body Size Limit**: 50MB for large file uploads
- Used for: Document uploads, batch processing

---

## TypeScript Configuration

**File**: `tsconfig.json`

### Key Settings

```json
{
  "compilerOptions": {
    "target": "ES2017",           // Modern JavaScript
    "strict": true,               // Strict type checking
    "moduleResolution": "bundler", // Next.js bundler
    "paths": {
      "@/*": ["./src/*"]          // Path aliases
    }
  }
}
```

### Path Aliases

Use `@/` prefix for imports:
```typescript
import { AILogger } from '@/lib/ai/logger';
import { DataPool } from '@/lib/document-processor/types';
```

### Strict Mode

Enabled for:
- Type safety
- Null checks
- Unused variable detection

---

## Vitest Configuration

**File**: `vitest.config.ts`

### Key Settings

```typescript
{
  test: {
    globals: true,              // Global test functions
    environment: 'node',        // Node.js environment
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',           // Coverage provider
      reporter: ['text', 'json', 'html']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
}
```

### Coverage

- **Provider**: V8 (fast, accurate)
- **Reporters**: Text, JSON, HTML
- **Exclusions**: node_modules, tests, config files

### Running Tests

```bash
npm test              # Single run
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

---

## ESLint Configuration

**File**: `eslint.config.mjs`

### Configuration

Uses Next.js ESLint config with custom rules.

### Running Linter

```bash
npm run lint
```

---

## Cursor Rules

**File**: `.clinerules`

### Purpose

Cursor IDE-specific rules and patterns for code generation.

### Key Patterns

- Import statements from `@/lib/analysis/`
- Component props patterns
- API route patterns
- Helper function templates

---

## Best Practices

### Configuration Changes

1. **Test locally** before committing
2. **Document changes** in CHANGELOG.md
3. **Update docs** if behavior changes
4. **Check compatibility** with dependencies

### Environment-Specific Configs

- **Development**: Optimized for fast iteration
- **Production**: Optimized for performance
- **Test**: Minimal configuration

---

**Last Updated**: 2025-01-12  
**Maintained By**: Procheff-v3 Development Team


