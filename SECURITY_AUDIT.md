# MCP OpenProject Connector - Security & Code Quality Audit Report

**Date**: 2026-01-06
**Auditor**: Claude (Sonnet 4.5)
**Scope**: Comprehensive codebase audit focusing on security, type safety, error handling, and code quality

---

## Executive Summary

This report documents a comprehensive security and code quality audit of the MCP OpenProject connector. The audit identified **47 issues** across security, type safety, error handling, and code quality categories.

**Critical Findings**: 3 security/reliability vulnerabilities that could lead to data exposure or system failures
**High Priority**: 7 issues affecting stability and maintainability
**Medium Priority**: 15 code quality and documentation issues
**Low Priority**: 22 minor improvements

### Immediate Actions Taken

✅ **FIXED** - Critical API injection vulnerability in filter construction
✅ **FIXED** - Unreliable URL parsing causing silent failures

### Remaining Work

The following critical and high-priority issues still require attention:

- ⚠️ **Missing input validation on tool parameters** (CRITICAL)
- ⚠️ Type safety issues with `any` types (HIGH)
- ⚠️ Missing parameter validation in client methods (HIGH)
- ⚠️ No timeout on fetch requests (HIGH)
- ⚠️ Unhandled Promise rejections (HIGH)
- ⚠️ Weak error reporting (HIGH)

---

## Critical Issues (3 Total)

### ✅ Issue #1: API Injection Vulnerability [FIXED]

**Severity**: CRITICAL
**Category**: Security
**Status**: ✅ RESOLVED
**File**: `src/openproject-client.ts`, Line 417

**Original Code**:
```typescript
const filter = `[{"project":{"operator":"=","values":["${projectId}"]}}]`;
queryParams.set('filters', filter);
```

**Vulnerability**: String interpolation without escaping could allow filter injection through malicious `projectId` values.

**Attack Vector**:
```typescript
projectId = '5"]} extra injection {"field'
// Results in: [{"project":{"operator":"=","values":["5"]} extra injection {"field"]}}]
```

**Fix Applied**:
```typescript
// Use proper JSON serialization to prevent injection
const filter = JSON.stringify([{
  project: {
    operator: "=",
    values: [projectId.toString()]
  }
}]);
queryParams.set('filters', filter);
```

**Impact**: Prevents potential unauthorized data access or filter manipulation attacks.

---

### ✅ Issue #2: Unreliable URL Parsing [FIXED]

**Severity**: CRITICAL
**Category**: Reliability
**Status**: ✅ RESOLVED
**Files**: `src/openproject-client.ts`, Lines 548, 569, 604, 618, 639, 653

**Original Code Pattern**:
```typescript
const parentId = href.split('/').pop();
// Could return undefined or empty string on malformed URLs
```

**Problems**:
- Fails on URLs with trailing slashes
- Returns empty strings on malformed input
- No validation of extracted IDs
- Silent failures propagate

**Fix Applied**:
```typescript
/**
 * Safely extract ID from OpenProject HAL+JSON href URL
 */
private extractIdFromHref(href: string): string | null {
  if (!href || typeof href !== 'string') {
    return null;
  }

  try {
    const url = href.startsWith('http') ? new URL(href) : new URL(href, 'http://dummy.local');
    const segments = url.pathname.split('/').filter(Boolean);
    const id = segments[segments.length - 1];

    return id && id.length > 0 ? id : null;
  } catch (error) {
    console.warn(`Failed to extract ID from href: ${href}`, error);
    return null;
  }
}

// Usage in 6 locations:
const childIds = childRelations
  .map((rel) => this.extractIdFromHref(rel._links.to.href))
  .filter((id): id is string => id !== null);
```

**Impact**: Prevents silent failures when loading work package hierarchies and relationships.

---

### ⚠️ Issue #3: Missing Input Validation on Tool Parameters

**Severity**: CRITICAL
**Category**: Input Validation
**Status**: ⚠️ NOT YET FIXED
**File**: `src/index.ts`, Lines 565-950

**Problem**: Tool parameters are cast to types without validation:

```typescript
case 'get_project': {
  const result = await client.getProject(args.id as string);
  // args.id could be undefined, will cause runtime error
}

case 'create_work_package': {
  const result = await client.createWorkPackage({
    subject: args.subject as string, // May not exist
    projectId: args.projectId as number, // Type cast without validation
  });
}
```

**Risks**:
- Undefined values passed to API methods
- Type coercion failures at runtime
- Invalid API requests
- No user-friendly error messages

