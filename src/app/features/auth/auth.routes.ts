import { Routes } from '@angular/router';

import { guestGuard } from '../../core/guards/guest.guard';

export const authRoutes: Routes = [
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
  { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./pages/register/register').then((m) => m.Register) },
  { path: 'verify-email', canActivate: [guestGuard], loadComponent: () => import('./pages/verify-email/verify-email').then((m) => m.VerifyEmail) },
  { path: 'email-confirmed', loadComponent: () => import('./pages/email-confirmed/email-confirmed').then((m) => m.EmailConfirmed) },
  { path: 'forgot-password', canActivate: [guestGuard], loadComponent: () => import('./pages/forgot-password/forgot-password').then((m) => m.ForgotPassword) },
  { path: 'reset-password', loadComponent: () => import('./pages/reset-password/reset-password').then((m) => m.ResetPassword) },
];
