import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('stores the access token and user returned by login', async () => {
    const user = {
      id: 'user-1',
      email: 'admin@example.test',
      fullName: 'Administradora',
      role: 'ADMINISTRADOR' as const,
    };
    const session = { accessToken: 'access-token', user };
    const login = firstValueFrom(auth.login(user.email, 'correct-password'));
    const request = http.expectOne((candidate) => candidate.url.endsWith('/api/v1/auth/login'));

    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({ email: user.email, password: 'correct-password' });
    request.flush({ data: session });

    await expect(login).resolves.toEqual(session);
    expect(auth.user()).toEqual(user);
    expect(auth.accessToken()).toBe(session.accessToken);
  });

  it('returns false when restoring a session with an expired refresh cookie', async () => {
    const restored = auth.restoreSession();
    const request = http.expectOne((candidate) => candidate.url.endsWith('/api/v1/auth/refresh'));

    expect(request.request.withCredentials).toBe(true);
    request.flush(
      { error: { code: 'INVALID_SESSION', message: 'La sesión expiró.' } },
      { status: 401, statusText: 'Unauthorized' },
    );

    await expect(restored).resolves.toBe(false);
    expect(auth.user()).toBeNull();
    expect(auth.accessToken()).toBeNull();
  });
});
