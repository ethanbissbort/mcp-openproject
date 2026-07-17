#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { OpenProjectClient } from './openproject-client.js';
import type { CreatableRelationType, CustomFieldValues } from './types.js';

const server = new Server(
  {
    name: 'mcp-openproject',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const OPENPROJECT_URL = process.env.OPENPROJECT_URL;
const OPENPROJECT_API_KEY = process.env.OPENPROJECT_API_KEY;

if (!OPENPROJECT_URL || !OPENPROJECT_API_KEY) {
  console.error('Error: OPENPROJECT_URL and OPENPROJECT_API_KEY environment variables are required');
  process.exit(1);
}

// Validate URL format
try {
  const url = new URL(OPENPROJECT_URL);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    console.error('Error: OPENPROJECT_URL must use http:// or https:// protocol');
    process.exit(1);
  }
  // Warn if not using HTTPS
  if (url.protocol === 'http:') {
    console.error('Warning: Using HTTP instead of HTTPS is not recommended for security');
  }
} catch (error) {
  console.error('Error: OPENPROJECT_URL is not a valid URL');
  process.exit(1);
}

const client = new OpenProjectClient({
  baseUrl: OPENPROJECT_URL,
  apiKey: OPENPROJECT_API_KEY,
});

const tools: Tool[] = [
  {
    name: 'list_projects',
    description: 'List all projects in OpenProject. Supports filtering and pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        filters: {
          type: 'string',
          description: 'JSON filters for the query (e.g., [{"active":{"operator":"=","values":["true"]}}])',
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 20)',
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination (default: 1)',
        },
      },
    },
  },
  {
    name: 'get_project',
    description: 'Get details of a specific project by ID or identifier',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Project ID or identifier',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_project',
    description: 'Create a new project in OpenProject',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Project name',
        },
        identifier: {
          type: 'string',
          description: 'Project identifier (unique, lowercase, no spaces)',
        },
        description: {
          type: 'string',
          description: 'Project description (supports markdown)',
        },
        public: {
          type: 'boolean',
          description: 'Whether the project is public (default: false)',
        },
        parentId: {
          type: 'number',
          description: 'Parent project ID (for subprojects)',
        },
      },
      required: ['name', 'identifier'],
    },
  },
  {
    name: 'update_project',
    description: 'Update an existing project',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Project ID or identifier',
        },
        name: {
          type: 'string',
          description: 'New project name',
        },
        description: {
          type: 'string',
          description: 'New project description (supports markdown)',
        },
        public: {
          type: 'boolean',
          description: 'Whether the project is public',
        },
        active: {
          type: 'boolean',
          description: 'Whether the project is active',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_work_packages',
    description: 'List work packages (tasks/issues) in OpenProject. Supports filtering and pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        filters: {
          type: 'string',
          description: 'JSON filters (e.g., [{"status":{"operator":"o","values":[]}}] for open items)',
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 20)',
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination (default: 1)',
        },
      },
    },
  },
  {
    name: 'get_work_package',
    description: 'Get details of a specific work package by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Work package ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_work_package',
    description: 'Create a new work package (task/issue) in OpenProject. Supports setting a parent to create task hierarchies (e.g., create a parent epic, then create child tasks with parentId pointing to the epic).',
    inputSchema: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description: 'Work package subject/title',
        },
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
        typeId: {
          type: 'number',
          description: 'Work package type ID (e.g., Task, Bug, Feature)',
        },
        description: {
          type: 'string',
          description: 'Work package description (supports markdown)',
        },
        assigneeId: {
          type: 'number',
          description: 'User ID of assignee',
        },
        parentId: {
          type: 'number',
          description: 'Parent work package ID. Use this to create subtasks/child work packages under a parent task, epic, or feature.',
        },
        startDate: {
          type: 'string',
          description: 'Start date (YYYY-MM-DD format)',
        },
        dueDate: {
          type: 'string',
          description: 'Due date (YYYY-MM-DD format)',
        },
        customFields: {
          type: 'object',
          description:
            'Custom field values keyed by property name (e.g., {"customField1": "value"}). Raw values (string/number/boolean) are set directly; for list-type custom fields pass a link object like {"customField2": {"href": "/api/v3/custom_options/5"}} (or an array of such objects for multi-select). Use get_work_package_schema to discover available custom fields and their allowed values.',
          additionalProperties: true,
        },
      },
      required: ['subject', 'projectId'],
    },
  },
  {
    name: 'update_work_package',
    description: 'Update an existing work package. Supports re-parenting (moving a work package under a different parent) or removing from a parent.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Work package ID',
        },
        subject: {
          type: 'string',
          description: 'New subject/title',
        },
        description: {
          type: 'string',
          description: 'New description (supports markdown)',
        },
        assigneeId: {
          type: 'number',
          description: 'New assignee user ID',
        },
        parentId: {
          type: ['number', 'null'],
          description: 'New parent work package ID. Set to a work package ID to move under a parent, or set to null to remove from current parent (make top-level).',
        },
        startDate: {
          type: 'string',
          description: 'Start date (YYYY-MM-DD format)',
        },
        dueDate: {
          type: 'string',
          description: 'Due date (YYYY-MM-DD format)',
        },
        statusId: {
          type: 'number',
          description: 'Status ID',
        },
        percentageDone: {
          type: 'number',
          description: 'Percentage done (0-100)',
        },
        customFields: {
          type: 'object',
          description:
            'Custom field values keyed by property name (e.g., {"customField1": "value"}). Raw values (string/number/boolean) are set directly; for list-type custom fields pass a link object like {"customField2": {"href": "/api/v3/custom_options/5"}} (or an array of such objects for multi-select). Use get_work_package_schema to discover available custom fields and their allowed values.',
          additionalProperties: true,
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_work_package',
    description: 'Delete a work package by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Work package ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_users',
    description: 'List users in OpenProject. Supports filtering and pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        filters: {
          type: 'string',
          description: 'JSON filters for the query',
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 20)',
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination (default: 1)',
        },
      },
    },
  },
  {
    name: 'get_user',
    description: 'Get details of a specific user by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'User ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_time_entry',
    description: 'Create a time entry for a work package',
    inputSchema: {
      type: 'object',
      properties: {
        workPackageId: {
          type: 'number',
          description: 'Work package ID',
        },
        hours: {
          type: 'number',
          description: 'Hours spent (e.g., 2.5 for 2.5 hours)',
        },
        spentOn: {
          type: 'string',
          description: 'Date when time was spent (YYYY-MM-DD format)',
        },
        activityId: {
          type: 'number',
          description: 'Activity ID (optional)',
        },
        comment: {
          type: 'string',
          description: 'Comment about the time entry (supports markdown)',
        },
      },
      required: ['workPackageId', 'hours', 'spentOn'],
    },
  },
  {
    name: 'list_time_entries',
    description: 'List time entries. Supports filtering and pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        filters: {
          type: 'string',
          description: 'JSON filters for the query',
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 20)',
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination (default: 1)',
        },
      },
    },
  },
  {
    name: 'list_work_package_types',
    description: 'List all work package types (e.g., Task, Bug, Feature) available in OpenProject',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_work_package_type',
    description: 'Get details of a specific work package type by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Work package type ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_work_package_statuses',
    description: 'List all work package statuses (e.g., New, In Progress, Closed) available in OpenProject',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_work_package_status',
    description: 'Get details of a specific work package status by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Work package status ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_time_entry_activities',
    description: 'List all time entry activities (e.g., Development, Testing, Documentation)',
    inputSchema: {
      type: 'object',
      properties: {
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 20)',
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination (default: 1)',
        },
      },
    },
  },
  {
    name: 'get_time_entry_activity',
    description: 'Get details of a specific time entry activity by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Time entry activity ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_all_work_packages_in_project',
    description: 'Load ALL work packages for a project in a single call (handles pagination automatically). Use this for comprehensive project analysis instead of manually paginating through list_work_packages.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: ['string', 'number'],
          description: 'Project ID or identifier',
        },
        maxItems: {
          type: 'number',
          description: 'Maximum number of work packages to load (default: unlimited)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_project_overview',
    description: 'Get comprehensive project overview including ALL work packages and statistics. Perfect for "big picture" analysis, gap identification, and executive summaries. Returns project details, all work packages, and computed statistics (completion %, overdue count, by status/type/assignee breakdowns).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: ['string', 'number'],
          description: 'Project ID or identifier',
        },
        maxItems: {
          type: 'number',
          description: 'Maximum number of work packages to load (default: unlimited)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_work_package_relations',
    description: 'Get all relationships for a work package (blocks, blocked by, parent, children, relates to, etc.). Essential for understanding dependencies and identifying blockers.',
    inputSchema: {
      type: 'object',
      properties: {
        workPackageId: {
          type: ['string', 'number'],
          description: 'Work package ID',
        },
      },
      required: ['workPackageId'],
    },
  },
  {
    name: 'get_work_package_hierarchy',
    description: 'Get the complete parent-child hierarchy tree for a work package. Shows parent, all children, grandchildren, etc. Perfect for understanding project structure and work breakdown.',
    inputSchema: {
      type: 'object',
      properties: {
        workPackageId: {
          type: ['string', 'number'],
          description: 'Work package ID',
        },
        maxDepth: {
          type: 'number',
          description: 'Maximum depth to traverse (default: 10)',
        },
      },
      required: ['workPackageId'],
    },
  },
  {
    name: 'find_blocking_work_packages',
    description: 'Find all work packages that are blocking a specific work package. Quick way to identify what needs to be completed before this work package can proceed.',
    inputSchema: {
      type: 'object',
      properties: {
        workPackageId: {
          type: ['string', 'number'],
          description: 'Work package ID',
        },
      },
      required: ['workPackageId'],
    },
  },
  {
    name: 'list_work_package_activities',
    description: 'Get all activities for a work package including comments, status changes, field updates, and relationship changes. Returns chronological activity log.',
    inputSchema: {
      type: 'object',
      properties: {
        workPackageId: {
          type: ['string', 'number'],
          description: 'Work package ID',
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 20)',
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination (default: 1)',
        },
      },
      required: ['workPackageId'],
    },
  },
  {
    name: 'get_work_package_comments',
    description: 'Get all comments for a work package. Filters activities to only return those with comment content, excluding change history noise.',
    inputSchema: {
      type: 'object',
      properties: {
        workPackageId: {
          type: ['string', 'number'],
          description: 'Work package ID',
        },
      },
      required: ['workPackageId'],
    },
  },
  {
    name: 'list_roles',
    description: 'List all roles available in OpenProject. Use this to find role IDs needed when adding members to a project (typical built-in roles: Member, Reader, Project admin).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_role',
    description: 'Get details of a specific role by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Role ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_memberships',
    description: 'List project memberships (which users/groups belong to which projects, and their roles). Supports filtering and pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        filters: {
          type: 'string',
          description: 'JSON filters (e.g., [{"project":{"operator":"=","values":["123"]}}] to list members of project 123)',
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 20)',
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination (default: 1)',
        },
      },
    },
  },
  {
    name: 'get_membership',
    description: 'Get details of a specific membership by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Membership ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_membership',
    description: 'Add a user as a member of a project with one or more roles. Use list_roles to find role IDs (e.g., Member, Reader, Project admin).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
        userId: {
          type: 'number',
          description: 'User ID of the principal to add as a member',
        },
        roleIds: {
          type: 'array',
          items: {
            type: 'number',
          },
          description: 'Array of role IDs to assign to the member',
        },
        notificationMessage: {
          type: 'string',
          description: 'Optional notification message sent to the new member',
        },
      },
      required: ['projectId', 'userId', 'roleIds'],
    },
  },
  {
    name: 'update_membership',
    description: 'Update an existing membership, replacing its roles with a new set of roles',
    inputSchema: {
      type: 'object',
      properties: {
        membershipId: {
          type: 'string',
          description: 'Membership ID',
        },
        roleIds: {
          type: 'array',
          items: {
            type: 'number',
          },
          description: 'Array of role IDs that will replace the current roles',
        },
      },
      required: ['membershipId', 'roleIds'],
    },
  },
  {
    name: 'delete_membership',
    description: 'Remove a member from a project by deleting the membership',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Membership ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_versions',
    description: 'List all versions/milestones visible to the current user across all projects. Versions power the OpenProject Roadmap view and are ideal for phase tracking.',
    inputSchema: {
      type: 'object',
      properties: {
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 20)',
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination (default: 1)',
        },
      },
    },
  },
  {
    name: 'list_project_versions',
    description: 'List all versions/milestones available in a specific project (including shared versions from other projects). Versions power the Roadmap view and are useful for tracking project phases (e.g., Storage, Workshop, Housing, Farming, Beekeeping).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: ['string', 'number'],
          description: 'Project ID or identifier',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_version',
    description: 'Get details of a specific version/milestone by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Version ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_version',
    description: 'Create a new version/milestone in a project. Versions are OpenProject\'s mechanism behind the Roadmap view — use them to define project phases (e.g., Storage, Workshop, Housing, Farming, Beekeeping) and then assign work packages to them.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'ID of the project that defines this version',
        },
        name: {
          type: 'string',
          description: 'Version/milestone name (e.g., "Phase 1: Storage")',
        },
        description: {
          type: 'string',
          description: 'Version description (supports markdown)',
        },
        startDate: {
          type: 'string',
          description: 'Start date (YYYY-MM-DD format)',
        },
        endDate: {
          type: 'string',
          description: 'End date (YYYY-MM-DD format)',
        },
        status: {
          type: 'string',
          enum: ['open', 'locked', 'closed'],
          description: 'Version status (default: open)',
        },
        sharing: {
          type: 'string',
          description: 'Sharing mode: none, descendants, hierarchy, tree, or system (default: none)',
        },
      },
      required: ['projectId', 'name'],
    },
  },
  {
    name: 'update_version',
    description: 'Update an existing version/milestone (name, description, dates, status, sharing)',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Version ID',
        },
        name: {
          type: 'string',
          description: 'New version name',
        },
        description: {
          type: 'string',
          description: 'New description (supports markdown)',
        },
        startDate: {
          type: 'string',
          description: 'Start date (YYYY-MM-DD format)',
        },
        endDate: {
          type: 'string',
          description: 'End date (YYYY-MM-DD format)',
        },
        status: {
          type: 'string',
          enum: ['open', 'locked', 'closed'],
          description: 'Version status',
        },
        sharing: {
          type: 'string',
          description: 'Sharing mode: none, descendants, hierarchy, tree, or system',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_version',
    description: 'Delete a version/milestone by ID. Work packages assigned to it lose their version assignment.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Version ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'set_work_package_version',
    description: 'Assign a work package to a version/milestone so it appears in the Roadmap view. Handles the required lockVersion automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        workPackageId: {
          type: ['string', 'number'],
          description: 'Work package ID',
        },
        versionId: {
          type: 'number',
          description: 'Version ID to assign the work package to',
        },
      },
      required: ['workPackageId', 'versionId'],
    },
  },
  {
    name: 'delete_project',
    description: 'Delete a project by ID or identifier. WARNING: this PERMANENTLY deletes the project and ALL of its work packages, versions, time entries, and other data. This action cannot be undone — confirm with the user before calling.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Project ID or identifier',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_time_entry',
    description: 'Update an existing time entry (hours, date, comment, activity)',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Time entry ID',
        },
        hours: {
          type: 'number',
          description: 'Hours spent (e.g., 2.5 for 2.5 hours)',
        },
        spentOn: {
          type: 'string',
          description: 'Date when time was spent (YYYY-MM-DD format)',
        },
        comment: {
          type: 'string',
          description: 'Comment about the time entry (supports markdown)',
        },
        activityId: {
          type: 'number',
          description: 'Activity ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_time_entry',
    description: 'Delete a time entry by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Time entry ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_relation',
    description:
      'Create a relation (dependency/link) between two work packages, e.g. follows/precedes for scheduling dependencies or blocks/blocked for blockers. The relation goes FROM one work package TO another; for example type "follows" means the "from" work package follows (starts after) the "to" work package.',
    inputSchema: {
      type: 'object',
      properties: {
        fromId: {
          type: 'number',
          description: 'ID of the work package the relation originates from',
        },
        toId: {
          type: 'number',
          description: 'ID of the work package the relation points to',
        },
        type: {
          type: 'string',
          enum: [
            'relates',
            'duplicates',
            'duplicated',
            'blocks',
            'blocked',
            'precedes',
            'follows',
            'includes',
            'partof',
            'requires',
            'required',
          ],
          description: 'Relation type',
        },
        description: {
          type: 'string',
          description: 'Optional description of the relation',
        },
        lag: {
          type: 'number',
          description:
            'Delay in working days between the two work packages (only meaningful for precedes/follows relations)',
        },
      },
      required: ['fromId', 'toId', 'type'],
    },
  },
  {
    name: 'update_relation',
    description:
      'Update an existing relation between work packages (change its type, description, or lag). Use get_work_package_relations to find relation IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        relationId: {
          type: ['string', 'number'],
          description: 'Relation ID',
        },
        type: {
          type: 'string',
          enum: [
            'relates',
            'duplicates',
            'duplicated',
            'blocks',
            'blocked',
            'precedes',
            'follows',
            'includes',
            'partof',
            'requires',
            'required',
          ],
          description: 'New relation type',
        },
        description: {
          type: 'string',
          description: 'New description of the relation',
        },
        lag: {
          type: 'number',
          description:
            'New delay in working days (only meaningful for precedes/follows relations)',
        },
      },
      required: ['relationId'],
    },
  },
  {
    name: 'delete_relation',
    description:
      'Delete a relation between work packages by relation ID. Use get_work_package_relations to find relation IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        relationId: {
          type: ['string', 'number'],
          description: 'Relation ID',
        },
      },
      required: ['relationId'],
    },
  },
  {
    name: 'set_work_package_parent',
    description:
      'Set or remove the parent of a work package (hierarchy management). Handles lockVersion automatically. Set parentId to a work package ID to move it under that parent, or omit/set parentId to null to remove the current parent (make it top-level).',
    inputSchema: {
      type: 'object',
      properties: {
        workPackageId: {
          type: ['string', 'number'],
          description: 'Work package ID to re-parent',
        },
        parentId: {
          type: ['number', 'null'],
          description:
            'Parent work package ID, or null to remove the current parent',
        },
      },
      required: ['workPackageId'],
    },
  },
  {
    name: 'get_work_package_schema',
    description:
      'Get the work package schema for a project/type combination. Lists all available fields (including custom fields like customField1) with their types, names, whether they are required/writable, and allowed values. Use this to discover which custom fields exist before setting them via create_work_package or update_work_package.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
        typeId: {
          type: 'number',
          description: 'Work package type ID',
        },
      },
      required: ['projectId', 'typeId'],
    },
  },
  {
    name: 'add_work_package_comment',
    description: 'Add a comment to a work package. The comment supports markdown formatting and appears in the work package activity stream.',
    inputSchema: {
      type: 'object',
      properties: {
        workPackageId: {
          type: ['string', 'number'],
          description: 'Work package ID',
        },
        comment: {
          type: 'string',
          description: 'Comment text (supports markdown)',
        },
        notify: {
          type: 'boolean',
          description: 'Whether to send notifications to watchers (default: true). Set to false to suppress notifications.',
        },
      },
      required: ['workPackageId', 'comment'],
    },
  },
  {
    name: 'list_work_package_attachments',
    description: 'List all attachments (files) on a work package. Returns file names, sizes, content types, and download locations.',
    inputSchema: {
      type: 'object',
      properties: {
        workPackageId: {
          type: ['string', 'number'],
          description: 'Work package ID',
        },
      },
      required: ['workPackageId'],
    },
  },
  {
    name: 'upload_work_package_attachment',
    description: 'Upload a file attachment to a work package. File content must be provided as a base64-encoded string.',
    inputSchema: {
      type: 'object',
      properties: {
        workPackageId: {
          type: ['string', 'number'],
          description: 'Work package ID',
        },
        fileName: {
          type: 'string',
          description: 'Name of the file (e.g., "report.pdf")',
        },
        fileContentBase64: {
          type: 'string',
          description: 'File content encoded as base64',
        },
        contentType: {
          type: 'string',
          description: 'MIME type of the file (default: application/octet-stream)',
        },
        description: {
          type: 'string',
          description: 'Optional description of the attachment',
        },
      },
      required: ['workPackageId', 'fileName', 'fileContentBase64'],
    },
  },
  {
    name: 'delete_attachment',
    description: 'Delete an attachment by its attachment ID (not the work package ID).',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: ['string', 'number'],
          description: 'Attachment ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_queries',
    description: 'List saved queries in OpenProject. Saved queries are the "saved views" shown in the OpenProject UI sidebar (custom-filtered work package views). Supports filtering and pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        filters: {
          type: 'string',
          description: 'JSON filters for the query (e.g., [{"project":{"operator":"=","values":["1"]}}])',
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 20)',
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination (default: 1)',
        },
      },
    },
  },
  {
    name: 'get_query',
    description: 'Get details of a specific saved query (saved view) by ID, including its filters, columns, sort order, and grouping.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: ['string', 'number'],
          description: 'Query ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_query',
    description: 'Create a saved query (saved view) in OpenProject. Saved queries appear as custom views in the OpenProject UI. Can be scoped to a project or global.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the saved query/view',
        },
        projectId: {
          type: ['string', 'number'],
          description: 'Project ID to scope the query to. Omit for a global query.',
        },
        filters: {
          type: 'string',
          description: 'JSON array of filters in OpenProject query filter format (e.g., [{"status":{"operator":"o","values":[]}}] for open items)',
        },
        groupBy: {
          type: 'string',
          description: 'Attribute to group results by (e.g., "status", "assignee", "type")',
        },
        sortBy: {
          type: 'string',
          description: 'JSON array of sort criteria (e.g., [["id","asc"]] or [["dueDate","desc"]])',
        },
        timelineVisible: {
          type: 'boolean',
          description: 'Whether the timeline (Gantt) view is visible (default: false)',
        },
        public: {
          type: 'boolean',
          description: 'Whether the query is visible to all users (default: false)',
        },
        starred: {
          type: 'boolean',
          description: 'Whether the query is starred/favorited (default: false)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'delete_query',
    description: 'Delete a saved query (saved view) by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: ['string', 'number'],
          description: 'Query ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_wiki_page',
    description: 'Get a wiki page by its numeric ID. Note: the OpenProject API v3 only supports reading a wiki page by its numeric ID; listing wiki pages or looking them up by title/slug is not supported by the API.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: ['string', 'number'],
          description: 'Numeric wiki page ID',
        },
      },
      required: ['id'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args = {} } = request.params;

    switch (name) {
      case 'list_projects': {
        const result = await client.listProjects({
          filters: args?.filters as string | undefined,
          pageSize: args?.pageSize as number | undefined,
          offset: args?.offset as number | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_project': {
        const result = await client.getProject(args.id as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'create_project': {
        const result = await client.createProject({
          name: args.name as string,
          identifier: args.identifier as string,
          description: args.description as string | undefined,
          public: args.public as boolean | undefined,
          parentId: args.parentId as number | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'update_project': {
        const result = await client.updateProject(args.id as string, {
          name: args.name as string | undefined,
          description: args.description as string | undefined,
          public: args.public as boolean | undefined,
          active: args.active as boolean | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_work_packages': {
        const result = await client.listWorkPackages({
          filters: args?.filters as string | undefined,
          pageSize: args?.pageSize as number | undefined,
          offset: args?.offset as number | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_work_package': {
        const result = await client.getWorkPackage(args.id as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'create_work_package': {
        const result = await client.createWorkPackage({
          subject: args.subject as string,
          projectId: args.projectId as number,
          typeId: args.typeId as number | undefined,
          description: args.description as string | undefined,
          assigneeId: args.assigneeId as number | undefined,
          parentId: args.parentId as number | undefined,
          startDate: args.startDate as string | undefined,
          dueDate: args.dueDate as string | undefined,
          customFields: args.customFields as CustomFieldValues | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'update_work_package': {
        const result = await client.updateWorkPackage(args.id as string, {
          subject: args.subject as string | undefined,
          description: args.description as string | undefined,
          assigneeId: args.assigneeId as number | undefined,
          parentId: args.parentId as number | null | undefined,
          startDate: args.startDate as string | undefined,
          dueDate: args.dueDate as string | undefined,
          statusId: args.statusId as number | undefined,
          percentageDone: args.percentageDone as number | undefined,
          customFields: args.customFields as CustomFieldValues | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'delete_work_package': {
        await client.deleteWorkPackage(args.id as string);
        return {
          content: [
            {
              type: 'text',
              text: `Work package ${args.id} deleted successfully`,
            },
          ],
        };
      }

      case 'list_users': {
        const result = await client.listUsers({
          filters: args?.filters as string | undefined,
          pageSize: args?.pageSize as number | undefined,
          offset: args?.offset as number | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_user': {
        const result = await client.getUser(args.id as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'create_time_entry': {
        const result = await client.createTimeEntry({
          workPackageId: args.workPackageId as number,
          hours: args.hours as number,
          spentOn: args.spentOn as string,
          activityId: args.activityId as number | undefined,
          comment: args.comment as string | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_time_entries': {
        const result = await client.listTimeEntries({
          filters: args?.filters as string | undefined,
          pageSize: args?.pageSize as number | undefined,
          offset: args?.offset as number | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_work_package_types': {
        const result = await client.listWorkPackageTypes();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_work_package_type': {
        const result = await client.getWorkPackageType(args.id as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_work_package_statuses': {
        const result = await client.listWorkPackageStatuses();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_work_package_status': {
        const result = await client.getWorkPackageStatus(args.id as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_time_entry_activities': {
        const result = await client.listTimeEntryActivities({
          pageSize: args?.pageSize as number | undefined,
          offset: args?.offset as number | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_time_entry_activity': {
        const result = await client.getTimeEntryActivity(args.id as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_all_work_packages_in_project': {
        const result = await client.getAllWorkPackagesInProject(
          args.projectId as string | number,
          {
            maxItems: args.maxItems as number | undefined,
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_project_overview': {
        const result = await client.getProjectOverview(
          args.projectId as string | number,
          {
            maxItems: args.maxItems as number | undefined,
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_work_package_relations': {
        const result = await client.getWorkPackageRelations(args.workPackageId as string | number);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_work_package_hierarchy': {
        const result = await client.getWorkPackageHierarchy(
          args.workPackageId as string | number,
          args.maxDepth as number | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'find_blocking_work_packages': {
        const result = await client.getAllBlockingRelations(args.workPackageId as string | number);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_work_package_activities': {
        const result = await client.listWorkPackageActivities(
          args.workPackageId as string | number,
          {
            pageSize: args.pageSize as number | undefined,
            offset: args.offset as number | undefined,
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_work_package_comments': {
        const result = await client.getWorkPackageComments(args.workPackageId as string | number);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_roles': {
        const result = await client.listRoles();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_role': {
        const result = await client.getRole(args.id as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_memberships': {
        const result = await client.listMemberships({
          filters: args?.filters as string | undefined,
          pageSize: args?.pageSize as number | undefined,
          offset: args?.offset as number | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_membership': {
        const result = await client.getMembership(args.id as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'create_membership': {
        const result = await client.createMembership({
          projectId: args.projectId as number,
          userId: args.userId as number,
          roleIds: args.roleIds as number[],
          notificationMessage: args.notificationMessage as string | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'update_membership': {
        const result = await client.updateMembership(String(args.membershipId), {
          roleIds: args.roleIds as number[],
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'delete_membership': {
        await client.deleteMembership(args.id as string);
        return {
          content: [
            {
              type: 'text',
              text: `Membership ${args.id} deleted successfully`,
            },
          ],
        };
      }

      case 'list_versions': {
        const result = await client.listVersions({
          pageSize: args?.pageSize as number | undefined,
          offset: args?.offset as number | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_project_versions': {
        const result = await client.listProjectVersions(args.projectId as string | number);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_version': {
        const result = await client.getVersion(args.id as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'create_version': {
        const result = await client.createVersion({
          projectId: args.projectId as number,
          name: args.name as string,
          description: args.description as string | undefined,
          startDate: args.startDate as string | undefined,
          endDate: args.endDate as string | undefined,
          status: args.status as 'open' | 'locked' | 'closed' | undefined,
          sharing: args.sharing as string | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'update_version': {
        const result = await client.updateVersion(args.id as string, {
          name: args.name as string | undefined,
          description: args.description as string | undefined,
          startDate: args.startDate as string | undefined,
          endDate: args.endDate as string | undefined,
          status: args.status as 'open' | 'locked' | 'closed' | undefined,
          sharing: args.sharing as string | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'delete_version': {
        await client.deleteVersion(args.id as string);
        return {
          content: [
            {
              type: 'text',
              text: `Version ${args.id} deleted successfully`,
            },
          ],
        };
      }

      case 'set_work_package_version': {
        const result = await client.setWorkPackageVersion(
          args.workPackageId as string | number,
          args.versionId as number
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'delete_project': {
        await client.deleteProject(args.id as string);
        return {
          content: [
            {
              type: 'text',
              text: `Project ${args.id} deleted successfully`,
            },
          ],
        };
      }

      case 'update_time_entry': {
        const result = await client.updateTimeEntry(args.id as string, {
          hours: args.hours as number | undefined,
          spentOn: args.spentOn as string | undefined,
          comment: args.comment as string | undefined,
          activityId: args.activityId as number | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'delete_time_entry': {
        await client.deleteTimeEntry(args.id as string);
        return {
          content: [
            {
              type: 'text',
              text: `Time entry ${args.id} deleted successfully`,
            },
          ],
        };
      }

      case 'create_relation': {
        const result = await client.createRelation({
          fromId: args.fromId as number,
          toId: args.toId as number,
          type: args.type as CreatableRelationType,
          description: args.description as string | undefined,
          lag: args.lag as number | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'update_relation': {
        const result = await client.updateRelation(
          args.relationId as string | number,
          {
            type: args.type as CreatableRelationType | undefined,
            description: args.description as string | undefined,
            lag: args.lag as number | undefined,
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'delete_relation': {
        await client.deleteRelation(args.relationId as string | number);
        return {
          content: [
            {
              type: 'text',
              text: `Relation ${args.relationId} deleted successfully`,
            },
          ],
        };
      }

      case 'set_work_package_parent': {
        const result = await client.setWorkPackageParent(
          args.workPackageId as string | number,
          (args.parentId ?? null) as number | null
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_work_package_schema': {
        const result = await client.getWorkPackageSchema(
          args.projectId as number,
          args.typeId as number
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'add_work_package_comment': {
        const result = await client.addWorkPackageComment(
          args.workPackageId as string | number,
          args.comment as string,
          args.notify as boolean | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_work_package_attachments': {
        const result = await client.listWorkPackageAttachments(
          args.workPackageId as string | number
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'upload_work_package_attachment': {
        const result = await client.uploadWorkPackageAttachment({
          workPackageId: args.workPackageId as string | number,
          fileName: args.fileName as string,
          fileContentBase64: args.fileContentBase64 as string,
          contentType: args.contentType as string | undefined,
          description: args.description as string | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'delete_attachment': {
        await client.deleteAttachment(args.id as string | number);
        return {
          content: [
            {
              type: 'text',
              text: `Attachment ${args.id} deleted successfully`,
            },
          ],
        };
      }

      case 'list_queries': {
        const result = await client.listQueries({
          filters: args?.filters as string | undefined,
          pageSize: args?.pageSize as number | undefined,
          offset: args?.offset as number | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_query': {
        const result = await client.getQuery(args.id as string | number);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'create_query': {
        const result = await client.createQuery({
          name: args.name as string,
          projectId: args.projectId as string | number | undefined,
          filters: args.filters !== undefined
            ? (JSON.parse(args.filters as string) as unknown[])
            : undefined,
          groupBy: args.groupBy as string | undefined,
          sortBy: args.sortBy !== undefined
            ? (JSON.parse(args.sortBy as string) as unknown[])
            : undefined,
          timelineVisible: args.timelineVisible as boolean | undefined,
          public: args.public as boolean | undefined,
          starred: args.starred as boolean | undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'delete_query': {
        await client.deleteQuery(args.id as string | number);
        return {
          content: [
            {
              type: 'text',
              text: `Query ${args.id} deleted successfully`,
            },
          ],
        };
      }

      case 'get_wiki_page': {
        const result = await client.getWikiPage(args.id as string | number);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('OpenProject MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
