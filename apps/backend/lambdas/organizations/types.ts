export interface Organization {
  organizationId: string;
  name: string;
  createdAt: string;
  createdBy: string;
}

export interface CreateOrganizationBody {
  name: string;
}

export interface UpdateOrganizationBody {
  organizationId: string;
  name: string;
}

export interface DeleteOrganizationBody {
  organizationId: string;
}
