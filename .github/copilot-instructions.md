# 🧠 Procheff-v3 Copilot & AI Assistant Instructions

## 🎯 Purpose

You are contributing to **Procheff-v3**, an AI-driven public procurement analysis and decision support system
built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS 4**, and **SQLite**.

The goal is to maintain strict code quality, architectural consistency, and measurable AI performance.

## 📊 Project Context

Procheff-v3 is an **AI-powered public procurement analysis platform** built with:

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **AI Model**: Claude Sonnet 4.5 (claude-sonnet-4-20250514)
- **OCR Model**: Gemini 2.0 Vision (Google Generative AI)
- **Database**: SQLite (better-sqlite3 ^11.10.0)
- **Cache/Queue**: Upstash Redis (rate limiting, caching)
- **Authentication**: NextAuth v5 (beta) - JWT strategy, multi-org support, RBAC
- **Notifications**: Real-time SSE notification system with SQLite storage
- **Styling**: Tailwind CSS 4 (Glassmorphism theme)
- **Animation**: Framer Motion 12
- **State Management**: Zustand ^5.0.8
- **Validation**: Zod ^4.1.12
- **Charts**: Recharts ^3.4.0
- **Export**: pdfkit ^0.17.2, exceljs ^4.4.0
- **File Processing**: formidable ^3.5.4, pdf-parse, mammoth, file-type
- **Deployment**: DigitalOcean (App Platform / Droplets), Docker

## 🧩 Architecture Summary

| Layer             | Path                         | Description                                                 |
| ----------------- | ---------------------------- | ----------------------------------------------------------- |
| **AI Layer**      | `src/lib/ai/`                | Claude integration, prompts, provider factory, utilities    |
| **OCR Layer**     | `Gemini 2.0 Vision`          | Google Generative AI for low-density PDF text extraction    |
| **Database**      | `src/lib/db/`                | SQLite client, schema, singleton setup                      |
| **Auth Layer**    | `src/lib/auth.ts`            | NextAuth v5 configuration, JWT strategy, session management |
| **Notifications** | `src/app/api/notifications/` | SSE-based real-time notification system                     |
| **API Routes**    | `src/app/api/`               | AI endpoints (analysis, cost, decision, parser, export)     |
| **Upload API**    | `src/app/api/ihale/upload/`  | Document upload with OCR + Claude analysis pipeline         |
| **Store**         | `src/store/`                 | Zustand global state management                             |
| **UI Components** | `src/components/`            | Reusable visual blocks, Tailwind-based                      |
| **Docs**          | `/docs`                      | Architecture & AI behavior documentation                    |

## Code Style & Patterns

### TypeScript

```typescript
// ✅ DO: Use explicit types
interface AnalysisRequest {
  kurum: string;
  ihale_turu: string;
  kisilik: number;
}

// ❌ DON'T: Use 'any'
function process(data: any) {}

// ✅ DO: Use 'unknown' if type is truly unknown
function process(data: unknown) {
  if (typeof data === "string") {
  }
}
```

### React Components

```typescript
// ✅ DO: Use function components with explicit props
interface Props {
  title: string;
  onSubmit: (data: FormData) => void;
}

export default function AnalysisForm({ title, onSubmit }: Props) {
  return <form>{/* ... */}</form>;
}

// ❌ DON'T: Use default props or FC wrapper
export const AnalysisForm: React.FC<Props> = (props) => {};
```

### API Routes

```typescript
// ✅ DO: Always validate with Zod
import { z } from "zod";

const RequestSchema = z.object({
  field: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = RequestSchema.parse(await req.json());
    // ...
  } catch (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
}

// ❌ DON'T: Skip validation
export async function POST(req: NextRequest) {
  const body = await req.json(); // Unsafe!
}
```

### AI Integration

