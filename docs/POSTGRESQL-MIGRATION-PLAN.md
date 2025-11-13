# PostgreSQL Migration Plan

**Version**: 1.0  
**Date**: 2025-11-12  
**Status**: Planning Phase

## Executive Summary

This document outlines the migration strategy from SQLite to PostgreSQL for production scalability.

**Why Migrate?**
- SQLite limitations: Single-writer, no horizontal scaling
- PostgreSQL benefits: ACID compliance, replication, advanced features
- Current SQLite works well for <10k req/day, PostgreSQL needed for scale

## Current State Analysis

### SQLite Database Structure

**Database File**: `procheff.db` (~50MB estimated in production)

**Tables** (15+ tables):
- `logs` - AI operation logs
- `users` - User accounts
- `organizations` - Multi-org support
- `memberships` - User-org relationships
- `notifications` - Alert system
- `orchestrations` - Pipeline state
- `semantic_cache` - AI response cache
- `analysis_results` - Analysis history
- `analysis_history` - Storage paths
- `market_prices` - Market data
- `tenders` - Tender information
- `api_metrics` - Performance tracking
- And more...

### Current Schema Management

**Migration System**: Custom SQL files in `src/lib/db/migrations/`
- `add-analysis-tables.sql`
- `add-storage-progress.sql`
- `003_analysis_repository.sql`
- `004_add_missing_indexes.sql`

**Schema Initialization**: Multiple init functions
- `initAuthSchema()` - Auth tables
- `initSemanticCache()` - Cache tables
- `initMarketSchema()` - Market data
- `initTendersSchema()` - Tender data

## Migration Strategy

### Phase 1: Schema Design & Prisma Setup (Week 1)

**Goal**: Define PostgreSQL schema with Prisma ORM

**Tasks**:

1. **Install Prisma**
   ```bash
   npm install -D prisma
   npm install @prisma/client
   ```

2. **Initialize Prisma**
   ```bash
   npx prisma init
   ```

3. **Define Schema** (`prisma/schema.prisma`)
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   
   generator client {
     provider = "prisma-client-js"
   }
   
   model User {
     id           String   @id @default(cuid())
     email        String   @unique
     name         String?
     passwordHash String   @map("password_hash")
     createdAt    DateTime @default(now()) @map("created_at")
     
     memberships  Membership[]
     
     @@map("users")
   }
   
   model Organization {
     id          String   @id @default(cuid())
     name        String
     ownerUserId String   @map("owner_user_id")
     createdAt   DateTime @default(now()) @map("created_at")
     
     memberships Membership[]
     
     @@map("organizations")
   }
   
   model Membership {
     id     String @id @default(cuid())
     orgId  String @map("org_id")
     userId String @map("user_id")
     role   String
     
     organization Organization @relation(fields: [orgId], references: [id])
     user         User         @relation(fields: [userId], references: [id])
     
     @@unique([orgId, userId])
     @@map("memberships")
   }
   
   // Additional models for other tables...
   ```

4. **Map All Existing Tables**
   - Convert each SQLite table to Prisma model
   - Preserve column names and relationships
   - Add proper indexes
   - Define foreign keys

**Deliverables**:
- `prisma/schema.prisma` - Complete schema definition
- `prisma/seed.ts` - Seed script for test data
- `docs/PRISMA-SCHEMA.md` - Schema documentation

### Phase 2: Dual-Write Implementation (Week 2)

**Goal**: Write to both SQLite and PostgreSQL simultaneously

**Architecture**:
```
┌─────────────┐
│  API Route  │
└──────┬──────┘
       │
       ├──────────┬──────────┐
       ▼          ▼          ▼
  ┌────────┐ ┌────────┐ ┌────────┐
  │ SQLite │ │Postgres│ │ Logger │
  └────────┘ └────────┘ └────────┘
