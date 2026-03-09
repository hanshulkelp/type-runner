import { Routes } from '@angular/router';
import { GameComponent } from './game.component';
import { GameService } from './game.service';

export const gameRoutes: Routes = [
  {
    path: ':roomId',
    component: GameComponent,
    // GameService is provided here so it's scoped to this route
    // a fresh instance is created each time the user enters a game
    providers: [GameService],
  },
];