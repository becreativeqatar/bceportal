# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DAMP (Digital Asset & Subscription Manager) is a comprehensive web application for managing digital assets, subscriptions, suppliers, and accreditation workflows. Built with Next.js 15 App Router, React 19, TypeScript, Prisma ORM, and PostgreSQL.

## Common Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Build for production (includes Prisma generate + migrate)
npm run typecheck        # TypeScript type checking
npm run lint             # ESLint

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations (dev)
npm run db:seed          # Seed database
npx prisma format        # Format schema.prisma

# Testing
npm test                 # Run Jest unit tests
npm run test:watch       # Jest watch mode
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:headed  # E2E tests with browser visible
npm run test:e2e:ui      # Playwright UI mode
npm run test:all         # Run all tests (unit + E2E)

# Single test file
npx jest tests/unit/lib/utils.test.ts              # Unit test
npx jest tests/integration/assets.test.ts          # Integration test
npx playwright test tests/e2e/auth.spec.ts         # E2E test
npx playwright test tests/e2e/smoke.spec.ts        # Smoke test

# Operational scripts
npm run cron:subs        # Check subscription renewals and send alerts
npm run cron:warranty    # Check warranty expirations
npm run cron:employee-expiry  # Check employee document expirations
npm run ops:purge-activity  # Clean old activity logs
npm run backup:full create  # Full database + files backup
npm run check-deployment    # Pre-deployment validation checks
```

## Architecture

### Authentication & Authorization

- **NextAuth.js** with Azure AD OAuth provider (`src/lib/auth.ts`)
- JWT session strategy with Prisma adapter for user storage
- Six user roles: `ADMIN`, `EMPLOYEE`, `VALIDATOR`, `TEMP_STAFF`, `ACCREDITATION_ADDER`, `ACCREDITATION_APPROVER`
- **Development auth**: Set `DEV_AUTH_ENABLED=true` for credentials-based login (test users: `admin@test.local`/`admin123`, `employee@test.local`/`employee123`, etc.)
- Role-based routing enforced in `src/middleware.ts`:
  - `/admin/*` - requires authentication (admin check in page components)
  - `/validator/*` - VALIDATOR or ADMIN only
  - ACCREDITATION_* roles restricted to accreditation module only (external freelancers)

### Route Structure

- `/admin/*` - Admin dashboard (assets, subscriptions, suppliers, users, settings, accreditation)
- `/employee/*` - Employee views (my-assets, my-subscriptions, suppliers)
- `/validator/*` - QR code scanning for accreditation verification
- `/verify/[token]` - Public accreditation verification page
- `/suppliers/register` - Public supplier registration form

### API Pattern

All API routes use the `withErrorHandler` wrapper from `src/lib/http/handler.ts`:
```typescript
export const GET = withErrorHandler(async (request) => {
  // Handler code
}, { requireAuth: true, rateLimit: true });
```

Options: `requireAuth`, `requireAdmin`, `skipLogging`, `rateLimit`

API conventions:
- Located in `src/app/api/`
- Use Zod validation schemas from `src/lib/validations/`
- Return consistent error format with `error`, `details`, `timestamp`, `requestId`
- Rate limiting via `src/lib/security/rateLimit.ts` (token bucket algorithm)

### Core Modules

1. **Assets** - Hardware/equipment tracking with assignment history, warranty tracking, maintenance records
2. **Subscriptions** - SaaS/service management with renewal tracking, cost analysis, lifecycle (cancel/reactivate)
3. **Suppliers** - Vendor registration workflow with approval process (PENDING → APPROVED/REJECTED)
4. **Accreditation** - Event accreditation with QR verification, photo uploads, phase-based access control (bump-in, live, bump-out phases)
5. **Task Management** - Kanban boards with drag-and-drop (`/admin/tasks/`):
   - Boards with columns, members, labels
   - Tasks with assignees, checklists, comments, attachments
   - Views: Board (kanban), List, Calendar, My Tasks
   - Uses `@dnd-kit` for drag-and-drop
6. **Employees/HR** - Employee profiles with document tracking (QID, passport, visa expiry alerts)
7. **Purchase Requests** - Internal procurement workflow with approval process, cost tracking (operating vs project costs), multi-currency support

### Key Libraries

- **Prisma** - Database ORM (`prisma/schema.prisma` defines all models)
- **Zod** - Runtime validation (`src/lib/validations/`)
- **shadcn/ui** - UI components (`src/components/ui/`)
- **Supabase** - File storage for invoices and profile photos (`src/lib/storage/`)
- **Pino** - Structured logging (`src/lib/log.ts`)
- **ExcelJS** - Excel export functionality
- **html5-qrcode** - QR code scanning for accreditation verification
- **@dnd-kit** - Drag-and-drop for kanban boards (`@dnd-kit/core`, `@dnd-kit/sortable`)

### File Storage

- Files stored in Supabase Storage (private buckets)
- Upload validation in `src/lib/validations/upload.ts` (magic number verification for security)
- Signed URLs for secure downloads via `src/lib/storage/supabase.ts`
- Supported: PDF, PNG, JPEG (validated by file header, not just extension)

### Activity Logging

All user actions logged to `ActivityLog` table via `src/lib/activity.ts`:
```typescript
import { logAction, ActivityActions } from '@/lib/activity';
await logAction(userId, ActivityActions.ASSET_CREATED, 'Asset', assetId, payload);
```

## Testing

- **Jest** - Unit/integration tests in `tests/` directory
  - `tests/unit/lib/` - Unit tests for lib functions and validations
  - `tests/integration/` - API integration tests
  - `tests/security/` - Security tests (auth, IDOR, rate limiting)
  - `tests/helpers/factories.ts` - Test data factories
  - `tests/mocks/` - Mock implementations (next-auth, prisma)
- **Playwright** - E2E tests in `tests/e2e/` directory
  - `tests/e2e/auth.spec.ts` - Authentication flows
  - `tests/e2e/assets.spec.ts` - Asset workflows
  - `tests/e2e/subscriptions.spec.ts` - Subscription workflows
  - `tests/e2e/accreditation.spec.ts` - Accreditation workflows
  - `tests/e2e/permissions-and-edge-cases.spec.ts` - Access control & edge cases
  - `tests/e2e/smoke.spec.ts` - Quick smoke tests
- Tests use local SQLite database (separate from production PostgreSQL)

## Currency Handling

- Assets and subscriptions store both original currency and QAR (Qatari Riyal) equivalent
- Exchange rates managed in `SystemSettings` table
- Price fields: `price`/`priceCurrency`/`priceQAR` (assets), `costPerCycle`/`costCurrency`/`costQAR` (subscriptions)

## Date/Time Handling

- All dates stored in UTC in database
- Qatar timezone (Asia/Qatar, UTC+3) used for display via `src/lib/qatar-timezone.ts`
- Date formatting utilities in `src/lib/date-format.ts`

## Key Directories

- `src/lib/` - Core utilities, validation schemas, security middleware
- `src/lib/validations/` - Zod schemas for API input validation
- `src/lib/http/` - API handler wrapper, error formatting
- `src/lib/security/` - Rate limiting, security utilities
- `src/components/ui/` - shadcn/ui base components
- `src/components/forms/` - Form components with react-hook-form
- `scripts/cron/` - Scheduled tasks (subscription renewals, warranty alerts, employee expiry)
- `scripts/backup/` - Database and file backup utilities
- `scripts/ops/` - Operational maintenance scripts

## Database Schema Notes

Key Prisma models (see `prisma/schema.prisma`):
- `User` - Central user model with role-based access
- `Asset`, `AssetHistory` - Asset tracking with assignment history
- `Subscription`, `SubscriptionHistory` - Subscription lifecycle management
- `Supplier`, `SupplierEngagement` - Vendor management with engagement tracking
- `AccreditationProject`, `Accreditation`, `AccreditationScan` - Event accreditation system
- `Board`, `TaskColumn`, `Task`, `TaskAssignee` - Kanban task management
- `PurchaseRequest`, `PurchaseRequestItem` - Procurement workflow
- `HRProfile`, `ProfileChangeRequest` - Employee HR data

Enums: `Role`, `AssetStatus`, `SubscriptionStatus`, `SupplierStatus`, `AccreditationStatus`, `BillingCycle`, `TaskPriority`, `PurchaseRequestStatus`

## Form Handling Pattern

Forms use `react-hook-form` with Zod resolvers:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { assetSchema, type AssetFormData } from '@/lib/validations/assets';

const form = useForm<AssetFormData>({
  resolver: zodResolver(assetSchema),
  defaultValues: { ... }
});
```

## Component Patterns

- Tables use server-side search components (e.g., `AssetListTableServerSearch`, `SubscriptionListTableServerSearch`)
- Forms typically have a `*Form` component that handles validation and submission
- Detail pages follow pattern: `src/app/admin/[module]/[id]/page.tsx`
- Edit pages follow pattern: `src/app/admin/[module]/[id]/edit/page.tsx`
