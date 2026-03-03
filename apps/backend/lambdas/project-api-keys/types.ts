export interface ProjectApiKey {
  apiKeyId: string;
  projectId: string;
  name: string;
  keyHash: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

export interface CreateApiKeyBody {
  projectId: string;
  name: string;
}

export interface DeleteApiKeyBody {
  apiKeyId: string;
}
