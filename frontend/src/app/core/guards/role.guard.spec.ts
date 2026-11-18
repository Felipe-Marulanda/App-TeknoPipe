import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  it('redirects an employee away from an administrator route', async () => {
    const dashboard = {} as UrlTree;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            restoreSession: async () => true,
            user: () => ({ id: 'employee-1', role: 'EMPLEADO' }),
          },
        },
        { provide: Router, useValue: { createUrlTree: () => dashboard } },
      ],
    });

    const result = await TestBed.runInInjectionContext(() =>
      roleGuard(
        { data: { roles: ['ADMINISTRADOR'] } } as unknown as ActivatedRouteSnapshot,
        { url: '/users' } as RouterStateSnapshot,
      ),
    );

    expect(result).toBe(dashboard);
  });
});
