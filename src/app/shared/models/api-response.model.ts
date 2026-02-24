export interface ApiValidationField {
  key: string;
  code: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  code?: string;
  params?: {
    fields?: ApiValidationField[];
    [key: string]: unknown;
  };
}

export interface ApiMessage {
  message: string;
  code: string;
  params?: Record<string, unknown>;
}