```typescript
// ✅ DO: Use centralized provider and logging
import { AIProviderFactory } from "@/lib/ai/provider-factory";
import { AILogger } from "@/lib/ai/logger";
import { cleanClaudeJSON } from "@/lib/ai/utils";

const client = AIProviderFactory.getClaude();
AILogger.info("Starting analysis");

const result = await client.messages.create({
  model: process.env.ANTHROPIC_MODEL,
  temperature: 0.4,
  max_tokens: 8000,
  messages: [{ role: "user", content: prompt }],
});

const text = result.content?.[0]?.text || "";
const data = JSON.parse(cleanClaudeJSON(text));

// ❌ DON'T: Direct Anthropic calls without logging
const anthropic = new Anthropic({ apiKey: "..." });
```

### Database Access

```typescript
// ✅ DO: Use singleton pattern
import { getDB } from "@/lib/db/sqlite-client";

const db = getDB();
const stmt = db.prepare("SELECT * FROM logs WHERE id = ?");
const row = stmt.get(logId);

// ❌ DON'T: Create new instances
const db = new Database("procheff.db");
```

## Common Patterns

### Error Handling

```typescript
// ✅ DO: Structured error handling
try {
  await operation();
  AILogger.success("Operation completed");
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  AILogger.error("Operation failed", { error: message });
  return NextResponse.json({ error: message }, { status: 500 });
}
```

### Loading States

```typescript
// ✅ DO: Always show loading UI
const [loading, setLoading] = useState(false);

return (
  <button disabled={loading}>
    {loading ? <div className="animate-spin ...">Loading</div> : "Submit"}
  </button>
);
```

### Responsive Design

```typescript
// ✅ DO: Use Tailwind responsive utilities with glass theme
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div className="glass-card">
    <h3 className="h3">Card Title</h3>
  </div>
</div>

// ❌ DON'T: Hardcode breakpoints
<div style={{ width: window.innerWidth > 768 ? "50%" : "100%" }}>
```

## Prompts & AI

### Centralized Prompts

```typescript
// ✅ DO: Add to src/lib/ai/prompts.ts
export const NEW_FEATURE_PROMPT = `
SYSTEM INSTRUCTION:
You are an expert in X.
Your task is to Y.

Rules:
1. Return only JSON
2. No markdown formatting
3. Include all required fields

Expected JSON:
{
  "field1": "value",
  "field2": 123
}
`;

// ❌ DON'T: Inline prompts in route handlers
const prompt = "You are an expert..."; // Bad!
```

### JSON Cleaning

````typescript
// ✅ DO: Always clean AI responses
import { cleanClaudeJSON } from "@/lib/ai/utils";

const rawResponse = result.content?.[0]?.text || "";
const cleaned = cleanClaudeJSON(rawResponse); // Removes ```json blocks
const data = JSON.parse(cleaned);

// ❌ DON'T: Parse directly
const data = JSON.parse(result.content?.[0]?.text); // Fails with markdown!
````

## File Naming

```
✅ DO:
src/app/cost-analysis/page.tsx
src/lib/utils/report-builder.ts
src/components/ui/stat-card.tsx
src/types/analysis.types.ts

❌ DON'T:
src/app/CostAnalysis/Page.tsx
src/lib/utils/reportBuilder.ts
src/components/ui/StatCard.tsx
src/types/analysisTypes.ts
```

## Import Order

```typescript
// 1. React & Next.js
import { useState } from "react";
import { NextRequest, NextResponse } from "next/server";

// 2. Third-party libraries
import { z } from "zod";

// 3. Local modules (@ alias)
import { AILogger } from "@/lib/ai/logger";
import { Card } from "@/components/ui/card";

// 4. Types
import type { AnalysisData } from "@/types/analysis.types";

// 5. Styles (if any)
import "./styles.css";
```

## Database Tables

```sql
-- ✅ DO: snake_case, plural
CREATE TABLE analysis_logs (
  id INTEGER PRIMARY KEY,
  created_at TEXT,
  log_type TEXT
);

-- ❌ DON'T: camelCase or singular
CREATE TABLE analysisLog (
  id INTEGER PRIMARY KEY
);
```

## Environment Variables

