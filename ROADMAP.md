# Roadmap to Agentic-Level MCP Connector

**Goal**: Enable Claude to perform high-level strategic analysis and planning assistance for OpenProject projects.

**Current State**: Phase 1 Complete - Enhanced Data Access ✅
**Target State**: Strategic analysis, gap identification, executive summaries, and planning assistance 🎯

**Progress**:
- ✅ Phase 1: Enhanced Data Access (Foundation) - **COMPLETE**
- 🔄 Phase 2: Rich Querying & Filtering - **NEXT**
- ⏸️ Phase 3: Analytics & Aggregation - Pending
- ⏸️ Phase 4: Strategic Analysis Tools - Pending

---

## Phase 1: Enhanced Data Access (Foundation) ✅ COMPLETE

**Priority**: CRITICAL
**Estimated Effort**: 2-3 days
**Dependencies**: None
**Status**: ✅ **COMPLETED** (2026-01-06)

### 1.1 Bulk Data Loading ✅

**Status**: ✅ COMPLETE

**Problem**: Currently requires manual pagination (20 items at a time) to load all work packages.

**Solution**: Add efficient bulk loading tools.

**Implementation**:
- [x] Add `get_all_work_packages_in_project` tool ✅
  - File: `src/openproject-client.ts`, `src/index.ts`
  - Automatically handles pagination
  - Loads all work packages for a project in one call
  - Returns comprehensive array with embedded data
  - Complexity: Moderate

- [x] Add `get_project_overview` tool ✅
  - File: `src/openproject-client.ts`, `src/index.ts`
  - Single call to get project + all work packages + metadata
  - Pre-aggregates key statistics
  - Complexity: Moderate

- [x] Add configurable page size (up to 100 items) ✅
  - File: `src/openproject-client.ts`
  - Update all list methods to support larger page sizes
  - Complexity: Simple

**Verification**:
- [x] Can load 500+ work packages in reasonable time ✅
- [x] Memory usage remains acceptable ✅
- [x] Build succeeds ✅

### 1.2 Relationship & Hierarchy Access ✅

**Status**: ✅ COMPLETE

**Problem**: No way to see dependencies, parent/child relationships, or work package hierarchies.

**Solution**: Add relationship traversal capabilities.

**Implementation**:
- [x] Add `get_work_package_relations` method ✅
  - File: `src/openproject-client.ts`
  - Endpoint: `/api/v3/work_packages/{id}/relations`
  - Returns: blocks, blocked_by, relates_to, parent, children
  - Complexity: Moderate

- [x] Add `RelationType` and `Relation` interfaces ✅
  - File: `src/types.ts`
  - Define relation types (blocks, parent, relates, etc.)
  - Complexity: Simple

- [x] Add `get_work_package_relations` tool ✅
  - File: `src/index.ts`
  - Complexity: Simple

- [x] Add `get_work_package_hierarchy` tool ✅
  - File: `src/openproject-client.ts`, `src/index.ts`
  - Recursively loads parent and children
  - Returns tree structure with depth limiting
  - Complexity: Complex

- [x] Add `find_blocking_work_packages` tool ✅
  - File: `src/index.ts`
  - Quick identification of blockers
  - Complexity: Simple

**Verification**:
- [x] Can identify blocking dependencies ✅
- [x] Can traverse parent-child hierarchies ✅
- [x] Build succeeds ✅

### 1.3 Activity & History Access ✅

**Status**: ✅ COMPLETE

**Problem**: No access to comments, discussions, or change history.

**Solution**: Add activity and comment retrieval.

**Implementation**:
- [x] Add `Activity` interface ✅
  - File: `src/types.ts`
  - Include user, timestamp, changes, notes, comment content
  - Complexity: Moderate

- [x] Add `listWorkPackageActivities` method ✅
  - File: `src/openproject-client.ts`
  - Endpoint: `/api/v3/work_packages/{id}/activities`
  - Returns chronological activity log
  - Complexity: Moderate

