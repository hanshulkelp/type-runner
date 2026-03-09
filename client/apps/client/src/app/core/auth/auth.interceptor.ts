import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

// automatically adds "Authorization: Bearer <token>" to every outgoing HTTP request
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();

  if (token) {
    const authorizedRequest = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
    return next(authorizedRequest);
  }

  return next(req);
};