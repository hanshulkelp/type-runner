import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { CommonModule } from '@angular/common';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  imports: [RouterModule, NavbarComponent, CommonModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);

  // signal — tracks the current URL, updates on every navigation
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(event => (event as NavigationEnd).urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  // hide navbar on login and register pages
  readonly isAuthPage = computed(() =>
    this.currentUrl().includes('/login') ||
    this.currentUrl().includes('/register'),
  );

  // hide navbar inside the game
  readonly isGamePage = computed(() =>
    this.currentUrl().includes('/game'),
  );
}