```typescript
// ✅ DO: Validate on startup
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY not set");
}

// ✅ DO: Use in server components/API routes only
const apiKey = process.env.ANTHROPIC_API_KEY;

// ❌ DON'T: Use in client components
("use client");
const apiKey = process.env.ANTHROPIC_API_KEY; // Exposed to browser!
```

## Performance Tips

### Dynamic Imports

```typescript
// ✅ DO: Lazy load heavy components
import dynamic from "next/dynamic";

const HeavyChart = dynamic(() => import("./HeavyChart"), {
  loading: () => <div>Loading chart...</div>,
  ssr: false,
});
```

### Server vs Client Components

```typescript
// ✅ DO: Default to server components
// src/app/page.tsx
export default async function Page() {
  const data = await fetchData(); // Runs on server
  return <div>{data}</div>;
}

// ✅ DO: Use "use client" only when needed
// src/app/form.tsx
("use client");
export default function Form() {
  const [state, setState] = useState(false); // Needs client
  return <form>...</form>;
}
```

## Common Mistakes to Avoid

```typescript
// ❌ Mutating Zustand state directly
store.data.push(item); // Bad!
// ✅ Use set()
store.set((state) => ({ data: [...state.data, item] }));

// ❌ Forgetting to handle errors
await apiCall(); // What if it fails?
// ✅ Always try-catch
try {
  await apiCall();
} catch (error) {
  AILogger.error("API failed", { error });
}

// ❌ Not logging AI operations
const result = await claude.messages.create({...});
// ✅ Always log
AILogger.info("AI call started");
const result = await claude.messages.create({...});
AILogger.success("AI call completed");

// ❌ Using console.log in production
console.log("Debug:", data);
// ✅ Use AILogger
AILogger.info("Debug", { data });
```

## 🔄 Functional Flow & Module Pipeline

### Pipeline Architecture

The system follows a modular pipeline where **each module builds upon the previous one**:

```
İhale Upload + OCR → Menu Parser → Cost Analysis → Decision Engine → Reporting
```

Visual representation:

```
┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────┐
│ 0. İhale Upload  │ -> │  1. Menu Parser │ -> │ 2. Cost Analysis │ -> │ 3. Decision Eng │ -> │ 4. Reporting │
│ (OCR + Extract)  │    │   (File Upload) │    │   (AI Calculate) │    │   (AI Decide)   │    │  (PDF/Excel) │
└──────────────────┘    └─────────────────┘    └──────────────────┘    └─────────────────┘    └──────────────┘
        ↓                      ↓                        ↓                        ↓                      ↓
   ihale.json             menu.json              cost.json             decision.json            Download
```

### Pipeline Stages

**Stage 0: İhale Upload + OCR** (`/api/ihale/upload`) **[PHASE 6 - NEW!]**

- Input: Tender document (PDF/DOCX/TXT) file upload
- Process:
  1. File type detection (file-type)
  2. Text extraction (pdf-parse, mammoth)
  3. Text density analysis (trigger OCR if < 25%)
  4. **Gemini 2.0 Vision OCR** (for low-density documents)
  5. Claude analysis with IHALE_ANALYSIS_PROMPT
  6. SHA-256 hash for file uniqueness
- Output: `ihale_data{}` - Institution, budget, dates, specification summary
- Logged: File size, OCR usage, analysis duration, hash value
- **OCR Trigger**: `text_density < 0.25` → Gemini Vision activated
- **Dependencies**: formidable, pdf-parse, mammoth, file-type, @google/generative-ai

**Stage 1: Menu Parser** (`/api/parser/menu`)

- Input: CSV/TXT/PDF file upload
- Process: Claude extracts food items, portions, categories
- Output: `menu_data[]` - Structured menu items
- Logged: File size, parse duration, item count

**Stage 2: Cost Analysis** (`/api/ai/cost-analysis`)

- Input: `menu_data[]` + tender info (kurum, ihale_turu, kisilik, butce)
- Process: Claude calculates costs, risks, profit margins
- Output: `cost_analysis{}` - Financial breakdown
- Logged: Token usage, duration, risk level

