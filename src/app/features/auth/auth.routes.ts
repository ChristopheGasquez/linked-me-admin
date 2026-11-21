import { Routes } from '@angular/router';

import { guestGuard } from '../../core/guards/guest.guard';

export const authRoutes: Routes = [
  { path: 'login', title: 'common.title.auth.login', canActivate: [guestGuard], loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
  { path: 'register', title: 'common.title.auth.register', canActivate: [guestGuard], loadComponent: () => import('./pages/register/register').then((m) => m.Register) },
  { path: 'verify-email', title: 'common.title.auth.verifyEmail', canActivate: [guestGuard], loadComponent: () => import('./pages/verify-email/verify-email').then((m) => m.VerifyEmail) },
  { path: 'email-confirmed', title: 'common.title.auth.emailConfirmed', loadComponent: () => import('./pages/email-confirmed/email-confirmed').then((m) => m.EmailConfirmed) },
  { path: 'forgot-password', title: 'common.title.auth.forgotPassword', canActivate: [guestGuard], loadComponent: () => import('./pages/forgot-password/forgot-password').then((m) => m.ForgotPassword) },
  { path: 'reset-password', title: 'common.title.auth.resetPassword', loadComponent: () => import('./pages/reset-password/reset-password').then((m) => m.ResetPassword) },
];
