import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, finalize, firstValueFrom, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { ApiResponse, AuthSession, AuthUser } from '../models/api.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly currentUser = signal<AuthUser | null>(null);
  private readonly token = signal<string | null>(null);
  private restoreTask: Promise<boolean> | null = null;
  private refreshTask: Observable<AuthSession> | null = null;

  readonly user = this.currentUser.asReadonly();

  accessToken(): string | null {
    return this.token();
  }

  login(email: string, password: string): Observable<AuthSession> {
    return this.api.post<ApiResponse<AuthSession>>('/auth/login', { email, password }).pipe(
      map((response) => response.data),
      tap((session) => this.setSession(session)),
    );
  }

  restoreSession(): Promise<boolean> {
    if (this.currentUser()) return Promise.resolve(true);
    if (this.restoreTask) return this.restoreTask;

    this.restoreTask = firstValueFrom(
      this.refresh().pipe(
        map(() => true),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            this.clearSession();
            return of(false);
          }
          return throwError(() => error);
        }),
      ),
    ).finally(() => {
      this.restoreTask = null;
    });

    return this.restoreTask;
  }

  refresh(): Observable<AuthSession> {
    if (!this.refreshTask) {
      const request = this.api.post<ApiResponse<AuthSession>>('/auth/refresh', {}).pipe(
        map((response) => response.data),
        tap((session) => this.setSession(session)),
        finalize(() => {
          this.refreshTask = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.refreshTask = request;
    }

    return this.refreshTask;
  }

  logout(): Observable<void> {
    return this.api.post<ApiResponse<{ message: string }>>('/auth/logout', {}).pipe(
      map(() => undefined),
      finalize(() => this.clearSession()),
    );
  }

  clearSession(): void {
    this.currentUser.set(null);
    this.token.set(null);
  }

  private setSession(session: AuthSession): void {
    this.currentUser.set(session.user);
    this.token.set(session.accessToken);
  }
}