**Stage 3: Decision Engine** (`/api/ai/decision`)

- Input: `cost_analysis{}` + `menu_data[]` + tender info
- Process: Claude makes strategic decision (Katıl/Katılma/Dikkatli Katıl)
- Output: `decision{}` - Final recommendation with reasoning
- Logged: Decision type, confidence, risk score

**Stage 4: Report Export** (`/api/export/pdf` or `/api/export/xlsx`)

- Input: Combined data from all previous stages
- Process: Generate formatted report using pdfkit/exceljs
- Output: Downloadable PDF or Excel file
- Logged: File size, generation time

### Monitoring & Visibility

**All AI decisions are logged, measured, and visualized on the Monitoring Dashboard** (`/monitor`):

- Real-time metrics (API call count, avg duration, error rate)
- Performance trends (Recharts line/bar charts)
- Token usage tracking
- Recent activity log
- System health indicators

## 🗺️ AI-Specific File Map

| File                                 | Purpose                                             |
| ------------------------------------ | --------------------------------------------------- |
| `/lib/ai/prompts.ts`                 | All Claude prompt templates                         |
| `/lib/ai/utils.ts`                   | cleanClaudeJSON, estimateTokens                     |
| `/lib/ai/logger.ts`                  | AILogger implementation                             |
| `/lib/ai/provider-factory.ts`        | Claude client singleton                             |
| `/lib/auth.ts`                       | NextAuth v5 config, JWT strategy, session callbacks |
| `/lib/db/sqlite-client.ts`           | Database connection manager                         |
| `/lib/db/init-auth.ts`               | Auth + notifications schema, user helpers           |
| `/lib/rbac.ts`                       | Role-based access control helpers                   |
| `/lib/utils/report-builder.ts`       | Report data aggregation                             |
| `/app/api/ihale/upload/route.ts`     | **[PHASE 6]** Tender upload + OCR + Claude analysis |
| `/app/api/ai/deep-analysis/`         | General analysis endpoint                           |
| `/app/api/ai/cost-analysis/`         | Cost calculation endpoint                           |
| `/app/api/ai/decision/`              | Decision engine endpoint                            |
| `/app/api/parser/menu/`              | Menu file parser endpoint                           |
| `/app/api/export/pdf/`               | PDF report generation                               |
| `/app/api/export/xlsx/`              | Excel report generation                             |
| `/app/api/auth/[...nextauth]/`       | NextAuth route handler                              |
| `/app/api/auth/register/`            | User registration endpoint                          |
| `/app/api/notifications/`            | Notification list (GET)                             |
| `/app/api/notifications/stream/`     | SSE real-time notification stream                   |
| `/app/api/notifications/test/`       | Test notification generator                         |
| `/app/api/logs/`                     | Log retrieval API                                   |
| `/app/api/metrics/`                  | Metrics aggregation API                             |
| `/app/signin/page.tsx`               | Login page with dark premium theme                  |
| `/app/notifications/page.tsx`        | Notification center with SSE integration            |
| `/app/monitor/page.tsx`              | Recharts dashboard for metrics                      |
| `/app/logs/page.tsx`                 | Log viewer UI                                       |
| `/app/cost-analysis/page.tsx`        | Cost engine UI                                      |
| `/app/decision/page.tsx`             | Decision engine UI                                  |
| `/app/menu-parser/page.tsx`          | Menu parser UI                                      |
| `/app/reports/page.tsx`              | Report generation UI                                |
| `/app/globals.css`                   | Theme system: glass, btn-gradient, h1/h2/h3 classes |
| `/app/template.tsx`                  | Page transitions wrapper (Framer Motion)            |
| `/components/shell/UserMenu.tsx`     | User profile and logout component                   |
| `/components/shell/Sidecar.tsx`      | Navigation sidebar with notifications link          |
| `/components/analysis/LogViewer.tsx` | Log display component                               |
| `/middleware.ts`                     | NextAuth route protection middleware                |

## Key Directories

