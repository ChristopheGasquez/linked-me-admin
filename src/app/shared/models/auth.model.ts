import { User } from './user.model';

export interface RegisterResponse {
  id: string;
  email: string;
  name: string;
  isEmailChecked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  user: User;
}
