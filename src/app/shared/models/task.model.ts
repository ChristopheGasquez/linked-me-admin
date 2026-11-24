export type TaskName =
  'unverified-users' | 'expired-tokens' | 'audit-logs' | 'orphaned-permissions';

export interface CleanupAuditLogsDto {
  olderThanDays: number;
}

export interface Task {
  name: TaskName;
  permission: string;
  canRun: boolean;
  schedule: { cron: string | null; automatic: boolean };
  config: { ttlHours?: number; retentionDays?: number };
  lastRun: { at: string; actorId: number | null; result: Record<string, unknown> | null } | null;
}
