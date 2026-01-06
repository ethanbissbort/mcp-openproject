# MCP OpenProject Connector

A Model Context Protocol (MCP) server that provides integration with OpenProject, enabling AI assistants to interact with your OpenProject instance for project management, work package tracking, time entries, and more.

## Features

This MCP server provides tools to:

- **Projects**: List, get, create, and update projects
- **Work Packages**: List, get, create, update, and delete work packages (tasks/issues)
- **Work Package Relationships**: Access dependencies, hierarchies, and blocking relationships
- **Work Package Types**: List and get work package types (Task, Bug, Feature, etc.)
- **Work Package Statuses**: List and get work package statuses (New, In Progress, Closed, etc.)
- **Users**: List and get user information
- **Time Entries**: Create and list time tracking entries
- **Time Entry Activities**: List and get time entry activities (Development, Testing, etc.)
- **Bulk Operations & Analytics**: Load entire projects with statistics for comprehensive analysis

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd mcp-openproject
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

1. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

2. Configure your OpenProject credentials:
```env
OPENPROJECT_URL=https://your-openproject-instance.com
OPENPROJECT_API_KEY=your_api_key_here
```

### Getting Your API Key

1. Log in to your OpenProject instance
2. Go to your account settings (click your avatar → "My account")
3. Navigate to "Access tokens"
4. Create a new API access token
5. Copy the token and add it to your `.env` file

## Usage

### Running the Server

Start the MCP server:
```bash
npm start
```

Or run in development mode with auto-rebuild:
```bash
npm run dev
```

### Configuring with Claude Desktop