**Recommended Fix** (NOT YET APPLIED):
```typescript
case 'get_project': {
  if (!args.id || typeof args.id !== 'string') {
    return {
      content: [{
        type: 'text',
        text: 'Error: id parameter must be a non-empty string'
      }],
      isError: true
    };
  }
  const result = await client.getProject(args.id);
  // ...
}
```

**OR** use a validation library like `zod`:
```typescript
import { z } from 'zod';

const GetProjectSchema = z.object({
  id: z.string().min(1, 'Project ID is required')
});

try {
  const validated = GetProjectSchema.parse(args);
  const result = await client.getProject(validated.id);
} catch (error) {
  if (error instanceof z.ZodError) {
    return {
      content: [{
        type: 'text',
        text: `Validation error: ${error.errors.map(e => e.message).join(', ')}`
      }],
      isError: true
    };
  }
  throw error;
}
```

**Effort**: 8-12 hours to add validation to all 27 tools

---

## High Severity Issues (7 Total)

### Issue #4: Unsafe Type Casting with `any`

**Severity**: HIGH
**Category**: Type Safety
**Status**: ⚠️ NOT YET FIXED
**Files**: `src/openproject-client.ts`, Lines 126, 162, 210, 259, 344

**Problem**: Using `any` type bypasses TypeScript's type checking

```typescript
const payload: any = {
  name: data.name,
  identifier: data.identifier,
  public: data.public ?? false,
};
```

**Affected Methods**:
- `createProject()` (line 126)
- `updateProject()` (line 162)
- `createWorkPackage()` (line 210)
- `updateWorkPackage()` (line 259)
- `createTimeEntry()` (line 344)

**Recommended Fix**:
```typescript
interface CreateProjectPayload {
  name: string;
  identifier: string;
  public: boolean;
  description?: {
    format: 'markdown';
    raw: string;
  };
  _links?: {
    parent?: {
      href: string;
    };
  };
}

const payload: CreateProjectPayload = {
  name: data.name,
  identifier: data.identifier,
  public: data.public ?? false,
};
```

**Effort**: 4-6 hours to create typed interfaces and replace all `any` types

---

### Issue #5: Missing Parameter Validation in Client Methods

**Severity**: HIGH
**Category**: Input Validation
**Status**: ⚠️ NOT YET FIXED

**Problem**: No validation of `filters`, `pageSize`, or `offset` parameters

```typescript
async listProjects(params?: {
  filters?: string;
  pageSize?: number;
  offset?: number;
}): Promise<Collection<Project>> {
  const queryParams = new URLSearchParams();
  if (params?.filters) queryParams.set('filters', params.filters);
  // filters not validated as JSON
  if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
  // pageSize not validated to be 1-100
}
```

**Recommended Fix**:
```typescript
if (params?.pageSize) {
  const pageSize = Number(params.pageSize);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new Error('pageSize must be between 1 and 100');
  }
  queryParams.set('pageSize', pageSize.toString());
}

if (params?.filters) {
  try {
    JSON.parse(params.filters); // Validate JSON
  } catch (e) {
    throw new Error('filters must be valid JSON');
  }
  queryParams.set('filters', params.filters);
}
```

**Effort**: 2-3 hours to add validation to all list methods

---

### Issue #6: No Timeout on Fetch Requests

**Severity**: HIGH
**Category**: Resource Management
**Status**: ⚠️ NOT YET FIXED

**Problem**: Fetch requests can hang indefinitely

```typescript
const response = await fetch(url, {
  ...options,
  headers: {
    'Authorization': this.authHeader,
    'Content-Type': 'application/json',
    ...options.headers,
  },
}); // No timeout - could hang forever
```

**Recommended Fix**:
```typescript
private async request<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${this.baseUrl}/api/v3${endpoint}`;
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    // ... rest of code
  } finally {
    clearTimeout(timeoutId);
  }
}
```

**Effort**: 1-2 hours to implement timeout handling

---

### Issue #7: Unhandled Promise Rejections

**Severity**: HIGH
**Category**: Error Handling
**Status**: ⚠️ NOT YET FIXED

**Problem**: `Promise.all` fails completely if any promise rejects

```typescript
const [project, workPackages] = await Promise.all([
  this.getProject(projectId.toString()),
  this.getAllWorkPackagesInProject(projectId, options),
]);
// If either fails, entire operation fails
```

**Recommended Fix**:
```typescript
const [projectResult, workPackagesResult] = await Promise.allSettled([
  this.getProject(projectId.toString()),
  this.getAllWorkPackagesInProject(projectId, options),
]);

if (projectResult.status === 'rejected') {
  throw new Error(`Failed to load project: ${projectResult.reason}`);
}

const project = projectResult.value;
const workPackages = workPackagesResult.status === 'fulfilled'
  ? workPackagesResult.value
  : [];

