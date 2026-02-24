export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  code?: string;
  params?: Record<string, unknown>;
}

export interface ApiMessage {
  message: string;
  code: string;
  params?: Record<string, unknown>;
}
