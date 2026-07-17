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
  Relation,
  WorkPackageHierarchy,
  Activity,
  Role,
  Membership,
  Version,
  CreatableRelationType,
  CustomFieldValues,
  Schema,
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

  /**
   * Safely extract ID from OpenProject HAL+JSON href URL
   * @param href - The href string from _links
   * @returns The extracted ID or null if invalid
   */
  private extractIdFromHref(href: string): string | null {
    if (!href || typeof href !== 'string') {
      return null;
    }

    try {
      // Handle both absolute and relative URLs
      const url = href.startsWith('http') ? new URL(href) : new URL(href, 'http://dummy.local');
      const segments = url.pathname.split('/').filter(Boolean);
      const id = segments[segments.length - 1];

      // Validate that ID looks reasonable (numeric or alphanumeric)
      return id && id.length > 0 ? id : null;
    } catch (error) {
      console.warn(`Failed to extract ID from href: ${href}`, error);
      return null;
    }
  }

  /**
   * Merge custom field values into a work package payload.
   * Raw values (string/number/boolean) are set directly on the payload;
   * values of the form { href: "..." } (or arrays of them) are merged into
   * _links under the same key (list/user/version-type custom fields).
   */
  private applyCustomFields(payload: any, customFields?: CustomFieldValues): void {
    if (!customFields) {
      return;
    }

    for (const [key, value] of Object.entries(customFields)) {
      const isHrefObject =
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        'href' in value;
      const isHrefArray =
        Array.isArray(value) &&
        value.every(
          (item) => item !== null && typeof item === 'object' && 'href' in item
        );

      if (isHrefObject || isHrefArray) {
        payload._links = payload._links || {};
        payload._links[key] = value;
      } else {
        payload[key] = value;
      }
    }
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
    parentId?: number;
    startDate?: string;
    dueDate?: string;
    customFields?: CustomFieldValues;
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

    if (data.parentId) {
      payload._links.parent = {
        href: `/api/v3/work_packages/${data.parentId}`,
      };
    }

    if (data.startDate) payload.startDate = data.startDate;
    if (data.dueDate) payload.dueDate = data.dueDate;

    this.applyCustomFields(payload, data.customFields);

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
      parentId?: number | null;
      startDate?: string;
      dueDate?: string;
      statusId?: number;
      percentageDone?: number;
      lockVersion?: number;
      customFields?: CustomFieldValues;
    }
  ): Promise<WorkPackage> {
    const payload: any = {};

    // OpenProject requires the current lockVersion for PATCH requests on
    // work packages (optimistic locking). Fetch it if not provided.
    let lockVersion = data.lockVersion;
    if (lockVersion === undefined) {
      const current = await this.getWorkPackage(id);
      lockVersion = current.lockVersion as number;
    }
    if (lockVersion !== undefined) {
      payload.lockVersion = lockVersion;
    }

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

    if (data.assigneeId !== undefined || data.statusId !== undefined || data.parentId !== undefined) {
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

      if (data.parentId !== undefined) {
        payload._links.parent = {
          href: data.parentId === null ? null : `/api/v3/work_packages/${data.parentId}`,
        };
      }
    }

    this.applyCustomFields(payload, data.customFields);

    return this.request<WorkPackage>(`/work_packages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Set (or remove) the parent of a work package.
   * Fetches the work package first to obtain the current lockVersion,
   * which OpenProject requires for PATCH requests (optimistic locking).
   * Pass parentId: null to remove the current parent.
   */
  async setWorkPackageParent(
    id: string | number,
    parentId: number | null
  ): Promise<WorkPackage> {
    const current = await this.getWorkPackage(id.toString());

    const payload = {
      lockVersion: current.lockVersion as number,
      _links: {
        parent: {
          href: parentId === null ? null : `/api/v3/work_packages/${parentId}`,
        },
      },
    };

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

      // Filter by project using proper JSON serialization to prevent injection
      const filter = JSON.stringify([{
        project: {
          operator: "=",
          values: [projectId.toString()]
        }
      }]);
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

  async getWorkPackageRelations(workPackageId: string | number): Promise<Collection<Relation>> {
    return this.request<Collection<Relation>>(
      `/work_packages/${workPackageId}/relations`
    );
  }

  async getWorkPackageChildren(workPackageId: string | number): Promise<WorkPackage[]> {
    const relations = await this.getWorkPackageRelations(workPackageId);
    const childRelations = relations._embedded.elements.filter(
      (rel) => rel.type === 'children'
    );

    // Load child work packages
    const childIds = childRelations
      .map((rel) => this.extractIdFromHref(rel._links.to.href))
      .filter((id): id is string => id !== null);

    const children = await Promise.all(
      childIds.map((id) => this.getWorkPackage(id))
    );

    return children;
  }

  async getWorkPackageParent(workPackageId: string | number): Promise<WorkPackage | null> {
    const relations = await this.getWorkPackageRelations(workPackageId);
    const parentRelation = relations._embedded.elements.find(
      (rel) => rel.type === 'parent'
    );

    if (!parentRelation) {
      return null;
    }

    const parentId = this.extractIdFromHref(parentRelation._links.to.href);

    if (!parentId) {
      return null;
    }

    return this.getWorkPackage(parentId);
  }

  async getWorkPackageHierarchy(
    workPackageId: string | number,
    maxDepth: number = 10,
    currentDepth: number = 0
  ): Promise<WorkPackageHierarchy> {
    // Load the work package and its relations
    const [workPackage, relationsCollection] = await Promise.all([
      this.getWorkPackage(workPackageId.toString()),
      this.getWorkPackageRelations(workPackageId),
    ]);

    const relations = relationsCollection._embedded.elements;
    const hierarchy: WorkPackageHierarchy = {
      workPackage,
      children: [],
      depth: currentDepth,
      relations,
    };

    // Stop recursion at max depth
    if (currentDepth >= maxDepth) {
      return hierarchy;
    }

    // Load parent if exists
    const parentRelation = relations.find((rel) => rel.type === 'parent');
    if (parentRelation) {
      const parentId = this.extractIdFromHref(parentRelation._links.to.href);
      if (parentId) {
        hierarchy.parent = await this.getWorkPackageHierarchy(
          parentId,
          maxDepth,
          currentDepth + 1
        );
      }
    }

    // Load children
    const childRelations = relations.filter((rel) => rel.type === 'children');
    const childIds = childRelations
      .map((rel) => this.extractIdFromHref(rel._links.to.href))
      .filter((id): id is string => id !== null);

    hierarchy.children = await Promise.all(
      childIds.map((id) =>
        this.getWorkPackageHierarchy(id, maxDepth, currentDepth + 1)
      )
    );

    return hierarchy;
  }

  async getAllBlockingRelations(workPackageId: string | number): Promise<WorkPackage[]> {
    const relations = await this.getWorkPackageRelations(workPackageId);
    const blockingRelations = relations._embedded.elements.filter(
      (rel) => rel.type === 'blocked'
    );

    // Load blocking work packages
    const blockingIds = blockingRelations
      .map((rel) => this.extractIdFromHref(rel._links.to.href))
      .filter((id): id is string => id !== null);

    return Promise.all(
      blockingIds.map((id) => this.getWorkPackage(id))
    );
  }

  async getAllBlockedRelations(workPackageId: string | number): Promise<WorkPackage[]> {
    const relations = await this.getWorkPackageRelations(workPackageId);
    const blockedRelations = relations._embedded.elements.filter(
      (rel) => rel.type === 'blocks'
    );

    // Load blocked work packages
    const blockedIds = blockedRelations
      .map((rel) => this.extractIdFromHref(rel._links.to.href))
      .filter((id): id is string => id !== null);

    return Promise.all(
      blockedIds.map((id) => this.getWorkPackage(id))
    );
  }

  // Activity and Comment Methods

  async listWorkPackageActivities(
    workPackageId: string | number,
    options?: {
      pageSize?: number;
      offset?: number;
    }
  ): Promise<Collection<Activity>> {
    const params = new URLSearchParams({
      pageSize: (options?.pageSize || 20).toString(),
      offset: (options?.offset || 1).toString(),
    });

    return this.request<Collection<Activity>>(
      `/api/v3/work_packages/${workPackageId}/activities?${params}`
    );
  }

  async getWorkPackageComments(workPackageId: string | number): Promise<Activity[]> {
    // Get all activities and filter to only those with comments
    const activities = await this.listWorkPackageActivities(workPackageId, { pageSize: 100 });
    return activities._embedded.elements.filter(
      (activity) => activity.comment && activity.comment.raw
    );
  }

  // Membership and Role Methods

  async listRoles(): Promise<Collection<Role>> {
    return this.request<Collection<Role>>('/roles');
  }

  async getRole(id: string): Promise<Role> {
    return this.request<Role>(`/roles/${id}`);
  }

  async listMemberships(params?: {
    filters?: string;
    pageSize?: number;
    offset?: number;
  }): Promise<Collection<Membership>> {
    const queryParams = new URLSearchParams();
    if (params?.filters) queryParams.set('filters', params.filters);
    if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());

    const query = queryParams.toString();
    return this.request<Collection<Membership>>(
      `/memberships${query ? '?' + query : ''}`
    );
  }

  async getMembership(id: string): Promise<Membership> {
    return this.request<Membership>(`/memberships/${id}`);
  }

  async createMembership(data: {
    projectId: number;
    userId: number;
    roleIds: number[];
    notificationMessage?: string;
  }): Promise<Membership> {
    const payload: any = {
      _links: {
        project: {
          href: `/api/v3/projects/${data.projectId}`,
        },
        principal: {
          href: `/api/v3/users/${data.userId}`,
        },
        roles: data.roleIds.map((roleId) => ({
          href: `/api/v3/roles/${roleId}`,
        })),
      },
    };

    if (data.notificationMessage) {
      payload._meta = {
        notificationMessage: {
          raw: data.notificationMessage,
        },
      };
    }

    return this.request<Membership>('/memberships', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateMembership(
    id: string,
    data: {
      roleIds: number[];
    }
  ): Promise<Membership> {
    const payload = {
      _links: {
        roles: data.roleIds.map((roleId) => ({
          href: `/api/v3/roles/${roleId}`,
        })),
      },
    };

    return this.request<Membership>(`/memberships/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteMembership(id: string): Promise<void> {
    await this.request<void>(`/memberships/${id}`, {
      method: 'DELETE',
    });
  }

  // Version (Milestone/Roadmap) Methods

  async listVersions(params?: {
    pageSize?: number;
    offset?: number;
  }): Promise<Collection<Version>> {
    const queryParams = new URLSearchParams();
    if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());

    const query = queryParams.toString();
    return this.request<Collection<Version>>(
      `/versions${query ? '?' + query : ''}`
    );
  }

  async listProjectVersions(projectId: string | number): Promise<Collection<Version>> {
    return this.request<Collection<Version>>(`/projects/${projectId}/versions`);
  }

  async getVersion(id: string): Promise<Version> {
    return this.request<Version>(`/versions/${id}`);
  }

  async createVersion(data: {
    projectId: number;
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    status?: 'open' | 'locked' | 'closed';
    sharing?: string;
  }): Promise<Version> {
    const payload: any = {
      name: data.name,
      _links: {
        definingProject: {
          href: `/api/v3/projects/${data.projectId}`,
        },
      },
    };

    if (data.description !== undefined) {
      payload.description = {
        format: 'markdown',
        raw: data.description,
      };
    }

    if (data.startDate) payload.startDate = data.startDate;
    if (data.endDate) payload.endDate = data.endDate;
    if (data.status) payload.status = data.status;
    if (data.sharing) payload.sharing = data.sharing;

    return this.request<Version>('/versions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateVersion(
    id: string,
    data: {
      name?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      status?: 'open' | 'locked' | 'closed';
      sharing?: string;
    }
  ): Promise<Version> {
    const payload: any = {};

    if (data.name !== undefined) payload.name = data.name;
    if (data.startDate !== undefined) payload.startDate = data.startDate;
    if (data.endDate !== undefined) payload.endDate = data.endDate;
    if (data.status !== undefined) payload.status = data.status;
    if (data.sharing !== undefined) payload.sharing = data.sharing;

    if (data.description !== undefined) {
      payload.description = {
        format: 'markdown',
        raw: data.description,
      };
    }

    return this.request<Version>(`/versions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteVersion(id: string): Promise<void> {
    await this.request<void>(`/versions/${id}`, {
      method: 'DELETE',
    });
  }

  async setWorkPackageVersion(
    workPackageId: string | number,
    versionId: number
  ): Promise<WorkPackage> {
    // Fetch the work package first to obtain its current lockVersion
    // (required by OpenProject for optimistic locking on updates)
    const workPackage = await this.getWorkPackage(workPackageId.toString());

    const payload = {
      lockVersion: workPackage.lockVersion,
      _links: {
        version: {
          href: `/api/v3/versions/${versionId}`,
        },
      },
    };

    return this.request<WorkPackage>(`/work_packages/${workPackageId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  // Project Lifecycle Methods

  async deleteProject(id: string): Promise<void> {
    await this.request<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Time Entry Lifecycle Methods

  async updateTimeEntry(
    id: string,
    data: {
      hours?: number;
      spentOn?: string;
      comment?: string;
      activityId?: number;
    }
  ): Promise<TimeEntry> {
    const payload: any = {};

    if (data.hours !== undefined) payload.hours = `PT${data.hours}H`;
    if (data.spentOn !== undefined) payload.spentOn = data.spentOn;

    if (data.comment !== undefined) {
      payload.comment = {
        format: 'markdown',
        raw: data.comment,
      };
    }

    if (data.activityId !== undefined) {
      payload._links = {
        activity: {
          href: `/api/v3/time_entries/activities/${data.activityId}`,
        },
      };
    }

    return this.request<TimeEntry>(`/time_entries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteTimeEntry(id: string): Promise<void> {
    await this.request<void>(`/time_entries/${id}`, {
      method: 'DELETE',
    });
  }

  // Relation Management Methods

  async createRelation(data: {
    fromId: number;
    toId: number;
    type: CreatableRelationType;
    description?: string;
    lag?: number;
  }): Promise<Relation> {
    const payload: any = {
      type: data.type,
      _links: {
        from: {
          href: `/api/v3/work_packages/${data.fromId}`,
        },
        to: {
          href: `/api/v3/work_packages/${data.toId}`,
        },
      },
    };

    if (data.description !== undefined) {
      payload.description = data.description;
    }

    if (data.lag !== undefined) {
      payload.lag = data.lag;
    }

    return this.request<Relation>(`/work_packages/${data.fromId}/relations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateRelation(
    relationId: string | number,
    data: {
      type?: CreatableRelationType;
      description?: string;
      lag?: number;
    }
  ): Promise<Relation> {
    const payload: any = {};

    if (data.type !== undefined) payload.type = data.type;
    if (data.description !== undefined) payload.description = data.description;
    if (data.lag !== undefined) payload.lag = data.lag;

    return this.request<Relation>(`/relations/${relationId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteRelation(relationId: string | number): Promise<void> {
    await this.request<void>(`/relations/${relationId}`, {
      method: 'DELETE',
    });
  }

  // Schema Methods

  async getWorkPackageSchema(
    projectId: number,
    typeId: number
  ): Promise<Schema> {
    return this.request<Schema>(
      `/work_packages/schemas/${projectId}-${typeId}`
    );
  }
}
