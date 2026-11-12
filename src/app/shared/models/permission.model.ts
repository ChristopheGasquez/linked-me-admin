export interface PermissionResponse {
  id: number;
  name: string;
}

export interface PermissionListParams {
  page?: number;
  limit?: number;
  sortBy?: 'id' | 'name';
  sortOrder?: 'asc' | 'desc';
}
