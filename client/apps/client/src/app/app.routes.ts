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
  {
    path: 'game',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./game/game.routes').then(m => m.gameRoutes),
  },
  {
    path: 'leaderboard',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./leaderboard/leaderboard.routes').then(m => m.leaderboardRoutes),
  },
  {
    path: 'lobby',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./lobby/lobby.routes').then(m => m.lobbyRoutes),
  },
];