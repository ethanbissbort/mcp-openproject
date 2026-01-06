import type {
  OpenProjectConfig,
  Project,
  WorkPackage,
  User,
  TimeEntry,
  Collection,
  ErrorResponse,
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
      const errorData = await response.json() as ErrorResponse;
      throw new Error(
        `OpenProject API error: ${errorData.message || response.statusText}`
      );
    }

    return response.json() as Promise<T>;
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
}