if (workPackagesResult.status === 'rejected') {
  console.warn('Failed to load work packages:', workPackagesResult.reason);
}
```

**Effort**: 2-3 hours to replace all Promise.all with Promise.allSettled where appropriate

---

## Medium Severity Issues (Selected)

### Issue #9: Query Parameter Building Code Duplication

**Problem**: Same pattern repeated 5+ times across different methods

**Recommended Fix**: Create helper method
```typescript
private buildQueryString(params?: Record<string, string | number | undefined>): string {
  if (!params) return '';
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.set(key, String(value));
    }
  });
  const query = queryParams.toString();
  return query ? `?${query}` : '';
}
```

**Effort**: 1 hour

---

### Issue #13: No JSDoc Documentation

**Problem**: No IDE hints or parameter documentation

**Recommended Fix**: Add JSDoc to all public methods
```typescript
/**
 * Retrieve all projects visible to the authenticated user.
 *
 * @param params - Optional parameters for filtering and pagination
 * @param params.filters - OpenProject API filter JSON string
 * @param params.pageSize - Number of results per page (1-100, default: 20)
 * @param params.offset - Pagination offset, starts at 1
 * @returns Collection of projects
 * @throws Error if API request fails
 *
 * @example
 * const projects = await client.listProjects({ pageSize: 50 });
 */
async listProjects(params?: {...}): Promise<Collection<Project>> {
  // ...
}
```

**Effort**: 4-6 hours for all methods

---

## Low Severity Issues (Selected)

### Issue #18: TypeScript Strict Mode Has Unsafe Fallbacks

```typescript
export interface ErrorResponse {
  _type: string;
  errorIdentifier: string;
  message: string;
  details?: any;  // Should be Record<string, unknown>
}
```

**Fix**: Replace `any` with `Record<string, unknown>` or `unknown`

---

## Testing Recommendations

After implementing fixes, comprehensive testing should include:

1. **Unit Tests**:
   - Test input validation logic
   - Test URL extraction with various formats
   - Test timeout handling
   - Test error handling paths

2. **Integration Tests**:
   - Test with live OpenProject instance
   - Test with invalid credentials
   - Test with malformed API responses
   - Test with slow/unresponsive server

3. **Security Tests**:
   - Attempt filter injection attacks
   - Test with malicious input in all fields
   - Verify no sensitive data logged

---

## Implementation Priority

### Phase 1: Security & Safety (Immediate)
1. ✅ Fix API injection vulnerability - DONE
2. ✅ Fix URL parsing - DONE
3. ⚠️ Add input validation to tools - TODO (8-12 hours)

### Phase 2: Stability (High Priority)
4. Replace `any` types - TODO (4-6 hours)
5. Add parameter validation - TODO (2-3 hours)
6. Add fetch timeouts - TODO (1-2 hours)
7. Handle Promise rejections - TODO (2-3 hours)

### Phase 3: Code Quality (Medium Priority)
8. Extract query building helper - TODO (1 hour)
9. Add JSDoc documentation - TODO (4-6 hours)
10. Improve error reporting - TODO (2-3 hours)

### Phase 4: Polish (Low Priority)
11. Add comprehensive tool schemas - TODO (2-3 hours)
12. Improve logging - TODO (1-2 hours)
13. Add environment validation - TODO (1 hour)

**Total Estimated Effort**: 32-44 hours

---

## Conclusion

The MCP OpenProject connector has a solid foundation but requires security hardening before production use. The two critical vulnerabilities that have been fixed eliminate injection attacks and URL parsing failures.

The remaining critical issue (input validation) and high-priority issues should be addressed to ensure stability and proper error handling. The connector will then be production-ready with good type safety and reliability.

**Current Status**: 2 of 3 critical issues resolved, connector is safer but not yet production-ready.

**Next Steps**:
1. Implement input validation on all tools
2. Add fetch timeouts
3. Replace remaining `any` types
4. Add comprehensive tests

---

## Appendix: Files Modified

### src/openproject-client.ts
- Added `extractIdFromHref()` helper method (lines 99-121)
- Fixed filter injection in `getAllWorkPackagesInProject()` (line 417)
- Updated 6 locations using URL parsing:
  - `getWorkPackageChildren()` (line 546-548)
  - `getWorkPackageParent()` (line 567)
  - `getWorkPackageHierarchy()` parent loading (line 603)
  - `getWorkPackageHierarchy()` children loading (line 615-617)
  - `getAllBlockingRelations()` (line 635-637)
  - `getAllBlockedRelations()` (line 651-653)

### Changes Summary
- Lines added: ~30
- Lines modified: ~20
- Security vulnerabilities fixed: 2/3
- Build status: ✅ Passing