```
src/
├── app/
│   ├── api/           # API routes
│   ├── signin/        # Authentication page
│   ├── notifications/ # Notification center
│   ├── cost-analysis/ # Cost analysis page
│   ├── decision/      # Decision engine page
│   ├── menu-parser/   # Menu parser page
│   ├── monitor/       # Monitoring dashboard
│   ├── reports/       # Report generation page
│   └── logs/          # Log viewer page
├── components/
│   ├── ui/            # Base UI components
│   └── analysis/      # Domain components
├── lib/
│   ├── ai/            # AI integration
│   ├── db/            # Database client
│   └── utils/         # Utilities
└── store/             # Zustand stores
```

## Testing Checklist

Before submitting code, ensure:

- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] ESLint passes (`npm run lint`)
- [ ] No console.log statements
- [ ] All API routes have Zod validation
- [ ] All AI calls use AILogger
- [ ] All database queries use prepared statements
- [ ] Responsive design works on mobile
- [ ] Loading/error states handled
- [ ] Environment variables not hardcoded

## Module-Specific Guidelines

### Cost Analysis

- Always use COST_ANALYSIS_PROMPT from prompts.ts
- Return structured JSON with maliyet_dagilimi
- Log token usage and duration

### Decision Engine

- Use DECISION_PROMPT
- Only return "Katıl" | "Katılma" | "Dikkatli Katıl"
- Include stratejik_oneriler and kritik_noktalar

### Menu Parser

- Accept CSV, TXT, PDF files
- Use MENU_PARSER_PROMPT
- Return array of menu items with gramaj, kisi, kategori

### Report Export

- Use report-builder.ts for data aggregation
- PDF: pdfkit with professional layout
- Excel: exceljs with multiple sheets
- Always return as downloadable response

## � OCR & Document Processing

### Smart OCR Triggering

```typescript
// ✅ DO: Calculate text density to decide OCR usage
function calculateTextDensity(text: string): number {
  const sample = text.slice(0, 8000);
  const alphanumeric = (sample.match(/[A-Za-zĞÜŞİÖÇğüşiöç0-9\s]/g) || [])
    .length;
  return alphanumeric / Math.max(1, sample.length);
}

// Only use OCR if density < 25%
if (mimeType === "application/pdf" && calculateTextDensity(text) < 0.25) {
  text = await runGeminiOCR(buffer);
}

// ❌ DON'T: Always run OCR (expensive and slow)
const text = await runGeminiOCR(buffer); // Bad!
```

### Gemini 2.0 Vision OCR

```typescript
// ✅ DO: Use Gemini for OCR on low-density PDFs
import { GoogleGenerativeAI } from "@google/generative-ai";

async function runGeminiOCR(buffer: Buffer): Promise<string> {
  const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  const model = gemini.getGenerativeModel({ model: "gemini-2.0-vision" });

  const result = await model.generateContent([
    {
      role: "user",
      parts: [
        {
          text: "Extract all text from this document in UTF-8 plain text. No additional commentary.",
        },
        {
          inlineData: {
            data: buffer.toString("base64"),
            mimeType: "application/pdf",
          },
        },
      ],
    },
  ]);

  return result.response.text();
}
```

### File Type Detection

```typescript
// ✅ DO: Use magic bytes for MIME type detection
import { fileTypeFromBuffer } from "file-type";

async function detectMimeType(buffer: Buffer): Promise<string> {
  const fileType = await fileTypeFromBuffer(buffer);
  return fileType?.mime ?? "application/octet-stream";
}

// ❌ DON'T: Trust file extensions
const mimeType = filename.endsWith(".pdf") ? "application/pdf" : "text/plain";
```

### Text Extraction Pipeline

```typescript
// ✅ DO: Use appropriate parser for each file type
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const { text } = await pdfParse(buffer);
    return text;
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (mimeType.startsWith("text/")) {
    return buffer.toString("utf8");
  }

  return "";
}
```

### File Hashing for Caching

