import { User } from './user.model';

export interface RegisterResponse {
  id: number;
  email: string;
  name: string;
  isEmailChecked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface TokensResponse {
  access_token: string;
  refresh_token: string;
}
