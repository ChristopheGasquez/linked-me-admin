import { PermissionResponse } from './permission.model';

export interface RoleBasicResponse {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleResponse extends RoleBasicResponse {
  permissions: PermissionResponse[];
}

export interface RoleListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