```typescript
// ✅ DO: Use SHA-256 to cache analyzed documents
import crypto from "crypto";

function getFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// Check cache before processing
const hash = getFileHash(fileBuffer);
const cached = await db
  .prepare("SELECT * FROM ihale_cache WHERE hash = ?")
  .get(hash);
if (cached) return cached.data;
```

### İhale Upload Endpoint Pattern

```typescript
// ✅ DO: Complete pipeline implementation
export async function POST(req: NextRequest) {
  const form = formidable({ multiples: false });
  const [fields, files] = await form.parse(req);
  const file = files.file?.[0];

  const buffer = await fs.readFile(file.filepath);
  const mimeType = await detectMimeType(buffer);
  const hash = getFileHash(buffer);

  let text = await extractText(buffer, mimeType);
  const density = calculateTextDensity(text);

  if (mimeType === "application/pdf" && density < 0.25) {
    AILogger.warn("Low text density, triggering OCR", { density });
    text = await runGeminiOCR(buffer);
  }

  const client = AIProviderFactory.getClaude();
  const result = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL!,
    temperature: 0.3,
    max_tokens: 8000,
    messages: [
      { role: "user", content: IHALE_ANALYSIS_PROMPT + "\n\n" + text },
    ],
  });

  const data = JSON.parse(cleanClaudeJSON(result.content[0].text));

  return NextResponse.json({
    success: true,
    data,
    meta: { hash, ocr_used: density < 0.25, mime_type: mimeType },
  });
}
```

## �💻 Coding Practices for Copilot

### Component Structure

Always use functional components with explicit types:

```typescript
// ✅ DO: Functional component with typed props
interface Props {
  title: string;
  onSubmit: (data: FormData) => void;
}

export default function AnalysisForm({ title, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);

  return (
    <form className="space-y-4">
      <button disabled={loading}>Submit</button>
    </form>
  );
}

// ❌ DON'T: Anonymous exports or FC wrapper
export default (props) => {
  /* bad */
};
export const Form: React.FC<Props> = (props) => {
  /* avoid */
};
```

### Styling with Tailwind & Glassmorphism Theme

```typescript
// ✅ DO: Use glassmorphism theme system (globals.css)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div className="glass-card">
    <h3 className="h3">Title</h3>
    <p className="text-gray-400">Content</p>
  </div>
</div>

// ✅ DO: Use theme utility classes
<div className="glass p-6">            {/* Base glass effect */}
<div className="glass-card">           {/* Glass + padding + hover */}
<button className="btn-gradient">      {/* Gradient button */}
<h1 className="h1">Main Title</h1>     {/* Typography hierarchy */}
<h2 className="h2">Section</h2>
<h3 className="h3">Subsection</h3>

// ❌ DON'T: Use old Card components or inline styles
<Card className="p-6">...</Card>      {/* Deprecated */}
<div style={{ padding: '24px' }}>     {/* Bad */}
```

**Theme Classes Reference (src/app/globals.css):**

- `.glass` → backdrop-blur-md + bg-slate-900/60
- `.glass-card` → glass + p-6 + hover effects
- `.btn-gradient` → indigo→purple→pink gradient
- `.h1`, `.h2`, `.h3` → Typography with gradient colors

### Export Patterns

```typescript
// ✅ DO: Named exports for utilities
export function calculateCost(data: MenuData): number {
  return data.items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ DO: Default export for pages
export default function CostAnalysisPage() {
  return <div>Cost Analysis</div>;
}

// ❌ DON'T: Anonymous exports
export default () => <div>Bad</div>;
```

### Async/Await Pattern

```typescript
// ✅ DO: Use async/await with proper error handling
async function fetchAnalysis() {
  try {
    const data = await apiCall();
    AILogger.success("Analysis fetched");
    return data;
  } catch (error) {
    AILogger.error("Fetch failed", { error });
    throw error;
  }
}

// ❌ DON'T: Use .then() chains
apiCall()
  .then((data) => {})
  .catch((err) => {});
```

### Import Organization

