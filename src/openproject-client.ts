import type {
  OpenProjectConfig,
  Project,
  WorkPackage,
  WorkPackageType,
  WorkPackageStatus,
  User,
  TimeEntry,
  TimeEntryActivity,
  Collection,
  ErrorResponse,
  BulkLoadOptions,
  ProjectOverview,
  ProjectStatistics,
} from './types.js';

export class OpenProjectClient {
  private baseUrl: string;
  private apiKey: string;
  private authHeader: string;

  constructor(config: OpenProjectConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.authHeader = 'Basic ' + Buffer.from(`apikey:${this.apiKey}`).toString('base64');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v3${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json() as ErrorResponse;
          errorMessage = errorData.message || errorMessage;
        } else {
          const textError = await response.text();
          errorMessage = textError || errorMessage;
        }
      } catch {
        // If parsing fails, use status text
      }
      throw new Error(`OpenProject API error (${response.status}): ${errorMessage}`);
    }

    // Handle empty responses (e.g., from DELETE)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  private async fetchAllPages<T>(
    fetchPage: (offset: number, pageSize: number) => Promise<Collection<T>>,
    options?: BulkLoadOptions
  ): Promise<T[]> {
    const maxItems = options?.maxItems || Infinity;
    const pageSize = Math.min(options?.pageSize || 100, 100); // OpenProject max is 100
    const allItems: T[] = [];
    let offset = 1;
    let hasMore = true;

    while (hasMore && allItems.length < maxItems) {
      const collection = await fetchPage(offset, pageSize);
      allItems.push(...collection._embedded.elements);

      // Check if there are more pages
      hasMore = collection.total > allItems.length;
      offset += pageSize;

      // Respect maxItems limit
      if (allItems.length >= maxItems) {
        return allItems.slice(0, maxItems);
      }
    }

    return allItems;
  }

  async listProjects(params?: {
    filters?: string;
    pageSize?: number;
    offset?: number;
  }): Promise<Collection<Project>> {
    const queryParams = new URLSearchParams();
    if (params?.filters) queryParams.set('filters', params.filters);
    if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());

    const query = queryParams.toString();
    return this.request<Collection<Project>>(
      `/projects${query ? '?' + query : ''}`
    );
  }

  async getProject(id: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}`);
  }

  async createProject(data: {
    name: string;
    identifier: string;
    description?: string;
    public?: boolean;
    parentId?: number;
  }): Promise<Project> {
    const payload: any = {
      name: data.name,
      identifier: data.identifier,
      public: data.public ?? false,
    };

    if (data.description) {
      payload.description = {
        format: 'markdown',
        raw: data.description,
      };
    }

    if (data.parentId) {
      payload._links = {
        parent: {
          href: `/api/v3/projects/${data.parentId}`,
        },
      };
    }

    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateProject(
    id: string,
    data: {
      name?: string;
      description?: string;
      public?: boolean;
      active?: boolean;
    }
  ): Promise<Project> {
    const payload: any = {};

    if (data.name !== undefined) payload.name = data.name;
    if (data.public !== undefined) payload.public = data.public;
    if (data.active !== undefined) payload.active = data.active;

    if (data.description !== undefined) {
      payload.description = {
        format: 'markdown',
        raw: data.description,
      };
    }

    return this.request<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async listWorkPackages(params?: {
    filters?: string;
    pageSize?: number;
    offset?: number;
  }): Promise<Collection<WorkPackage>> {
    const queryParams = new URLSearchParams();
    if (params?.filters) queryParams.set('filters', params.filters);
    if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());

    const query = queryParams.toString();
    return this.request<Collection<WorkPackage>>(
      `/work_packages${query ? '?' + query : ''}`
    );
  }

  async getWorkPackage(id: string): Promise<WorkPackage> {
    return this.request<WorkPackage>(`/work_packages/${id}`);
  }

  async createWorkPackage(data: {
    subject: string;
    projectId: number;
    typeId?: number;
    description?: string;
    assigneeId?: number;
    startDate?: string;
    dueDate?: string;
  }): Promise<WorkPackage> {
    const payload: any = {
      subject: data.subject,
      _links: {
        project: {
          href: `/api/v3/projects/${data.projectId}`,
        },
      },
    };

    if (data.typeId) {
      payload._links.type = {
        href: `/api/v3/types/${data.typeId}`,
      };
    }

    if (data.description) {
      payload.description = {
        format: 'markdown',
        raw: data.description,
      };
    }

    if (data.assigneeId) {
      payload._links.assignee = {
        href: `/api/v3/users/${data.assigneeId}`,
      };
    }

    if (data.startDate) payload.startDate = data.startDate;
    if (data.dueDate) payload.dueDate = data.dueDate;

    return this.request<WorkPackage>('/work_packages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateWorkPackage(
    id: string,
    data: {
      subject?: string;
      description?: string;
      assigneeId?: number;
      startDate?: string;
      dueDate?: string;
      statusId?: number;
      percentageDone?: number;
    }
  ): Promise<WorkPackage> {
    const payload: any = {};

    if (data.subject !== undefined) payload.subject = data.subject;
    if (data.startDate !== undefined) payload.startDate = data.startDate;
    if (data.dueDate !== undefined) payload.dueDate = data.dueDate;
    if (data.percentageDone !== undefined) payload.percentageDone = data.percentageDone;

    if (data.description !== undefined) {
      payload.description = {
        format: 'markdown',
        raw: data.description,
      };
    }

    if (data.assigneeId !== undefined || data.statusId !== undefined) {
      payload._links = {};

      if (data.assigneeId !== undefined) {
        payload._links.assignee = {
          href: `/api/v3/users/${data.assigneeId}`,
        };
      }

      if (data.statusId !== undefined) {
        payload._links.status = {
          href: `/api/v3/statuses/${data.statusId}`,
        };
      }
    }

    return this.request<WorkPackage>(`/work_packages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteWorkPackage(id: string): Promise<void> {
    await this.request<void>(`/work_packages/${id}`, {
      method: 'DELETE',
    });
  }

  async listUsers(params?: {
    filters?: string;
    pageSize?: number;
    offset?: number;
  }): Promise<Collection<User>> {
    const queryParams = new URLSearchParams();
    if (params?.filters) queryParams.set('filters', params.filters);
    if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());

    const query = queryParams.toString();
    return this.request<Collection<User>>(
      `/users${query ? '?' + query : ''}`
    );
  }

  async getUser(id: string): Promise<User> {
    return this.request<User>(`/users/${id}`);
  }

  async listTimeEntries(params?: {
    filters?: string;
    pageSize?: number;
    offset?: number;
  }): Promise<Collection<TimeEntry>> {
    const queryParams = new URLSearchParams();
    if (params?.filters) queryParams.set('filters', params.filters);
    if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());

    const query = queryParams.toString();
    return this.request<Collection<TimeEntry>>(
      `/time_entries${query ? '?' + query : ''}`
    );
  }

  async createTimeEntry(data: {
    workPackageId: number;
    hours: number;
    spentOn: string;
    activityId?: number;
    comment?: string;
  }): Promise<TimeEntry> {
    const payload: any = {
      hours: `PT${data.hours}H`,
      spentOn: data.spentOn,
      _links: {
        workPackage: {
          href: `/api/v3/work_packages/${data.workPackageId}`,
        },
      },
    };

    if (data.activityId) {
      payload._links.activity = {
        href: `/api/v3/time_entries/activities/${data.activityId}`,
      };
    }

    if (data.comment) {
      payload.comment = {
        format: 'markdown',
        raw: data.comment,
      };
    }

    return this.request<TimeEntry>('/time_entries', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listWorkPackageTypes(): Promise<Collection<WorkPackageType>> {
    return this.request<Collection<WorkPackageType>>('/types');
  }

  async getWorkPackageType(id: string): Promise<WorkPackageType> {
    return this.request<WorkPackageType>(`/types/${id}`);
  }

  async listWorkPackageStatuses(): Promise<Collection<WorkPackageStatus>> {
    return this.request<Collection<WorkPackageStatus>>('/statuses');
  }

  async getWorkPackageStatus(id: string): Promise<WorkPackageStatus> {
    return this.request<WorkPackageStatus>(`/statuses/${id}`);
  }

  async listTimeEntryActivities(params?: {
    pageSize?: number;
    offset?: number;
  }): Promise<Collection<TimeEntryActivity>> {
    const queryParams = new URLSearchParams();
    if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());

    const query = queryParams.toString();
    return this.request<Collection<TimeEntryActivity>>(
      `/time_entries/activities${query ? '?' + query : ''}`
    );
  }

  async getTimeEntryActivity(id: string): Promise<TimeEntryActivity> {
    return this.request<TimeEntryActivity>(`/time_entries/activities/${id}`);
  }

  async getAllWorkPackagesInProject(
    projectId: string | number,
    options?: BulkLoadOptions
  ): Promise<WorkPackage[]> {
    const fetchPage = async (offset: number, pageSize: number) => {
      const queryParams = new URLSearchParams();
      queryParams.set('pageSize', pageSize.toString());
      queryParams.set('offset', offset.toString());

      // Filter by project
      const filter = `[{"project":{"operator":"=","values":["${projectId}"]}}]`;
      queryParams.set('filters', filter);

      const query = queryParams.toString();
      return this.request<Collection<WorkPackage>>(
        `/work_packages${query ? '?' + query : ''}`
      );
    };

    return this.fetchAllPages<WorkPackage>(fetchPage, options);
  }

  async getProjectOverview(
    projectId: string | number,
    options?: BulkLoadOptions
  ): Promise<ProjectOverview> {
    // Load project and all work packages in parallel
    const [project, workPackages] = await Promise.all([
      this.getProject(projectId.toString()),
      this.getAllWorkPackagesInProject(projectId, options),
    ]);

    // Calculate statistics
    const statistics = this.calculateProjectStatistics(workPackages);

    return {
      project,
      workPackages,
      statistics,
      loadedAt: new Date().toISOString(),
      totalCount: workPackages.length,
    };
  }

  private calculateProjectStatistics(workPackages: WorkPackage[]): ProjectStatistics {
    const statistics: ProjectStatistics = {
      totalWorkPackages: workPackages.length,
      byStatus: {},
      byType: {},
      byAssignee: {},
      completionPercentage: 0,
      overdueCount: 0,
      unassignedCount: 0,
    };

    let totalPercentage = 0;
    const now = new Date();

    for (const wp of workPackages) {
      // Count by status
      const statusName = wp._embedded?.status?.name || 'Unknown';
      statistics.byStatus[statusName] = (statistics.byStatus[statusName] || 0) + 1;

      // Count by type
      const typeName = wp._embedded?.type?.name || 'Unknown';
      statistics.byType[typeName] = (statistics.byType[typeName] || 0) + 1;

      // Count by assignee
      const assigneeName = wp._embedded?.assignee?.name || 'Unassigned';
      statistics.byAssignee[assigneeName] = (statistics.byAssignee[assigneeName] || 0) + 1;

      // Count unassigned
      if (!wp._embedded?.assignee) {
        statistics.unassignedCount++;
      }

      // Sum completion percentage
      totalPercentage += wp.percentageDone || 0;

      // Count overdue
      if (wp.dueDate) {
        const dueDate = new Date(wp.dueDate);
        const isClosed = wp._embedded?.status?.isClosed || false;
        if (dueDate < now && !isClosed) {
          statistics.overdueCount++;
        }
      }
    }

    // Calculate average completion
    if (workPackages.length > 0) {
      statistics.completionPercentage = Math.round(totalPercentage / workPackages.length);
    }

    return statistics;
  }
}
