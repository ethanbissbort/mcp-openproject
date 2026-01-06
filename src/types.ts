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
    type?: any;
    status?: any;
    assignee?: User;
    author?: User;
  };
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
    activity?: any;
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

export interface ErrorResponse {
  _type: string;
  errorIdentifier: string;
  message: string;
  details?: any;
}