```typescript
// ✅ DO: Use @/ alias for consistent imports
import { AILogger } from "@/lib/ai/logger";
import { Card } from "@/components/ui/card";
import type { AnalysisData } from "@/types/analysis.types";

// ❌ DON'T: Use relative paths
import { AILogger } from "../../lib/ai/logger";
```

### Pure Functions & Self-Documenting Code

```typescript
// ✅ DO: Write pure functions with clear names
function calculateTotalCost(items: MenuItem[], markup: number): number {
  const baseCost = items.reduce((sum, item) => sum + item.price, 0);
  return baseCost * (1 + markup);
}

// ✅ DO: Self-documenting code (no comments needed)
const isHighRisk = riskScore > 0.7;
const shouldParticipate = profit > minProfit && !isHighRisk;

// ❌ DON'T: Functions with side effects or unclear naming
function calc(x) {
  globalVar = x * 2; // Side effect!
  return x + globalVar;
}
```

## ⚡ Enhanced Best Practices

### ❌ What NOT to Do

```typescript
// DON'T hardcode values
const apiKey = "sk-abc123"; // Bad!
const model = "claude-sonnet-4-20250514"; // Bad!

// DON'T bypass validation
const body = await req.json(); // Unsafe!

// DON'T use console.log in production
console.log("Debug:", data); // Bad!

// DON'T mutate state directly
store.data.push(item); // Bad!

// DON'T create new DB connections
const db = new Database("procheff.db"); // Bad!

// DON'T skip error handling
await apiCall(); // What if it fails?

// DON'T expose secrets in client components
("use client");
const secret = process.env.API_KEY; // Exposed to browser!
```

### ✅ What TO Do

```typescript
// DO use environment variables
const apiKey = process.env.ANTHROPIC_API_KEY;
const model = process.env.ANTHROPIC_MODEL;

// DO validate with Zod
const RequestSchema = z.object({
  field: z.string().min(1),
});
const body = RequestSchema.parse(await req.json());

// DO use AILogger
AILogger.info("Processing", { data });

// DO use set() for state updates
store.set((state) => ({ data: [...state.data, item] }));

// DO use singleton pattern
const db = getDB();

// DO handle errors
try {
  await apiCall();
} catch (error) {
  AILogger.error("API failed", { error });
}

// DO keep secrets server-side
// src/app/api/route.ts (server only)
const secret = process.env.API_KEY; // Safe!
```

### Commit Conventions

```bash
# ✅ DO: Use Conventional Commits format
feat: add decision engine visualization
fix: resolve cost calculation overflow
refactor: improve prompt structure
docs: update API documentation
chore: upgrade dependencies

# ❌ DON'T: Vague commit messages
git commit -m "fix stuff"
git commit -m "updates"
```

## Questions to Ask Yourself

When writing code for this project:

1. **Type Safety**: Have I avoided using `any`?
2. **Validation**: Am I validating user input with Zod?
3. **Logging**: Am I using AILogger instead of console.log?
4. **AI Integration**: Am I cleaning Claude's JSON output?
5. **Database**: Am I using prepared statements?
6. **Performance**: Should this be a server component?
7. **UX**: Do I have loading and error states?
8. **Security**: Am I exposing any secrets?

## Conventional Commits Examples

```bash
# ✅ DO: Detailed and structured commit messages
feat(ai): add decision engine endpoint
fix(ui): correct responsive layout
refactor(db): optimize SQLite connection

# ✅ DO: Add scope to indicate which module is affected
feat(cost-analysis): add profit margin calculation
fix(menu-parser): resolve CSV parsing error
refactor(logger): improve performance metrics

# ❌ DON'T: Vague or scope-less messages
git commit -m "update"
git commit -m "fix bug"
git commit -m "changes"
```

---

## 🧩 AI Code Generation Context

**Copilot, Claude, or any AI writing code for this project must:**

