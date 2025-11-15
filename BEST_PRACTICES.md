# 🎯 Best Practices Guide - Procheff-v3

**Last Updated:** November 15, 2025
**Applies To:** Post-PostgreSQL Migration (Phase 1+)

---

## 📋 Table of Contents

1. [Database Operations](#database-operations)
2. [Security Guidelines](#security-guidelines)
3. [Error Handling](#error-handling)
4. [API Development](#api-development)
5. [Performance](#performance)
6. [Testing](#testing)
7. [Code Style](#code-style)
8. [Git Workflow](#git-workflow)

---

## 🗄️ Database Operations

### ✅ Always Use Parameterized Queries

**❌ NEVER DO THIS:**
```typescript
// VULNERABLE TO SQL INJECTION!
const query = `SELECT * FROM users WHERE id = ${userId}`;
const query = `WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'`;
```

**✅ ALWAYS DO THIS:**
```typescript
// Safe with parameterized queries
const query = `SELECT * FROM users WHERE id = $1`;
const result = await db.queryOne(query, [userId]);

// For intervals, use make_interval function
const query = `
  WHERE created_at >= CURRENT_TIMESTAMP - make_interval(days => $1)
`;
const results = await db.query(query, [days]);
```

### ✅ Handle Async Database Calls Properly

**❌ WRONG:**
```typescript
const db = getDatabase(); // Missing await!
const result = db.queryOne(sql); // Missing await!
```

**✅ CORRECT:**
```typescript
const db = await getDatabase();
const result = await db.queryOne(sql, params);
```

### ✅ Always Check for Null/Undefined

**❌ UNSAFE:**
```typescript
const user = await db.queryOne(`SELECT * FROM users WHERE id = $1`, [id]) as User;
return user.email; // TypeError if user is undefined!
```

**✅ SAFE:**
```typescript
const user = await db.queryOne(`SELECT * FROM users WHERE id = $1`, [id]) as User | undefined;

if (!user) {
  throw new Error('User not found');
}

return user.email; // Safe!
```

### ✅ Use Transactions for Multi-Step Operations

```typescript
import { transaction } from '@/lib/db/universal-client';

try {
  await transaction(async (client) => {
    // All operations use the same client
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
    await client.query('INSERT INTO transactions (from_id, to_id, amount) VALUES ($1, $2, $3)', [fromId, toId, amount]);

    // Automatically commits if no errors
  });
} catch (error) {
  // Automatically rolls back on error
  console.error('Transaction failed:', error);
  throw error;
}
```

---

## 🔒 Security Guidelines

### ✅ Input Validation

**Always validate user input with Zod:**

```typescript
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100)
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = CreateUserSchema.parse(body);

    // Use validated data
    const user = await createUser(validatedData);

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    throw error;
  }
}
```

### ✅ Whitelist Approach for Dynamic Values

```typescript
// GOOD: Whitelist allowed values
const ALLOWED_TABLES = ['users', 'logs', 'notifications'];

if (!ALLOWED_TABLES.includes(tableName)) {
  throw new Error('Invalid table name');
}

const result = await db.queryOne(`SELECT COUNT(*) FROM ${tableName}`);
```

### ✅ Never Expose Sensitive Data

**❌ BAD:**
```typescript
return NextResponse.json({
  error: error.message, // Might contain database paths, queries, etc.
  stack: error.stack     // NEVER expose in production!
});
```

**✅ GOOD:**
```typescript
// Generic error message for users
const userMessage = process.env.NODE_ENV === 'production'
  ? 'An error occurred'
  : error.message;

// Log full error for debugging
AILogger.error('Request failed', {
  error: error.message,
  stack: error.stack,
  userId: session?.user?.id
});

return NextResponse.json(
  { error: userMessage },
  { status: 500 }
);
```

### ✅ SSL/TLS Configuration

```typescript
// Production: ALWAYS validate certificates
ssl: {
  rejectUnauthorized: process.env.DISABLE_SSL_VERIFICATION !== 'true',
  require: true
}

// Development: Can disable for self-signed certs
// DISABLE_SSL_VERIFICATION=true (only in .env.local)
```

---

## 🛡️ Error Handling

### ✅ Comprehensive Try-Catch

```typescript
export async function GET(request: Request) {
  try {
    const db = await getDatabase();
    const results = await db.query('SELECT * FROM items');

    return NextResponse.json({ results });
  } catch (error) {
    // Log error details
    AILogger.error('Failed to fetch items', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: request.url
    });

    // Return user-friendly error
    return NextResponse.json(
      { error: 'Failed to load items' },
      { status: 500 }
    );
  }
}
```

### ✅ Use AILogger Instead of console

**❌ DON'T:**
```typescript
console.log('User logged in:', userId);
console.error('Database error:', error);
```

**✅ DO:**
```typescript
import { AILogger } from '@/lib/ai/logger';

AILogger.info('User logged in', { userId });
AILogger.error('Database error', { error: error.message });
```

**Benefits:**
- Centralized logging
- Structured data
- Metrics dashboard
- Easy debugging

---

## 🚀 API Development

### ✅ Consistent Response Format

```typescript
// Success response
return NextResponse.json({
  success: true,
  data: results,
  timestamp: new Date().toISOString()
});

// Error response
return NextResponse.json({
  success: false,
  error: 'Validation failed',
  details: validationErrors
}, { status: 400 });
```

### ✅ Proper Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET/PATCH/DELETE |
| 201 | Created | Successful POST (created resource) |
| 400 | Bad Request | Invalid input from client |
| 401 | Unauthorized | Missing/invalid auth token |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 422 | Unprocessable | Valid syntax but semantic errors |
| 500 | Server Error | Unexpected server error |

### ✅ Pagination for Large Datasets

```typescript
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const limit = Math.min(
    parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT)),
    MAX_LIMIT
  );
  const offset = parseInt(searchParams.get('offset') || '0');

  const results = await db.query(`
    SELECT * FROM items
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);

  const total = await db.queryOne(`SELECT COUNT(*) as count FROM items`) as { count: number } | undefined;

  return NextResponse.json({
    results,
    pagination: {
      limit,
      offset,
      total: total?.count || 0,
      hasMore: (offset + limit) < (total?.count || 0)
    }
  });
}
```

---

## ⚡ Performance

### ✅ Use Promise.all for Parallel Operations

**❌ SLOW (Sequential):**
```typescript
const users = await db.query('SELECT * FROM users');
const posts = await db.query('SELECT * FROM posts');
const comments = await db.query('SELECT * FROM comments');
```

**✅ FAST (Parallel):**
```typescript
const [users, posts, comments] = await Promise.all([
  db.query('SELECT * FROM users'),
  db.query('SELECT * FROM posts'),
  db.query('SELECT * FROM comments')
]);
```

### ✅ Avoid N+1 Queries

**❌ N+1 PROBLEM:**
```typescript
const users = await db.query('SELECT * FROM users');

for (const user of users) {
  const posts = await db.query('SELECT * FROM posts WHERE user_id = $1', [user.id]);
  user.posts = posts; // N queries!
}
```

**✅ SOLUTION (JOIN or IN):**
```typescript
const users = await db.query(`
  SELECT u.*, p.*
  FROM users u
  LEFT JOIN posts p ON p.user_id = u.id
`);

// Or use IN clause
const users = await db.query('SELECT * FROM users');
const userIds = users.map(u => u.id);
const posts = await db.query('SELECT * FROM posts WHERE user_id = ANY($1)', [userIds]);
```

### ✅ Add Database Indexes

```sql
-- Index frequently queried columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_logs_created_at ON logs(created_at DESC);

-- Index foreign keys
CREATE INDEX idx_posts_user_id ON posts(user_id);

-- Composite indexes for common queries
CREATE INDEX idx_posts_user_status ON posts(user_id, status);

-- Full-text search
CREATE INDEX idx_products_name_gin ON products USING gin(to_tsvector('english', name));
```

---

## 🧪 Testing

### ✅ Write Tests for Critical Paths

**Priority Order:**
1. Authentication & Authorization
2. Payment/Financial Operations
3. Data Modification Operations
4. Public APIs
5. Utility Functions

### ✅ Test Structure (AAA Pattern)

```typescript
test('should create user with valid data', async () => {
  // Arrange
  const userData = {
    email: 'test@example.com',
    password: 'SecurePass123!',
    name: 'Test User'
  };

  // Act
  const result = await createUser(userData);

  // Assert
  expect(result.id).toBeDefined();
  expect(result.email).toBe(userData.email);
  expect(result.password).not.toBe(userData.password); // Should be hashed
});
```

### ✅ Test Edge Cases

```typescript
describe('Email validation', () => {
  test('should accept valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  test('should reject invalid emails', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
  });

  test('should handle null/undefined', () => {
    expect(validateEmail(null as any)).toBe(false);
    expect(validateEmail(undefined as any)).toBe(false);
  });
});
```

---

## 📝 Code Style

### ✅ TypeScript Strict Mode

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### ✅ Explicit Types

**❌ AVOID:**
```typescript
const data = await fetchData(); // What type is this?
function process(input) { } // Missing types
```

**✅ PREFER:**
```typescript
const data: UserData = await fetchData();

interface ProcessInput {
  id: string;
  value: number;
}

function process(input: ProcessInput): Promise<void> { }
```

### ✅ Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Variables | camelCase | `const userId = 123;` |
| Constants | UPPER_SNAKE_CASE | `const MAX_RETRIES = 3;` |
| Functions | camelCase | `function fetchUser() {}` |
| Classes | PascalCase | `class UserService {}` |
| Interfaces | PascalCase | `interface UserData {}` |
| Types | PascalCase | `type UserId = string;` |
| Files | kebab-case | `user-service.ts` |

---

## 🔄 Git Workflow

### ✅ Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**
```bash
feat(auth): add two-factor authentication

Implements TOTP-based 2FA for enhanced security.
Users can enable 2FA in account settings.

Closes #123

fix(api): prevent SQL injection in trust-score endpoint

Replaced template literal with parameterized query using make_interval().
Added input validation for days parameter.

Security: HIGH priority
```

### ✅ Branch Naming

```
<type>/<description>

Examples:
feat/user-authentication
fix/sql-injection-trust-score
refactor/database-layer
docs/api-documentation
```

---

## 📚 Additional Resources

- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

**Questions?** See `CLAUDE.md`, `CODE_QUALITY_REPORT.md`, or `TESTING_GUIDE.md`

**Last Updated:** 2025-11-15
