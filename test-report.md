
# Automated Test Report
Generated: 2025-11-08T19:35:44.655Z

## Summary
- **Total Suites**: 7
- **Passed**: 3 ✅
- **Failed**: 4 ❌
- **Success Rate**: 42.86%
- **Total Duration**: 31.75s

## Test Results


### Security Tests (Auth, IDOR, Rate Limiting)
- **Status**: ✅ PASSED
- **Duration**: 3353ms



### API Endpoint Tests (Assets, Subscriptions, Users)
- **Status**: ✅ PASSED
- **Duration**: 3430ms



### Unit Tests (Components, Utilities)
- **Status**: ✅ PASSED
- **Duration**: 5438ms



### Integration Tests (End-to-End Flows)
- **Status**: ❌ FAILED
- **Duration**: 2550ms
- **Error**: ```
Command failed: npm run test __tests__/integration

```


### Test Coverage Analysis
- **Status**: ❌ FAILED
- **Duration**: 8723ms
- **Error**: ```
PASS src/lib/__tests__/csv-utils.test.ts
  CSV Utilities
    formatDateForCSV
      √ should format date to dd/mm/yyyy for CSV (3 ms)
      √ should handle string dates (1 ms)
      √ should return empty string for null
      √ should return empty string for invalid dates (1 ms)
    formatCurrencyForCSV
      √ should format currency as string (1 ms)
      √ should handle zero
      √ should return empty string for null (1 ms)
      √ should handle negative numbers (4 ms)

PASS __tests__/api/assets.test.ts
  Assets API Tests
    GET /api/assets
      √ should return 401 if not authenticated (3 ms)
      √ should return assets for authenticated user (2 ms)
      √ should support pagination (1 ms)
      √ should support search filtering
      √ should support status filtering (1 ms)
    POST /api/assets
      √ should return 401 if not authenticated
      √ should return 401 if not admin
      √ should create asset with valid data (1 ms)
      √ should validate required fields
      √ should prevent duplicate asset tags (1 ms)
    GET /api/assets/[id]
      √ should return 401 if not authenticated
      √ should return 403 if user tries to access another user's asset (1 ms)
      √ should return asset if user is owner
      √ should return asset if user is admin (1 ms)
      √ should return 404 if asset not found
    GET /api/assets/export
      √ should require admin role
      √ should be rate limited

PASS __tests__/security/auth.test.ts
  Authentication Security Tests
    Session Authentication
      √ should reject requests without a session (2 ms)
      √ should allow requests with valid session (1 ms)
      √ should verify admin role for admin endpoints
    Role-Based Access Control
      √ should allow ADMIN to access admin resources (1 ms)
      √ should deny EMPLOYEE access to admin resources
      √ should allow VALIDATOR to access validator resources (1 ms)
    Session Expiration
      √ should detect expired sessions (1 ms)
      √ should detect valid sessions

PASS __tests__/api/subscriptions.test.ts
  Subscriptions API Tests
    GET /api/subscriptions
      √ should return 401 if not authenticated (2 ms)
      √ should return subscriptions for authenticated user (1 ms)
    GET /api/subscriptions/[id]
      √ should return 401 if not authenticated
      √ should return 403 if user tries to access another user's subscription (2 ms)
      √ should return subscription if user is owner (1 ms)
      √ should return subscription if user is admin (1 ms)
    POST /api/subscriptions
      √ should require admin role (1 ms)
      √ should create subscription with valid data (1 ms)
    Cost Calculations
      √ should calculate monthly cost correctly
      √ should calculate monthly cost from yearly billing
    Renewal Date Calculations
      √ should calculate next renewal date for monthly subscription (1 ms)
      √ should calculate next renewal date for yearly subscription

PASS src/lib/__tests__/utils-renewal-date.test.ts
  Renewal Date Utilities
    getNextRenewalDate
      √ should return future date as-is if already in future (3 ms)
      √ should calculate next monthly renewal for past date (1 ms)
      √ should calculate next yearly renewal for past date (1 ms)
      √ should handle ONE_TIME billing cycle
      √ should return null for null input
    isRenewalOverdue
      √ should return true for past dates (1 ms)
      √ should return false for future dates
      √ should return false for null (1 ms)
    getDaysUntilRenewal
      √ should return positive number for future dates
      √ should return negative number for past dates
      √ should return null for null input (1 ms)

PASS __tests__/security/idor.test.ts
  IDOR (Insecure Direct Object Reference) Security Tests
    Asset Access Control
      √ should allow admin to access any asset (2 ms)
      √ should prevent employee from accessing another user's asset (1 ms)
      √ should allow employee to access their own asset (1 ms)
    Subscription Access Control
      √ should prevent employee from accessing another user's subscription (6 ms)
      √ should allow employee to access their own subscription (1 ms)
    Authorization Logic
      √ should correctly implement authorization check (1 ms)
    URL Parameter Tampering
      √ should detect resource ID tampering attempt (1 ms)
      √ should allow access to owned resource

PASS src/lib/__tests__/date-format.test.ts
  Date Formatting Utilities
    formatDate
      √ should format date to "DD Mon YYYY" format (16 ms)
      √ should handle null dates
      √ should handle undefined dates (1 ms)
      √ should handle string dates (1 ms)
      √ should handle invalid dates
    formatDateTime
      √ should format date with time (1 ms)
      √ should handle null dates (1 ms)
      √ should handle undefined dates
      √ should handle invalid dates (1 ms)

PASS __tests__/security/rate-limit.test.ts
  Rate Limiting Security Tests
    Rate Limit Logic
      √ should simulate rate limit bucket logic (2 ms)
      √ should detect when limit is exceeded (1 ms)
      √ should reset window after time expires (1 ms)
    IP Extraction Logic
      √ should extract first IP from x-forwarded-for (1 ms)
      √ should handle single IP in x-forwarded-for
      √ should handle empty x-forwarded-for (1 ms)
    Rate Limit Configuration
      √ should use default rate limit values (1 ms)
      √ should return 429 status when rate limit exceeded
    Rate Limit Response Headers
      √ should include rate limit headers in response (1 ms)
    Rate Limit Security Concepts
      √ should validate rate limit bypass prevention (1 ms)
      √ should have fallback for missing IP
      √ should support concurrent request tracking (1 ms)

Jest: "global" coverage threshold for statements (50%) not met: 2.06%
Jest: "global" coverage threshold for branches (50%) not met: 31.97%
Jest: "global" coverage threshold for lines (50%) not met: 2.06%
Jest: "global" coverage threshold for functions (50%) not met: 5.38%
Test Suites: 8 passed, 8 total
Tests:       85 passed, 85 total
Snapshots:   0 total
Time:        6.102 s
Ran all test suites.

```


### ESLint Code Quality
- **Status**: ❌ FAILED
- **Duration**: 4811ms
- **Error**: ```
'true' is not recognized as an internal or external command,
operable program or batch file.

```


### TypeScript Type Checking
- **Status**: ❌ FAILED
- **Duration**: 3434ms
- **Error**: ```
'true' is not recognized as an internal or external command,
operable program or batch file.

```


## Coverage Report
See coverage/index.html for detailed coverage report

---
*Generated by Automated Test Runner*
