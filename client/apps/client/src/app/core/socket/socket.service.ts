import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket!: Socket;

  // Creates a new socket connection using the JWT token for authentication
  connect(token: string): void {
    this.socket = io('http://localhost:3000', {
      // token is sent in the handshake so the server can verify it in handleConnection
      auth: { token },
    });
  }

  // Closes the socket connection cleanly
  disconnect(): void {
    this.socket?.disconnect();
  }

  // Sends an event to the server with optional data
  emit(event: string, data?: unknown): void {
    this.socket.emit(event, data);
  }

  // Returns an Observable that emits every time the given event is received
  // The component subscribes to this and gets data automatically
  on<T>(event: string): Observable<T> {
    return new Observable(observer => {
      this.socket.on(event, (data: T) => observer.next(data));

      // cleanup function — removes the listener when the component unsubscribes
      return () => this.socket.off(event);
    });
  }
}