```

**Implementation Strategy**:

1. **Create Database Abstraction Layer**
   ```typescript
   // src/lib/db/database-client.ts
   export interface DatabaseClient {
     prepare(sql: string): Statement;
     exec(sql: string): void;
   }
   
   export class DualWriteClient implements DatabaseClient {
     private sqlite: Database;
     private prisma: PrismaClient;
     
     async prepare(sql: string) {
       // Write to both databases
       const sqliteStmt = this.sqlite.prepare(sql);
       await this.prisma.$executeRaw`${sql}`;
       return sqliteStmt;
     }
   }
   ```

2. **Feature Flag for Migration**
   ```typescript
   // src/features/config.ts
   export const FEATURE_FLAGS = {
     POSTGRESQL_DUAL_WRITE: process.env.ENABLE_POSTGRESQL_DUAL_WRITE === "true",
     POSTGRESQL_READ: process.env.ENABLE_POSTGRESQL_READ === "true",
   };
   ```

3. **Gradual Rollout**
   - Start with non-critical tables (logs, cache)
   - Monitor consistency
   - Move to critical tables (users, auth)

**Monitoring**:
- Log write latencies
- Compare record counts
- Alert on sync failures

**Deliverables**:
- Dual-write implementation
- Consistency checker script
- Rollback procedures

### Phase 3: Data Migration (Week 3)

**Goal**: Copy all existing SQLite data to PostgreSQL

**Migration Script** (`scripts/migrate-to-postgres.ts`):

```typescript
import { PrismaClient } from '@prisma/client';
import { getDB } from '@/lib/db/sqlite-client';

