#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { OpenProjectClient } from './openproject-client.js';

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
    description: 'Create a new work package (task/issue) in OpenProject',
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
        startDate: {
          type: 'string',
          description: 'Start date (YYYY-MM-DD format)',
        },
        dueDate: {
          type: 'string',
          description: 'Due date (YYYY-MM-DD format)',
        },
      },
      required: ['subject', 'projectId'],
    },
  },
  {
    name: 'update_work_package',
    description: 'Update an existing work package',
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
          startDate: args.startDate as string | undefined,
          dueDate: args.dueDate as string | undefined,
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
          startDate: args.startDate as string | undefined,
          dueDate: args.dueDate as string | undefined,
          statusId: args.statusId as number | undefined,
          percentageDone: args.percentageDone as number | undefined,
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
