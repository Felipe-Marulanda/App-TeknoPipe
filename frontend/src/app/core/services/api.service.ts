import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T>(path: string, params?: HttpParams) {
    return this.http.get<T>(`${environment.apiBaseUrl}${path}`, {
      ...(params ? { params } : {}),
      withCredentials: true,
    });
  }

  getBlob(path: string): Observable<Blob> {
    return this.http.get(`${environment.apiBaseUrl}${path}`, {
      responseType: 'blob',
      withCredentials: true,
    });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${environment.apiBaseUrl}${path}`, body, { withCredentials: true });
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${environment.apiBaseUrl}${path}`, body, { withCredentials: true });
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${environment.apiBaseUrl}${path}`, body, { withCredentials: true });
  }
}
