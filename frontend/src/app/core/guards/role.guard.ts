import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/api.models';

export const roleGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!(await auth.restoreSession())) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  const configuredRoles: unknown = route.data['roles'];
  const roles = Array.isArray(configuredRoles)
    ? configuredRoles.filter((role): role is UserRole =>
        role === 'ADMINISTRADOR' || role === 'EMPLEADO',
      )
    : [];
  if (roles.includes(auth.user()?.role ?? 'EMPLEADO')) return true;
  return router.createUrlTree(['/dashboard']);
};