- [x] Add `list_work_package_activities` tool ✅
  - File: `src/index.ts`
  - Exposes activity history to Claude
  - Complexity: Simple

- [x] Add `get_work_package_comments` tool ✅
  - File: `src/index.ts`
  - Filters activities to comments only
  - Complexity: Simple

**Verification**:
- [x] Can read comment threads ✅
- [x] Can see change history ✅
- [x] Build succeeds ✅

### 1.4 Custom Fields Support ✅

**Status**: ✅ COMPLETE

**Problem**: Many organizations use custom fields for critical data (priority, risk, etc.).

**Solution**: Add custom field access.

**Implementation**:
- [x] Extend `WorkPackage` interface with custom fields ✅
  - File: `src/types.ts`
  - Added index signature `[key: string]: unknown`
  - Supports all custom field types dynamically
  - Complexity: Simple

- [x] No API client changes needed ✅
  - Custom fields already included in OpenProject API v3 responses
  - All existing tools automatically support custom fields

**Verification**:
- [x] Custom fields accessible in work package data ✅
- [x] All custom field types supported (via dynamic typing) ✅
- [x] Build succeeds ✅

**Achievement**: Phase 1 establishes complete data access foundation for agentic capabilities! 🎉

---

## Phase 2: Rich Querying & Filtering (Usability)

**Priority**: HIGH
**Estimated Effort**: 2-3 days
**Dependencies**: Phase 1.1

### 2.1 Type-Safe Query Builder

**Problem**: Current filters are JSON strings, requiring low-level API knowledge.

**Solution**: Create intuitive, type-safe query builder.

**Implementation**:
- [ ] Add `QueryBuilder` class
  - File: `src/query-builder.ts` (new file)
  - Fluent API: `query.where('status', 'open').and('assignee', userId)`
  - Compiles to OpenProject filter JSON
  - Complexity: Complex

- [ ] Add common query presets
  - File: `src/query-builder.ts`
  - `openWorkPackages()`, `myAssignedTasks()`, `overdueTasks()`, etc.
  - Complexity: Moderate

- [ ] Update list methods to accept QueryBuilder
  - File: `src/openproject-client.ts`
  - Accept both string filters and QueryBuilder objects
  - Complexity: Moderate

- [ ] Add `search_work_packages` tool with natural language hints
  - File: `src/index.ts`
  - Provide examples of common queries in description
  - Complexity: Simple

**Verification**:
- [ ] Can create complex queries without JSON knowledge
- [ ] Query builder produces correct filter JSON
- [ ] Build succeeds

### 2.2 Full-Text Search

**Problem**: No way to search across work packages by text content.

**Solution**: Add search functionality.

**Implementation**:
- [ ] Add `searchWorkPackages` method
  - File: `src/openproject-client.ts`
  - Endpoint: `/api/v3/work_packages?filters=[{"subjectOrId":{"operator":"**","values":["search term"]}}]`
  - Search subject, description, and comments
  - Complexity: Moderate

- [ ] Add `search_work_packages` tool
  - File: `src/index.ts`
  - Simple text search interface
  - Complexity: Simple

**Verification**:
- [ ] Can find work packages by keyword
- [ ] Search covers subject and description
- [ ] Build succeeds

---

## Phase 3: Analytics & Aggregation (Intelligence)

**Priority**: HIGH
**Estimated Effort**: 3-4 days
**Dependencies**: Phase 1.1, Phase 1.2

### 3.1 Project Statistics

**Problem**: No aggregated metrics or summaries.

**Solution**: Add comprehensive analytics tools.

**Implementation**:
- [ ] Add `ProjectStatistics` interface
  - File: `src/types.ts`
  - Total work packages, by status, by type, by assignee
  - Completion percentage, overdue count
  - Date range metrics
  - Complexity: Moderate

- [ ] Add `getProjectStatistics` method
  - File: `src/openproject-client.ts`
  - Loads all work packages and computes statistics
  - Caches results for performance
  - Complexity: Complex

- [ ] Add `get_project_statistics` tool
  - File: `src/index.ts`
  - Returns comprehensive project metrics
  - Complexity: Simple

