import { User } from './user.model';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface TokensResponse {
  access_token: string;
  refresh_token: string;
}
