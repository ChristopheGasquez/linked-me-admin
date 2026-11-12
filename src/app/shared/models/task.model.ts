export type TaskName = 'unverified-users' | 'expired-tokens' | 'audit-logs' | 'orphaned-permissions';

export interface CleanupAuditLogsDto {
  olderThanDays: number;
}
