import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken();
  const authenticatedRequest = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        request.url.includes('/auth/')
      ) {
        return throwError(() => error);
      }

      return auth.refresh().pipe(
        switchMap(() => {
          const renewedToken = auth.accessToken();
          if (!renewedToken) {
            return throwError(() => error);
          }
          return next(request.clone({ setHeaders: { Authorization: `Bearer ${renewedToken}` } }));
        }),
        catchError((refreshError: unknown) => {
          if (refreshError instanceof HttpErrorResponse && refreshError.status === 401) {
            auth.clearSession();
          }
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
