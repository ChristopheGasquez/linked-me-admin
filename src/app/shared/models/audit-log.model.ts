export interface AuditLogResponse {
  id: number;
  action: string;
  actorId: number | null;
  targetId: number | null;
  targetType: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  action?: string;
  actorId?: number;
  targetType?: string;
}
