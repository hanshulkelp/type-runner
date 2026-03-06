// libs/shared-types.ts

export enum RoomStatus {
  WAITING   = 'waiting',
  COUNTDOWN = 'countdown',
  RACING    = 'racing',
  FINISHED  = 'finished',
}

export interface PlayerProgress {
  userId:   string;
  username: string;
  progress: number;   // 0–100 percentage of quote typed correctly
  wpm:      number;
  accuracy: number;
}

export interface RaceResult {
  userId:    string;
  username:  string;
  wpm:       number; // words per min
  accuracy:  number; // percentage of characters typed correctly
  timeTaken: number;  //  race start to finish time
  position:  number;  // postion of the user 
}

// Every WebSocket event name

export namespace WsEvents {
  export const JOIN_ROOM          = 'joinRoom'; 
  export const PLAYER_READY       = 'playerReady';
  export const PROGRESS_UPDATE    = 'progressUpdate';
  export const PLAYER_FINISHED    = 'playerFinished';

  export const ROOM_STATE         = 'roomState';
  export const PLAYER_JOINED      = 'playerJoined';
  export const COUNTDOWN          = 'countdown';
  export const RACE_START         = 'raceStart';
  export const PROGRESS_BROADCAST = 'progressBroadcast';
  export const RACE_END           = 'raceEnd';
  export const ERROR              = 'error';
}