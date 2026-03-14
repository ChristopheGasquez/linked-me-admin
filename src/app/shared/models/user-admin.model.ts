import { RoleBasicResponse } from './role.model';

export interface UserAdminResponse {
  id: number;
  email: string;
  name: string;
  isEmailChecked: boolean;
  createdAt: string;
  updatedAt: string;
  roles: RoleBasicResponse[];
}

export interface UserAdminListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  role?: string;
  isEmailChecked?: boolean;
}
