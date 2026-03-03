export const ORGANIZATION_ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

export type OrganizationRole =
  (typeof ORGANIZATION_ROLES)[keyof typeof ORGANIZATION_ROLES];

export interface OrganizationMember {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  joinedAt: string;
}

export interface AddMemberBody {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
}

export interface UpdateMemberRoleBody {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
}

export interface RemoveMemberBody {
  organizationId: string;
  userId: string;
}
