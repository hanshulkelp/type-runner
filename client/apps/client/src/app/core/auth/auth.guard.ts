
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// blocks unauthenticated users from accessing protected routes
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  // redirects to login if no token found
  // Why createUrlTree instead of router.navigate()? 
  // createUrlTree returns a UrlTree object which Angular's router 
  // understands as a redirect instruction. It's cleaner than calling navigate() 
  // as a side effect because the router handles the redirect itself.
  return router.createUrlTree(['/login']);
};