Add the server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "openproject": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-openproject/dist/index.js"],
      "env": {
        "OPENPROJECT_URL": "https://your-openproject-instance.com",
        "OPENPROJECT_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Available Tools

### Projects

#### list_projects
List all projects in OpenProject with optional filtering and pagination.

**Parameters**:
- `filters` (string, optional): JSON filters for the query
- `pageSize` (number, optional): Number of results per page (default: 20)
- `offset` (number, optional): Offset for pagination (default: 1)

#### get_project
Get details of a specific project.

**Parameters**:
- `id` (string, required): Project ID or identifier

#### create_project
Create a new project.

**Parameters**:
- `name` (string, required): Project name
- `identifier` (string, required): Project identifier (unique, lowercase, no spaces)
- `description` (string, optional): Project description (supports markdown)
- `public` (boolean, optional): Whether the project is public (default: false)
- `parentId` (number, optional): Parent project ID for subprojects

#### update_project
Update an existing project.

**Parameters**:
- `id` (string, required): Project ID or identifier
- `name` (string, optional): New project name
- `description` (string, optional): New description (supports markdown)
- `public` (boolean, optional): Whether the project is public
- `active` (boolean, optional): Whether the project is active

### Work Packages

#### list_work_packages
List work packages (tasks/issues) with optional filtering and pagination.

**Parameters**:
- `filters` (string, optional): JSON filters (e.g., for open items: `[{"status":{"operator":"o","values":[]}}]`)
- `pageSize` (number, optional): Number of results per page (default: 20)
- `offset` (number, optional): Offset for pagination (default: 1)

#### get_work_package
Get details of a specific work package.

**Parameters**:
- `id` (string, required): Work package ID

#### create_work_package
Create a new work package (task/issue).

**Parameters**:
- `subject` (string, required): Work package subject/title
- `projectId` (number, required): Project ID
- `typeId` (number, optional): Work package type ID
- `description` (string, optional): Description (supports markdown)
- `assigneeId` (number, optional): User ID of assignee
- `startDate` (string, optional): Start date (YYYY-MM-DD format)
- `dueDate` (string, optional): Due date (YYYY-MM-DD format)

#### update_work_package
Update an existing work package.

**Parameters**:
- `id` (string, required): Work package ID
- `subject` (string, optional): New subject/title
- `description` (string, optional): New description (supports markdown)
- `assigneeId` (number, optional): New assignee user ID
- `startDate` (string, optional): Start date (YYYY-MM-DD format)
- `dueDate` (string, optional): Due date (YYYY-MM-DD format)
- `statusId` (number, optional): Status ID
- `percentageDone` (number, optional): Percentage done (0-100)

#### delete_work_package
Delete a work package.

**Parameters**:
- `id` (string, required): Work package ID

### Users

#### list_users
List users with optional filtering and pagination.

**Parameters**:
- `filters` (string, optional): JSON filters for the query
- `pageSize` (number, optional): Number of results per page (default: 20)
- `offset` (number, optional): Offset for pagination (default: 1)

#### get_user
Get details of a specific user.

**Parameters**:
- `id` (string, required): User ID

### Time Entries

#### create_time_entry
Create a time entry for a work package.

**Parameters**:
- `workPackageId` (number, required): Work package ID
- `hours` (number, required): Hours spent (e.g., 2.5 for 2.5 hours)
- `spentOn` (string, required): Date when time was spent (YYYY-MM-DD format)
- `activityId` (number, optional): Activity ID
- `comment` (string, optional): Comment about the time entry (supports markdown)

#### list_time_entries
List time entries with optional filtering and pagination.

**Parameters**:
- `filters` (string, optional): JSON filters for the query
- `pageSize` (number, optional): Number of results per page (default: 20)
- `offset` (number, optional): Offset for pagination (default: 1)

### Work Package Types

#### list_work_package_types
List all work package types (e.g., Task, Bug, Feature) available in OpenProject.

**Parameters**: None

#### get_work_package_type
Get details of a specific work package type.

**Parameters**:
- `id` (string, required): Work package type ID

### Work Package Statuses

#### list_work_package_statuses
List all work package statuses (e.g., New, In Progress, Closed) available in OpenProject.

**Parameters**: None

#### get_work_package_status
Get details of a specific work package status.

**Parameters**:
- `id` (string, required): Work package status ID

### Time Entry Activities

#### list_time_entry_activities
List all time entry activities (e.g., Development, Testing, Documentation).

**Parameters**:
- `pageSize` (number, optional): Number of results per page (default: 20)
- `offset` (number, optional): Offset for pagination (default: 1)

#### get_time_entry_activity
Get details of a specific time entry activity.

**Parameters**:
- `id` (string, required): Time entry activity ID

### Bulk Operations & Analytics

#### get_all_work_packages_in_project
Load ALL work packages for a project in a single call (handles pagination automatically).

**Use this instead of manually paginating through `list_work_packages` for comprehensive project analysis.**

**Parameters**:
- `projectId` (string|number, required): Project ID or identifier
- `maxItems` (number, optional): Maximum number of work packages to load (default: unlimited)

**Returns**: Array of all work packages in the project

#### get_project_overview
Get comprehensive project overview including ALL work packages and statistics.

**Perfect for "big picture" analysis, gap identification, and executive summaries.**

**Parameters**:
- `projectId` (string|number, required): Project ID or identifier
- `maxItems` (number, optional): Maximum number of work packages to load (default: unlimited)

**Returns**: Object containing:
- `project`: Full project details
- `workPackages`: Array of all work packages
- `statistics`: Computed project statistics including:
  - Total work packages
  - Breakdown by status (New, In Progress, Closed, etc.)
  - Breakdown by type (Task, Bug, Feature, etc.)
  - Breakdown by assignee
  - Completion percentage (average)
  - Overdue count
  - Unassigned count
- `loadedAt`: Timestamp when data was loaded
- `totalCount`: Total number of work packages loaded

### Work Package Relationships & Dependencies

#### get_work_package_relations
Get all relationships for a work package (blocks, blocked by, parent, children, relates to, etc.).

**Essential for understanding dependencies and identifying blockers in your project.**

**Parameters**:
- `workPackageId` (string|number, required): Work package ID

**Returns**: Collection of relations with details about:
- Relation type (blocks, blocked, precedes, follows, relates, duplicates, parent, children)
- Source and target work packages
- Relation metadata

#### get_work_package_hierarchy
Get the complete parent-child hierarchy tree for a work package.

**Perfect for understanding the full context of a task within its epic/feature/story hierarchy.**

**Parameters**:
- `workPackageId` (string|number, required): Work package ID
- `maxDepth` (number, optional): Maximum depth to traverse (default: 10)

**Returns**: Hierarchical structure containing:
- `workPackage`: The target work package
- `parent`: Parent work package hierarchy (if exists)
- `children`: Array of child work package hierarchies
- `depth`: Current depth in the hierarchy
- `relations`: All relations for this work package

#### find_blocking_work_packages
Find all work packages that are blocking a specific work package.

**Quick way to identify what needs to be completed before a task can proceed.**

**Parameters**:
- `workPackageId` (string|number, required): Work package ID

**Returns**: Array of work packages that are blocking the specified work package

## Example Usage

Once configured with Claude Desktop, you can ask Claude to:

- "List all active projects in OpenProject"
- "Create a new project called 'Website Redesign' with identifier 'web-redesign'"
- "Show me all open work packages in project 5"
- "Create a new task in project 3 with subject 'Fix login bug'"
- "Update work package 42 to set it as 50% complete"
- "Log 3.5 hours of work on task 15 for today"
- "List all users in the system"
- "What work package types are available?"
- "Show me all work package statuses"
- "List all time entry activities"

### Advanced Analytical Tasks (NEW - Bulk Operations & Relationships)

With the new bulk loading, analytics, and relationship tools, you can now ask Claude for high-level insights:

**Project Overview & Analytics:**
- "Give me an executive summary of the 'Website Redesign' project"
- "What's the overall status of project 5? How many tasks are complete?"
- "Show me all work packages in project 3 and identify any gaps in planning"
- "Which team members have the most assigned tasks in project 2?"
- "What percentage of tasks are overdue in the Q1 Launch project?"
- "Load all work packages for project 'mobile-app' and analyze the workload distribution"

**Dependency Analysis & Risk Management (NEW):**
- "What work packages are blocking task #42?"
- "Show me the full hierarchy of work package #15"
- "Find all blockers for the 'User Authentication' feature"
- "What tasks are dependent on completing work package #28?"
- "Show me all relationships for task #50 to understand its dependencies"
- "Is there a critical path issue in the project? Which tasks are blocking others?"

## Development

### Building

```bash
npm run build
```

### Watch Mode

For development with auto-rebuild on file changes:
```bash
npm run watch
```

## API Documentation

This connector uses the OpenProject API v3. For more information about the API:
- [OpenProject API Documentation](https://www.openproject.org/docs/api/)
- [API Introduction](https://www.openproject.org/docs/api/introduction/)

## License

MIT
