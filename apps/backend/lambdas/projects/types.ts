export interface Project {
  projectId: string;
  organizationId: string;
  name: string;
  createdAt: string;
  createdBy: string;
}

export interface CreateProjectBody {
  organizationId: string;
  name: string;
}

export interface UpdateProjectBody {
  projectId: string;
  name: string;
}

export interface DeleteProjectBody {
  projectId: string;
}