1. **Respect modular architecture**: Each module should work independently
2. **Inject logs via AILogger**: Use `AILogger.info()`, `AILogger.error()` instead of console.log
3. **Maintain TypeScript strict mode compatibility**: No `any` types, use explicit types
4. **Keep all model calls observable**: Log for metrics dashboard
5. **Avoid redundant comments and console outputs**: Write self-documenting code

### Code Writing Checklist

```typescript
// ✅ When writing this code, did I:
// 1. Ensure type safety? (no any types?)
// 2. Validate inputs? (with Zod schema)
// 3. Log with AILogger?
// 4. Clean Claude responses with cleanClaudeJSON()?
// 5. Use prepared statements for database operations?
// 6. Add error handling?
// 7. Add loading state?
// 8. Apply responsive design?
```

### AI Model Call Template

```typescript
// ✅ DO: Use this pattern for every AI call
import { AIProviderFactory } from "@/lib/ai/provider-factory";
import { AILogger } from "@/lib/ai/logger";
import { cleanClaudeJSON } from "@/lib/ai/utils";

export async function analyzeData(input: AnalysisInput) {
  AILogger.info("Starting AI analysis", { input });

  try {
    const client = AIProviderFactory.getClaude();
    const result = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL!,
      temperature: 0.4,
      max_tokens: 8000,
      messages: [{ role: "user", content: buildPrompt(input) }],
    });

    const rawText = result.content?.[0]?.text || "";
    const cleanedJSON = cleanClaudeJSON(rawText);
    const data = JSON.parse(cleanedJSON);

    AILogger.success("AI analysis completed", {
      tokens: result.usage,
      dataKeys: Object.keys(data),
    });

    return data;
  } catch (error) {
    AILogger.error("AI analysis failed", { error });
    throw error;
  }
}
```

---

## ✅ Summary

**Procheff-v3 is a measurable, observable, and self-aware AI system.**

### Your Task as an AI Assistant or Developer:

1. **Extend it without breaking observability**

   - Every new feature must be logged via AILogger
   - Data must flow to metrics dashboard
   - Database must record logs

2. **Maintain clarity, structure, and consistency**

   - Follow modular architecture (Menu → Cost → Decision → Report)
   - Write TypeScript strict mode compatible code
   - Follow naming conventions

3. **Always measure, never guess**
   - Log token usage
   - Record API response times
   - Track error rates
   - Calculate risk scores

### System Features

- ✅ **6 main modules**: AI Logger, Monitoring Dashboard, Cost Analysis, Menu Parser, Decision Engine, Report Export
- ✅ **UI Enhancement Layer**: Command Palette (Cmd+K), Sidecar Navigation (Cmd+B), Premium Dark Theme
- ✅ **Claude Sonnet 4.5**: claude-sonnet-4-20250514
- ✅ **SQLite Database**: Log storage via better-sqlite3
- ✅ **Real-time Monitoring**: Visualization with Recharts
- ✅ **Type Safety**: TypeScript strict mode
- ✅ **Input Validation**: Zod schemas
- ✅ **UI Libraries**: cmdk (command palette), framer-motion (animations), lucide-react (icons), sonner (toasts)
- ✅ **Observability**: Every AI decision is logged and visible on dashboard

---

**Remember**: This is an enterprise-grade application. Code quality, type safety, and proper logging are not optional—they are requirements.

## 🚀 Deployment

### DigitalOcean App Platform (Recommended)
```bash
# Deploy via CLI
doctl apps create --spec .do/app.yaml

# Or via GitHub (auto-deploy on push to main)
git push origin main
```

### Docker Droplet (VPS)
```bash
# Build and run
docker build -t procheff-v3:latest .
docker-compose up -d

# Update
git pull && docker-compose up -d --build
```

### Documentation
- **Quick Start**: README-DEPLOYMENT.md
- **Full Guide**: docs/DIGITALOCEAN-DEPLOYMENT.md
- **Summary**: DIGITALOCEAN-SETUP.md

---

**AI Model**: Claude Sonnet 4.5 (claude-sonnet-4-20250514)
**Deployment**: DigitalOcean App Platform / Docker
**Last Updated**: November 10, 2025
