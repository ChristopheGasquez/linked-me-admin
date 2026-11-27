export interface SessionResponse {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
  // Own sessions only (GET /auth/sessions), absent from the admin endpoint
  current?: boolean;
}