async function migrateData() {
  const sqlite = getDB();
  const prisma = new PrismaClient();
  
  console.log('Starting migration...');
  
  try {
    // 1. Migrate users
    const users = sqlite.prepare('SELECT * FROM users').all();
    for (const user of users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          email: user.email,
          name: user.name,
          passwordHash: user.password_hash,
          createdAt: new Date(user.created_at),
        },
      });
    }
    console.log(`✅ Migrated ${users.length} users`);
    
    // 2. Migrate organizations
    const orgs = sqlite.prepare('SELECT * FROM organizations').all();
    for (const org of orgs) {
      await prisma.organization.upsert({
        where: { id: org.id },
        update: {},
        create: {
          id: org.id,
          name: org.name,
          ownerUserId: org.owner_user_id,
          createdAt: new Date(org.created_at),
        },
      });
    }
    console.log(`✅ Migrated ${orgs.length} organizations`);
    
    // 3. Migrate other tables...
    // (Repeat for each table)
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateData();
```

**Validation Script** (`scripts/validate-migration.ts`):

```typescript
async function validateMigration() {
  const sqlite = getDB();
  const prisma = new PrismaClient();
  
  const tables = ['users', 'organizations', 'memberships', 'logs'];
  
  for (const table of tables) {
    const sqliteCount = sqlite.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
    const postgresCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM ${table}
    `;
    
    console.log(`${table}: SQLite=${sqliteCount.count}, Postgres=${postgresCount.count}`);
    
    if (sqliteCount.count !== postgresCount.count) {
      throw new Error(`Mismatch in ${table}`);
    }
  }
  
  console.log('✅ Validation passed');
}
```

**Deliverables**:
- Migration script
- Validation script
- Backup procedures
- Rollback plan

### Phase 4: Read Cutover (Week 4)

**Goal**: Switch reads to PostgreSQL while maintaining SQLite writes

**Implementation**:

```typescript
export class CutoverClient implements DatabaseClient {
  async query(sql: string) {
    if (FEATURE_FLAGS.POSTGRESQL_READ) {
      return await prisma.$queryRaw`${sql}`;
    } else {
      return sqlite.prepare(sql).all();
    }
  }
}
```

**Gradual Rollout**:
1. 10% of reads → PostgreSQL (monitor)
2. 50% of reads → PostgreSQL (24h monitoring)
3. 100% of reads → PostgreSQL

**Monitoring**:
- Query performance comparison
- Error rates
- User experience metrics

### Phase 5: Full Cutover (Week 5)

**Goal**: Complete migration, deprecate SQLite

**Tasks**:

1. **Switch All Writes to PostgreSQL**
   - Disable dual-write
   - Remove SQLite write code

2. **Update All Queries**
   ```typescript
   // Old: SQLite
   const users = db.prepare('SELECT * FROM users').all();
   
   // New: Prisma
   const users = await prisma.user.findMany();
   ```

3. **Remove SQLite Dependencies**
   ```bash
   npm uninstall better-sqlite3
   ```

4. **Archive SQLite Data**
   - Backup final `procheff.db`
   - Store securely
   - Document retention policy

**Deliverables**:
- Fully migrated codebase
- SQLite removed
- Documentation updated

## PostgreSQL Setup

### Development Environment

```bash
# Using Docker
docker run --name procheff-postgres \
  -e POSTGRES_DB=procheff \
  -e POSTGRES_USER=procheff \
  -e POSTGRES_PASSWORD=secure_password \
  -p 5432:5432 \
  -d postgres:16-alpine

# Connection string
DATABASE_URL="postgresql://procheff:secure_password@localhost:5432/procheff"
```

### Production Environment

**Recommended Providers**:

1. **DigitalOcean Managed PostgreSQL**
   - Cost: $15/month (1GB RAM, 10GB storage)
   - Automatic backups
   - High availability option

2. **Supabase**
   - Cost: Free tier (500MB, 1GB bandwidth)
   - Paid: $25/month (8GB, 50GB bandwidth)
   - Built-in auth, storage

3. **Vercel Postgres**
   - Cost: Free tier (256MB, 1 compute hour/day)
   - Paid: Starting $20/month
   - Integrated with Vercel deployments

### Configuration

**Environment Variables**:
```bash
# .env.local
DATABASE_URL="postgresql://user:password@host:5432/database"
DATABASE_POOL_SIZE=10
DATABASE_CONNECTION_TIMEOUT=10000
```

**Connection Pooling** (`src/lib/db/postgres-client.ts`):
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

## Risk Mitigation

### Risks & Mitigation Strategies

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during migration | HIGH | LOW | Full backup before migration, validation scripts |
| Downtime during cutover | MEDIUM | MEDIUM | Dual-write phase, gradual rollout |
| Performance degradation | MEDIUM | LOW | Load testing, query optimization |
| Schema incompatibilities | LOW | MEDIUM | Thorough testing in staging |
| Cost increase | LOW | HIGH | Start with small instance, scale as needed |

### Rollback Plan

**At Each Phase**:
1. Keep SQLite operational
2. Feature flags for quick switch
3. Database backups at every step

**Emergency Rollback**:
```bash
# Disable PostgreSQL
export ENABLE_POSTGRESQL_READ=false
export ENABLE_POSTGRESQL_DUAL_WRITE=false

# Restart application
pm2 restart procheff-v3
```

## Success Metrics

**Technical Metrics**:
- Query response time < 100ms (p95)
- Write latency < 50ms (p95)
- 99.9% uptime
- Zero data loss

**Business Metrics**:
- Support >100k req/day
- <$100/month database costs
- <1 hour migration downtime

## Timeline Summary

| Phase | Duration | Tasks | Risk Level |
|-------|----------|-------|------------|
| 1. Schema Design | 1 week | Prisma setup, schema definition | LOW |
| 2. Dual-Write | 1 week | Implement, test, monitor | MEDIUM |
| 3. Data Migration | 1 week | Migrate data, validate | HIGH |
| 4. Read Cutover | 1 week | Switch reads, monitor | MEDIUM |
| 5. Full Cutover | 1 week | Complete migration | LOW |

**Total Timeline**: 5 weeks (includes buffer time)

## Next Steps

**Immediate Actions** (Before Starting):
1. ✅ Document current schema
2. ✅ Set up staging PostgreSQL database
3. ✅ Create backup procedures
4. ⏳ Review with team
5. ⏳ Get stakeholder approval

**Phase 1 Start Checklist**:
- [ ] PostgreSQL instance provisioned
- [ ] Backup strategy defined
- [ ] Monitoring tools configured
- [ ] Team trained on Prisma
- [ ] Rollback procedures documented

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don't_Do_This)
- [Database Migration Guide](https://www.prisma.io/docs/guides/migrate-to-prisma)

---

**Last Updated**: 2025-11-12  
**Author**: Procheff Development Team  
**Review Date**: 2025-12-12






