import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const appRoutes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: '',
    loadChildren: () =>
      import('./auth/auth.routes').then(m => m.authRoutes),
  },
//   {
//     path: 'lobby',
//     canActivate: [authGuard],
//     // lobby will be built on Day 2
//     loadChildren: () =>
//       import('./lobby/lobby.routes').then(m => m.lobbyRoutes),
//   },
];