- [ ] Add `get_project_health` tool
  - File: `src/index.ts`
  - Analyzes overdue tasks, blocked items, unassigned work
  - Returns health score and issues
  - Complexity: Moderate

**Verification**:
- [ ] Statistics are accurate
- [ ] Performance is acceptable for large projects (500+ work packages)
- [ ] Build succeeds

### 3.2 Timeline & Milestone Analysis

**Problem**: No visibility into project timeline, milestones, or schedule.

**Solution**: Add timeline analysis capabilities.

**Implementation**:
- [ ] Add `Version` interface for milestones/releases
  - File: `src/types.ts`
  - Include dates, status, associated work packages
  - Complexity: Simple

- [ ] Add version/milestone API methods
  - File: `src/openproject-client.ts`
  - `listVersions`, `getVersion`
  - Endpoint: `/api/v3/versions`
  - Complexity: Moderate

- [ ] Add `list_versions` and `get_version` tools
  - File: `src/index.ts`
  - Complexity: Simple

- [ ] Add `get_project_timeline` tool
  - File: `src/index.ts`
  - Returns chronological view of work packages and milestones
  - Identifies schedule risks
  - Complexity: Moderate

**Verification**:
- [ ] Can see all versions/milestones
- [ ] Timeline shows correct ordering
- [ ] Build succeeds

### 3.3 Resource & Workload Analysis

**Problem**: No visibility into team capacity, workload distribution, or bottlenecks.

**Solution**: Add resource analysis tools.

**Implementation**:
- [ ] Add `WorkloadAnalysis` interface
  - File: `src/types.ts`
  - Per-user: assigned count, estimated hours, overdue count
  - Complexity: Simple

- [ ] Add `getWorkloadAnalysis` method
  - File: `src/openproject-client.ts`
  - Analyzes work distribution across team
  - Identifies overloaded users
  - Complexity: Complex

- [ ] Add `get_workload_analysis` tool
  - File: `src/index.ts`
  - Returns team workload breakdown
  - Complexity: Simple

**Verification**:
- [ ] Workload data is accurate
- [ ] Can identify resource bottlenecks
- [ ] Build succeeds

---

## Phase 4: Strategic Analysis Tools (Agentic Capabilities)

**Priority**: CRITICAL (for agentic use)
**Estimated Effort**: 3-5 days
**Dependencies**: Phases 1, 2, 3

### 4.1 Gap Analysis

**Problem**: Claude can't identify missing or incomplete planning.

**Solution**: Add planning completeness analysis.

**Implementation**:
- [ ] Add `GapAnalysis` interface
  - File: `src/types.ts`
  - Missing fields, incomplete descriptions, unlinked dependencies
  - Complexity: Moderate

- [ ] Add `analyzeProjectGaps` method
  - File: `src/openproject-client.ts`
  - Checks for:
    - Work packages without assignees
    - Work packages without estimates
    - Work packages without dates
    - Orphaned work packages (no parent, no relations)
    - Versions without work packages
    - Blocked work packages with no resolution
  - Complexity: Complex

- [ ] Add `analyze_project_gaps` tool
  - File: `src/index.ts`
  - Returns actionable list of planning gaps
  - Complexity: Simple

**Verification**:
- [ ] Identifies real planning gaps
- [ ] Provides actionable recommendations
- [ ] Build succeeds

### 4.2 Executive Summary Generator

**Problem**: Claude can't create high-level project summaries.

**Solution**: Add comprehensive summary tool.

**Implementation**:
- [ ] Add `ExecutiveSummary` interface
  - File: `src/types.ts`
  - Project overview, status, risks, key metrics
  - Complexity: Moderate

- [ ] Add `generateExecutiveSummary` method
  - File: `src/openproject-client.ts`
  - Combines statistics, timeline, risks, and gaps
  - Produces structured summary data
  - Complexity: Complex

- [ ] Add `get_executive_summary` tool
  - File: `src/index.ts`
  - Returns comprehensive project overview
  - Claude can format naturally from structured data
  - Complexity: Simple

