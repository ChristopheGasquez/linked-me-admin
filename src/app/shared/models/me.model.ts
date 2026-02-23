export interface MeResponse {
  id: number;
  email: string;
  name: string;
  isEmailChecked: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  roles: string[];
  permissions: string[];
}
