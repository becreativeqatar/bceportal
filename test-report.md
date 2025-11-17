
# Automated Test Report
Generated: 2025-11-17T07:12:50.043Z

## Summary
- **Total Suites**: 7
- **Passed**: 5 ✅
- **Failed**: 2 ❌
- **Success Rate**: 71.43%
- **Total Duration**: 72.88s

## Test Results


### Security Tests (Auth, IDOR, Rate Limiting)
- **Status**: ✅ PASSED
- **Duration**: 6972ms



### API Endpoint Tests (Assets, Subscriptions, Users)
- **Status**: ✅ PASSED
- **Duration**: 5156ms



### Unit Tests (Components, Utilities)
- **Status**: ✅ PASSED
- **Duration**: 5501ms



### Integration Tests (End-to-End Flows)
- **Status**: ❌ FAILED
- **Duration**: 2875ms
- **Error**: ```
Command failed: npm run test __tests__/integration

```


### Test Coverage Analysis
- **Status**: ❌ FAILED
- **Duration**: 29258ms
- **Error**: ```
FAIL e2e/permissions-and-edge-cases.spec.ts
  ● Test suite failed to run

    ReferenceError: TransformStream is not defined

    [0m [90m 3 |[39m [36mimport[39m { generateAssetData } [36mfrom[39m [32m'./utils/test-data'[39m[33m;[39m
     [90m 4 |[39m [36mimport[39m path [36mfrom[39m [32m'path'[39m[33m;[39m
    [31m[1m>[22m[39m[90m 5 |[39m
     [90m   |[39m [31m[1m^[22m[39m
     [90m 6 |[39m [90m/**[39m
     [90m 7 |[39m [90m * Test Sessions 5 & 6: Permissions Check and Edge Cases[39m
     [90m 8 |[39m [90m * Covers MANUAL_TESTING_SESSION.md - Test Sessions 5 & 6[39m[0m

      at Object.<anonymous> (node_modules/playwright/lib/mcpBundleImpl.js:17:5390)
      at Object.<anonymous> (node_modules/playwright/lib/mcp/sdk/bundle.js:48:22)
      at Object.<anonymous> (node_modules/playwright/lib/mcp/sdk/proxyBackend.js:35:25)
      at Object.<anonymous> (node_modules/playwright/lib/mcp/sdk/exports.js:19:29)
      at Object.<anonymous> (node_modules/playwright/lib/mcp/test/browserBackend.js:34:19)
      at Object.<anonymous> (node_modules/playwright/lib/index.js:45:29)
      at Object.<anonymous> (node_modules/playwright/test.js:17:13)
      at Object.<anonymous> (node_modules/@playwright/test/index.js:17:18)
      at Object.<anonymous> (e2e/permissions-and-edge-cases.spec.ts:5:15)

FAIL e2e/assets.spec.ts
  ● Test suite failed to run

    ReferenceError: TransformStream is not defined

    [0m [90m 3 |[39m [36mimport[39m { generateAssetData } [36mfrom[39m [32m'./utils/test-data'[39m[33m;[39m
     [90m 4 |[39m
    [31m[1m>[22m[39m[90m 5 |[39m [90m/**[39m
     [90m   |[39m              [31m[1m^[22m[39m
     [90m 6 |[39m [90m * Test Session 2: Create Asset[39m
     [90m 7 |[39m [90m * Covers MANUAL_TESTING_SESSION.md - Test Session 2[39m
     [90m 8 |[39m [90m */[39m[0m

      at Object.<anonymous> (node_modules/playwright/lib/mcpBundleImpl.js:17:5390)
      at Object.<anonymous> (node_modules/playwright/lib/mcp/sdk/bundle.js:48:22)
      at Object.<anonymous> (node_modules/playwright/lib/mcp/sdk/proxyBackend.js:35:25)
      at Object.<anonymous> (node_modules/playwright/lib/mcp/sdk/exports.js:19:29)
      at Object.<anonymous> (node_modules/playwright/lib/mcp/test/browserBackend.js:34:19)
      at Object.<anonymous> (node_modules/playwright/lib/index.js:45:29)
      at Object.<anonymous> (node_modules/playwright/test.js:17:13)
      at Object.<anonymous> (node_modules/@playwright/test/index.js:17:18)
      at Object.<anonymous> (e2e/assets.spec.ts:5:15)

FAIL e2e/subscriptions.spec.ts
  ● Test suite failed to run

    ReferenceError: TransformStream is not defined

    [0m [90m 3 |[39m [36mimport[39m { generateSubscriptionData } [36mfrom[39m [32m'./utils/test-data'[39m[33m;[39m
     [90m 4 |[39m
    [31m[1m>[22m[39m[90m 5 |[39m [90m/**[39m
     [90m   |[39m              [31m[1m^[22m[39m
     [90m 6 |[39m [90m * Test Session 3: Create Subscription[39m
     [90m 7 |[39m [90m * Covers MANUAL_TESTING_SESSION.md - Test Session 3[39m
     [90m 8 |[39m [90m */[39m[0m

      at Object.<anonymous> (node_modules/playwright/lib/mcpBundleImpl.js:17:5390)
      at Object.<anonymous> (node_modules/playwright/lib/mcp/sdk/bundle.js:48:22)
      at Object.<anonymous> (node_modules/playwright/lib/mcp/sdk/proxyBackend.js:35:25)
      at Object.<anonymous> (node_modules/playwright/lib/mcp/sdk/exports.js:19:29)
      at Object.<anonymous> (node_modules/playwright/lib/mcp/test/browserBackend.js:34:19)
      at Object.<anonymous> (node_modules/playwright/lib/index.js:45:29)
      at Object.<anonymous> (node_modules/playwright/test.js:17:13)
      at Object.<anonymous> (node_modules/@playwright/test/index.js:17:18)
      at Object.<anonymous> (e2e/subscriptions.spec.ts:5:15)

FAIL e2e/accreditation.spec.ts
  ● Test suite failed to run

    ReferenceError: TransformStream is not defined

    [0m [90m 3 |[39m [36mimport[39m { generateAccreditationProjectData[33m,[39m generateAccreditationRecordData } [36mfrom[39m [32m'./utils/test-data'[39m[33m;[39m
     [90m 4 |[39m
    [31m[1m>[22m[39m[90m 5 |[39m [90m/**[39m
     [90m   |[39m              [31m[1m^[22m[39m
     [90m 6 |[39m [90m * Test Session 4: Accreditation System[39m
     [90m 7 |[39m [90m * Covers MANUAL_TESTING_SESSION.md - Test Session 4[39m
     [90m 8 |[39m [90m */[39m[0m

      at Object.<anonymous> (node_modules/playwright/lib/mcpBundleImpl.js:17:5390)
      at Object.<anonymous> (node_modules/playwright/lib/mcp/sdk/bundle.js:48:22)
      at Object.<anonymous> (node_modules/playwright/lib/mcp/sdk/proxyBackend.js:35:25)
      at Object.<anonymous> (node_modules/playwright/lib/mcp/sdk/exports.js:19:29)
      at Object.<anonymous> (node_modules/playwright/lib/mcp/test/browserBackend.js:34:19)
      at Object.<anonymous> (node_modules/playwright/lib/index.js:45:29)
      at Object.<anonymous> (node_modules/playwright/test.js:17:13)
      at Object.<anonymous> (node_modules/@playwright/test/index.js:17:18)
      at Object.<anonymous> (e2e/accreditation.spec.ts:5:15)

FAIL e2e/auth.spec.ts
  ● Test suite failed to run

    ReferenceError: TransformStream is not defined

    [0m [90m 3 |[39m
     [90m 4 |[39m [90m/**[39m
    [31m[1m>[22m[39m[90m 5 |[39m [90m * Test Session 1: Authentication & Roles[39m
     [90m   |[39m               [31m[1m^[22m[39m
     [90m 6 |[39m [90m * Covers MANUAL_TESTING_SESSION.md - Test Session 1[39m
     [90m 7 |[39m [90m */[39m
     [90m 8 |[39m[0m

      at Object.<anonymous> (node_modules/playwright/lib/mcpBundleImpl.js:17:5390)
      at Object.<anonymous> (node_modules/playwright/lib/mcp/sdk/bundle.js:48:22)
      at Object.<anonymous> (node_modules/playwright/lib/mcp/sdk/proxyBackend.js:35:25)
      at Object.<anonymous> (node_modules/playwright/lib/mcp/sdk/exports.js:19:29)
      at Object.<anonymous> (node_modules/playwright/lib/mcp/test/browserBackend.js:34:19)
      at Object.<anonymous> (node_modules/playwright/lib/index.js:45:29)
      at Object.<anonymous> (node_modules/playwright/test.js:17:13)
      at Object.<anonymous> (node_modules/@playwright/test/index.js:17:18)
      at Object.<anonymous> (e2e/auth.spec.ts:5:15)

PASS src/lib/__tests__/csv-utils.test.ts
  CSV Utilities
    formatDateForCSV
      √ should format date to dd/mm/yyyy for CSV (11 ms)
      √ should handle string dates (2 ms)
      √ should return empty string for null (2 ms)
      √ should return empty string for invalid dates (2 ms)
    formatCurrencyForCSV
      √ should format currency as string (2 ms)
      √ should handle zero (2 ms)
      √ should return empty string for null (2 ms)
      √ should handle negative numbers (3 ms)

PASS src/lib/__tests__/utils-renewal-date.test.ts
  Renewal Date Utilities
    getNextRenewalDate
      √ should return future date as-is if already in future (3 ms)
      √ should calculate next monthly renewal for past date (2 ms)
      √ should calculate next yearly renewal for past date (1 ms)
      √ should handle ONE_TIME billing cycle (1 ms)
      √ should return null for null input (1 ms)
    isRenewalOverdue
      √ should return true for past dates (1 ms)
      √ should return false for future dates (1 ms)
      √ should return false for null
    getDaysUntilRenewal
      √ should return positive number for future dates
      √ should return negative number for past dates (1 ms)
      √ should return null for null input

PASS src/lib/__tests__/date-format.test.ts
  Date Formatting Utilities
    formatDate
      √ should format date to "DD Mon YYYY" format (20 ms)
      √ should handle null dates (1 ms)
      √ should handle undefined dates
      √ should handle string dates (1 ms)
      √ should handle invalid dates
    formatDateTime
      √ should format date with time (1 ms)
      √ should handle null dates
      √ should handle undefined dates (1 ms)
      √ should handle invalid dates (1 ms)

PASS __tests__/security/rate-limit.test.ts
  Rate Limiting Security Tests
    Rate Limit Logic
      √ should simulate rate limit bucket logic (4 ms)
      √ should detect when limit is exceeded
      √ should reset window after time expires (1 ms)
    IP Extraction Logic
      √ should extract first IP from x-forwarded-for (2 ms)
      √ should handle single IP in x-forwarded-for (1 ms)
      √ should handle empty x-forwarded-for (1 ms)
    Rate Limit Configuration
      √ should use default rate limit values
      √ should return 429 status when rate limit exceeded
    Rate Limit Response Headers
      √ should include rate limit headers in response (2 ms)
    Rate Limit Security Concepts
      √ should validate rate limit bypass prevention
      √ should have fallback for missing IP (1 ms)
      √ should support concurrent request tracking

PASS __tests__/security/auth.test.ts
  Authentication Security Tests
    Session Authentication
      √ should reject requests without a session (4 ms)
      √ should allow requests with valid session (2 ms)
      √ should verify admin role for admin endpoints (1 ms)
    Role-Based Access Control
      √ should allow ADMIN to access admin resources (1 ms)
      √ should deny EMPLOYEE access to admin resources (1 ms)
      √ should allow VALIDATOR to access validator resources (1 ms)
    Session Expiration
      √ should detect expired sessions
      √ should detect valid sessions

PASS __tests__/security/idor.test.ts
  IDOR (Insecure Direct Object Reference) Security Tests
    Asset Access Control
      √ should allow admin to access any asset (3 ms)
      √ should prevent employee from accessing another user's asset (1 ms)
      √ should allow employee to access their own asset (1 ms)
    Subscription Access Control
      √ should prevent employee from accessing another user's subscription
      √ should allow employee to access their own subscription
    Authorization Logic
      √ should correctly implement authorization check (1 ms)
    URL Parameter Tampering
      √ should detect resource ID tampering attempt (1 ms)
      √ should allow access to owned resource (1 ms)

PASS __tests__/api/subscriptions.test.ts
  Subscriptions API Tests
    GET /api/subscriptions
      √ should return 401 if not authenticated (3 ms)
      √ should return subscriptions for authenticated user (2 ms)
    GET /api/subscriptions/[id]
      √ should return 401 if not authenticated (1 ms)
      √ should return 403 if user tries to access another user's subscription (1 ms)
      √ should return subscription if user is owner (1 ms)
      √ should return subscription if user is admin (1 ms)
    POST /api/subscriptions
      √ should require admin role (1 ms)
      √ should create subscription with valid data (1 ms)
    Cost Calculations
      √ should calculate monthly cost correctly (1 ms)
      √ should calculate monthly cost from yearly billing (1 ms)
    Renewal Date Calculations
      √ should calculate next renewal date for monthly subscription (1 ms)
      √ should calculate next renewal date for yearly subscription

PASS __tests__/api/assets.test.ts
  Assets API Tests
    GET /api/assets
      √ should return 401 if not authenticated (3 ms)
      √ should return assets for authenticated user (2 ms)
      √ should support pagination (1 ms)
      √ should support search filtering (1 ms)
      √ should support status filtering (1 ms)
    POST /api/assets
      √ should return 401 if not authenticated (1 ms)
      √ should return 401 if not admin (1 ms)
      √ should create asset with valid data (2 ms)
      √ should validate required fields (1 ms)
      √ should prevent duplicate asset tags (1 ms)
    GET /api/assets/[id]
      √ should return 401 if not authenticated (1 ms)
      √ should return 403 if user tries to access another user's asset (1 ms)
      √ should return asset if user is owner (1 ms)
      √ should return asset if user is admin (1 ms)
      √ should return 404 if asset not found (1 ms)
    GET /api/assets/export
      √ should require admin role (1 ms)
      √ should be rate limited (1 ms)

Jest: "global" coverage threshold for statements (50%) not met: 1.95%
Jest: "global" coverage threshold for branches (50%) not met: 31.42%
Jest: "global" coverage threshold for lines (50%) not met: 1.95%
Jest: "global" coverage threshold for functions (50%) not met: 5.26%
Test Suites: 5 failed, 8 passed, 13 total
Tests:       85 passed, 85 total
Snapshots:   0 total
Time:        26.22 s
Ran all test suites.

```


### ESLint Code Quality
- **Status**: ✅ PASSED
- **Duration**: 9438ms



### TypeScript Type Checking
- **Status**: ✅ PASSED
- **Duration**: 13675ms



## Coverage Report
See coverage/index.html for detailed coverage report

---
*Generated by Automated Test Runner*