**Verification**:
- [ ] Summary includes all key project aspects
- [ ] Claude can produce readable executive summaries
- [ ] Build succeeds

### 4.3 Dependency & Risk Visualization

**Problem**: Can't identify critical paths, blockers, or schedule risks.

**Solution**: Add dependency and risk analysis.

**Implementation**:
- [ ] Add `DependencyGraph` interface
  - File: `src/types.ts`
  - Nodes (work packages) and edges (relations)
  - Complexity: Moderate

- [ ] Add `buildDependencyGraph` method
  - File: `src/openproject-client.ts`
  - Constructs full project dependency graph
  - Identifies critical path
  - Detects circular dependencies
  - Complexity: Complex

- [ ] Add `RiskAnalysis` interface
  - File: `src/types.ts`
  - Schedule risks, resource risks, dependency risks
  - Complexity: Moderate

- [ ] Add `analyze_project_risks` tool
  - File: `src/index.ts`
  - Returns identified risks with severity
  - Complexity: Simple

- [ ] Add `get_critical_path` tool
  - File: `src/index.ts`
  - Returns work packages on critical path
  - Complexity: Simple

**Verification**:
- [ ] Critical path is correctly identified
- [ ] Risks are relevant and actionable
- [ ] Build succeeds

### 4.4 Progress Tracking & Forecasting

**Problem**: Can't track velocity or forecast completion dates.

**Solution**: Add progress tracking and forecasting.

**Implementation**:
- [ ] Add `ProgressMetrics` interface
  - File: `src/types.ts`
  - Burn-down data, velocity, forecast dates
  - Complexity: Moderate

- [ ] Add `getProgressMetrics` method
  - File: `src/openproject-client.ts`
  - Calculates completion velocity
  - Forecasts completion date based on current pace
  - Complexity: Complex

- [ ] Add `get_progress_metrics` tool
  - File: `src/index.ts`
  - Returns progress and forecast data
  - Complexity: Simple

**Verification**:
- [ ] Velocity calculations are accurate
- [ ] Forecasts are reasonable
- [ ] Build succeeds

---

## Phase 5: Advanced Context & Collaboration (Nice-to-Have)

**Priority**: MEDIUM
**Estimated Effort**: 2-3 days
**Dependencies**: Phase 1

### 5.1 Document & Wiki Access

**Problem**: Can't read project documentation, wikis, or attached files.

**Solution**: Add document retrieval.

**Implementation**:
- [ ] Add `Attachment` interface
  - File: `src/types.ts`
  - File metadata, download URL, description
  - Complexity: Simple

- [ ] Add attachment listing methods
  - File: `src/openproject-client.ts`
  - `listWorkPackageAttachments`, `getAttachmentMetadata`
  - Endpoint: `/api/v3/work_packages/{id}/attachments`
  - Complexity: Moderate

- [ ] Add `list_attachments` tool
  - File: `src/index.ts`
  - Returns list of attached files
  - Complexity: Simple

- [ ] Add wiki page access (if available in OpenProject API)
  - File: `src/openproject-client.ts`
  - Endpoint: `/api/v3/projects/{id}/wiki_pages` (check API docs)
  - Complexity: Moderate

**Verification**:
- [ ] Can list attachments
- [ ] Can retrieve attachment metadata
- [ ] Build succeeds

### 5.2 Notification & Mention Access

**Problem**: Can't see who's involved in discussions or important updates.

**Solution**: Add notification and mention tracking.

**Implementation**:
- [ ] Add `listNotifications` method
  - File: `src/openproject-client.ts`
  - Endpoint: `/api/v3/notifications`
  - Returns recent notifications
  - Complexity: Moderate

- [ ] Add `list_notifications` tool
  - File: `src/index.ts`
  - Complexity: Simple

**Verification**:
- [ ] Can retrieve notifications
- [ ] Build succeeds

---

## Phase 6: Optimization & Performance

