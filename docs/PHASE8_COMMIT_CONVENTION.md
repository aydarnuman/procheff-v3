# Phase 8 Commit Message Convention

## Format

```
<type>(phase8): <short description>

[optional body]

[optional footer]
```

## Types

- **feat**: Yeni özellik
- **fix**: Bug düzeltmesi
- **refactor**: Kod yapısı değişikliği (davranış değişmez)
- **style**: Görsel değişiklik (CSS, Tailwind)
- **docs**: Dokümantasyon güncellemesi
- **test**: Test ekleme/düzenleme
- **chore**: Build, dependency güncellemeleri

## Examples

### Feature Addition

```
feat(phase8): add batch upload page with drag & drop

- Implemented BatchUploadZone component
- Added file type validation
- Priority selector integration
- Max 50 files per batch
```

### Component Creation

```
feat(phase8): create BatchProgressTracker component

Real-time progress tracking for batch jobs with:
- Linear progress bar
- File-by-file status badges
- Success/failed/pending counters
- ETA calculation
```

### Page Implementation

```
feat(phase8): implement settings profile page

User profile management page with:
- Avatar upload (base64)
- Name, Email, Phone fields
- Password change form
- 2FA toggle
- Active sessions table
```

### Bug Fix

```
fix(phase8): correct batch upload file size validation

Fixed file size check to use bytes instead of MB
- Max file size: 10MB per file
- Total batch size: 500MB
```

### Refactoring

```
refactor(phase8): extract settings form logic to hook

Created useSettingsForm hook for reusable form handling:
- Validation with Zod
- Auto-save on blur
- Reset functionality
```

### Styling

```
style(phase8): update batch upload card glassmorphism

- Changed glass-card opacity
- Added hover effects
- Mobile responsive adjustments
```

### Documentation

```
docs(phase8): update progress report for sprint 1

Added completed tasks:
- Batch upload page
- Settings profile page
- 5 screenshots attached
```

## Sprint-Specific Examples

### Sprint 1

```
feat(phase8): [Sprint 1] add batch processing UI module

Complete batch processing interface:
- Upload page with drag & drop
- Job list table
- Job detail page with retry
- Real-time SSE progress
```

### Sprint 2

```
feat(phase8): [Sprint 2] implement rate limiting dashboard

Monitoring dashboard enhancements:
- RateLimitCard component
- CacheMetricsCard component
- RedisHealthIndicator
- Settings/performance page
```

### Sprint 3

```
feat(phase8): [Sprint 3] add report template selector

Report export improvements:
- Template picker (Modern/Classic/Minimalist)
- Preview modal with PDF.js
- Save/load custom templates
```

## Component-Specific

### Batch Components

```
feat(phase8): create BatchJobList component

Batch job list table with:
- Status badges
- Filter & sort
- Pagination
- Real-time updates (5s polling)
```

### Settings Components

```
feat(phase8): implement SettingsCard wrapper

Reusable settings card component:
- Glass card styling
- Title + description props
- Save button with loading
- Reset to defaults
```

### Monitoring Components

```
feat(phase8): add CacheMetricsCard to monitoring

Cache performance metrics card:
- Hit rate gauge chart
- Hits/misses bar chart
- Cache size display
- Top 10 cached keys table
```

## Multi-File Commits

```
feat(phase8): complete settings sub-pages implementation

Implemented 4 settings pages:
- Profile (/settings/profile)
- Pipeline (/settings/pipeline)
- Database (/settings/database)
- Reports (/settings/reports)

All pages include:
- Form validation (Zod)
- Save/reset functionality
- Mobile responsive
- Loading states
```

## Breaking Changes

```
feat(phase8): migrate settings to new structure

BREAKING CHANGE: Settings routes restructured

Old:
- /settings → hub page
- No sub-pages

New:
- /settings → hub page (unchanged)
- /settings/profile → new
- /settings/pipeline → new
- /settings/database → new
- /settings/reports → new

Migration: No action needed, new routes only
```

## Co-authored Commits

```
feat(phase8): implement batch upload with SSE

Real-time progress tracking implementation

Co-authored-by: AI Copilot <copilot@github.com>
```

## Issue References

```
feat(phase8): add batch processing UI

Closes #12
Relates to #34

- Batch upload page
- Job list & detail
- SSE progress tracking
```

## Commit Checklist

Before committing:

- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] Manual testing done
- [ ] Screenshot taken (if UI change)
- [ ] Progress report updated (if task complete)

## Daily Commit Pattern

### Morning

```
feat(phase8): start BatchUploadZone implementation

WIP: Basic structure and props interface
```

### Evening

```
feat(phase8): complete BatchUploadZone component

Finished implementation with:
- Drag & drop functionality
- File preview list
- Upload progress bars
- Error handling UI
```

## Sprint Completion Commits

```
feat(phase8): complete sprint 1 tasks

Sprint 1 deliverables:
- ✅ Batch Processing UI (7/7 tasks)
- ✅ Settings Sub-Pages (4/4 pages)
- 📸 12 screenshots attached
- 📊 Progress report updated

See: docs/PROGRESS_REPORT.md
```

---

## Quick Reference

| Scope        | Example                                         |
| ------------ | ----------------------------------------------- |
| Batch module | `feat(phase8): add batch upload page`           |
| Settings     | `feat(phase8): implement settings profile page` |
| Monitoring   | `feat(phase8): add rate limit card to monitor`  |
| Component    | `feat(phase8): create BatchProgressTracker`     |
| Bugfix       | `fix(phase8): correct batch job status update`  |
| Style        | `style(phase8): update glass card opacity`      |
| Docs         | `docs(phase8): update progress report`          |

---

**Always use `phase8` scope for sprint-related commits!**
