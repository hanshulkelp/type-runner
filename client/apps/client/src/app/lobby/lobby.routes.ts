import { Routes } from '@angular/router';
import { CreateRoomComponent } from './create-room/create-room.component';
import { JoinRoomComponent } from './join-room/join-room.component';

export const lobbyRoutes: Routes = [
  {
    path: '',
    redirectTo: 'create',
    pathMatch: 'full',
  },
  {
    path: 'create',
    component: CreateRoomComponent,
  },
  {
    path: 'join',
    component: JoinRoomComponent,
  },
];