**Priority**: MEDIUM
**Estimated Effort**: 2-3 days
**Dependencies**: All previous phases

### 6.1 Caching Layer

**Problem**: Repeated API calls for same data waste time and API quota.

**Solution**: Add intelligent caching.

**Implementation**:
- [ ] Add `CacheManager` class
  - File: `src/cache.ts` (new file)
  - TTL-based caching for relatively static data
  - Invalidation on mutations
  - Complexity: Complex

- [ ] Integrate cache into OpenProjectClient
  - File: `src/openproject-client.ts`
  - Cache project metadata, users, types, statuses
  - Don't cache frequently-changing data (work packages, activities)
  - Complexity: Moderate

**Verification**:
- [ ] API calls reduced for cached data
- [ ] Cache invalidation works correctly
- [ ] Build succeeds

### 6.2 Batch Request Optimization

**Problem**: Multiple sequential API calls are slow.

**Solution**: Batch requests where possible.

**Implementation**:
- [ ] Add `batchGet` method
  - File: `src/openproject-client.ts`
  - Load multiple work packages in parallel
  - Use Promise.all for concurrent requests
  - Complexity: Moderate

- [ ] Update bulk loading tools to use batching
  - File: `src/openproject-client.ts`
  - Complexity: Moderate

**Verification**:
- [ ] Bulk operations are faster
- [ ] No rate limiting issues
- [ ] Build succeeds

---

## Phase 7: Natural Language Interface (Future)

**Priority**: LOW
**Estimated Effort**: 3-5 days
**Dependencies**: Phases 1-4

### 7.1 Semantic Tool Descriptions

**Problem**: Claude needs better context to choose right tools.

**Solution**: Enhance tool descriptions with use cases.

**Implementation**:
- [ ] Enhance all tool descriptions
  - File: `src/index.ts`
  - Add "When to use" and "Example scenarios"
  - Complexity: Simple

### 7.2 Conversational Query Interface

**Problem**: Users need to know exact tool names.

**Solution**: Add natural language query parsing (future enhancement).

**Implementation**:
- [ ] Add `query_project` meta-tool
  - File: `src/index.ts`
  - Takes natural language question
  - Routes to appropriate specialized tools
  - Complexity: Complex

---

## Success Metrics

After implementing all phases, Claude should be able to:

- ✅ **Executive Summary**: "Give me an executive summary of project X"
  - Required: Phases 1, 3, 4.2

- ✅ **Gap Analysis**: "What's missing in the planning for project X?"
  - Required: Phases 1, 2, 4.1

- ✅ **Big Picture**: "What does this project aim to accomplish and how is it going?"
  - Required: Phases 1, 3, 4.2

- ✅ **Risk Identification**: "What are the biggest risks to this project?"
  - Required: Phases 1, 3, 4.3

- ✅ **Resource Planning**: "Is the team overloaded? Who needs help?"
  - Required: Phases 1, 3.3

- ✅ **Schedule Forecasting**: "When will this project finish based on current velocity?"
  - Required: Phases 1, 3, 4.4

- ✅ **Dependency Analysis**: "What's blocking work package #42?"
  - Required: Phases 1.2, 4.3

---

## Implementation Priority

**Minimum Viable Agentic Capability** (Phases 1-3):
1. Phase 1.1: Bulk Data Loading (MUST HAVE)
2. Phase 1.2: Relationship Access (MUST HAVE)
3. Phase 3.1: Project Statistics (MUST HAVE)
4. Phase 4.2: Executive Summary (MUST HAVE)

**Full Agentic Capability** (All of Phases 1-4):
- Complete Phases 1-4 in order
- Skip Phase 5 unless specific need arises
- Phase 6 for performance at scale
- Phase 7 is future enhancement

---

## Estimated Total Effort

- **Minimum Viable**: 5-7 days
- **Full Capability**: 15-20 days
- **Complete (including nice-to-have)**: 20-25 days

---

**Last Updated**: 2026-01-06
**Current Phase**: Phase 0 (Basic CRUD) ✅ COMPLETE
