export interface PermissionResponse {
  id: string;
  name: string;
}

export interface PermissionListParams {
  page?: number;
  limit?: number;
  sortBy?: 'id' | 'name';
  sortOrder?: 'asc' | 'desc';
}
