export interface OpenProjectConfig {
  baseUrl: string;
  apiKey: string;
}

export interface HalLink {
  href: string;
  title?: string;
}

export interface HalLinks {
  self: HalLink;
  [key: string]: HalLink | HalLink[] | undefined;
}

export interface WorkPackageType {
  _type: string;
  id: number;
  name: string;
  color: string;
  position: number;
  isDefault: boolean;
  isMilestone: boolean;
  createdAt: string;
  updatedAt: string;
  _links: HalLinks;
}

export interface WorkPackageStatus {
  _type: string;
  id: number;
  name: string;
  isClosed: boolean;
  color: string;
  isDefault: boolean;
  isReadonly: boolean;
  defaultDoneRatio?: number;
  position: number;
  createdAt: string;
  updatedAt: string;
  _links: HalLinks;
}

export interface TimeEntryActivity {
  _type: string;
  id: number;
  name: string;
  position: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  _links: HalLinks;
}

export interface Project {
  _type: string;
  id: number;
  identifier: string;
  name: string;
  description?: {
    format: string;
    raw: string;
    html: string;
  };
  public: boolean;
  active: boolean;
  statusExplanation?: {
    format: string;
    raw: string;
    html: string;
  };
  createdAt: string;
  updatedAt: string;
  _links: HalLinks;
}

export interface WorkPackage {
  _type: string;
  id: number;
  subject: string;
  description?: {
    format: string;
    raw: string;
    html: string;
  };
  startDate?: string;
  dueDate?: string;
  estimatedTime?: string;
  spentTime?: string;
  percentageDone?: number;
  createdAt: string;
  updatedAt: string;
  _links: HalLinks;
  _embedded?: {
    project?: Project;
    type?: WorkPackageType;
    status?: WorkPackageStatus;
    assignee?: User;
    author?: User;
  };
  // Custom fields: OpenProject allows organization-specific custom fields
  // These appear as additional properties on the work package (e.g., customField1, customField2, etc.)
  // or with custom names defined by the organization
  [key: string]: unknown;
}

export interface User {
  _type: string;
  id: number;
  name: string;
  email?: string;
  login: string;
  admin: boolean;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _links: HalLinks;
}

export interface TimeEntry {
  _type: string;
  id: number;
  comment?: {
    format: string;
    raw: string;
    html: string;
  };
  spentOn: string;
  hours: string;
  createdAt: string;
  updatedAt: string;
  _links: HalLinks;
  _embedded?: {
    project?: Project;
    workPackage?: WorkPackage;
    user?: User;
    activity?: TimeEntryActivity;
  };
}

export interface Collection<T> {
  _type: string;
  total: number;
  count: number;
  pageSize?: number;
  offset?: number;
  _embedded: {
    elements: T[];
  };
  _links: HalLinks;
}

export interface BulkLoadOptions {
  maxItems?: number;
  includeEmbedded?: boolean;
  pageSize?: number;
}

export interface ProjectStatistics {
  totalWorkPackages: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byAssignee: Record<string, number>;
  completionPercentage: number;
  overdueCount: number;
  unassignedCount: number;
  blockedCount?: number;
  blockingCount?: number;
  orphanedCount?: number;
}

export interface ProjectOverview {
  project: Project;
  workPackages: WorkPackage[];
  statistics: ProjectStatistics;
  loadedAt: string;
  totalCount: number;
}

export type RelationType =
  | 'blocks'
  | 'blocked'
  | 'precedes'
  | 'follows'
  | 'relates'
  | 'duplicates'
  | 'duplicated'
  | 'parent'
  | 'children';

export interface Relation {
  _type: string;
  id: number;
  name?: string;
  type: RelationType;
  reverseType?: string;
  description?: string;
  _links: {
    self: HalLink;
    from: HalLink;
    to: HalLink;
  };
  _embedded?: {
    from?: WorkPackage;
    to?: WorkPackage;
  };
}

export interface WorkPackageHierarchy {
  workPackage: WorkPackage;
  parent?: WorkPackageHierarchy;
  children: WorkPackageHierarchy[];
  depth: number;
  relations: Relation[];
}

export interface ActivityDetail {
  format: string;
  raw: string;
  html: string;
}

export interface Activity {
  _type: string;
  id: number;
  version: number;
  comment?: {
    format: string;
    raw: string;
    html: string;
  };
  details: Array<{
    format: string;
    raw: string;
    html: string;
  }>;
  createdAt: string;
  _links: HalLinks & {
    user?: HalLink;
    workPackage?: HalLink;
  };
  _embedded?: {
    user?: User;
    workPackage?: WorkPackage;
  };
}

export interface ErrorResponse {
  _type: string;
  errorIdentifier: string;
  message: string;
  details?: any;
}
