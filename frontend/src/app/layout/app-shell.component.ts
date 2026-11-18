import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { apiErrorMessage } from '../core/services/api-error';
import { IconComponent, IconName } from '../shared/icon.component';

interface NavigationItem {
  label: string;
  path: string;
  icon: IconName;
  roles?: readonly ('ADMINISTRADOR' | 'EMPLEADO')[];
}

@Component({
  imports: [IconComponent, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly menuOpen = signal(false);

  private readonly navigation: readonly NavigationItem[] = [
    { label: 'Resumen', path: '/dashboard', icon: 'dashboard' },
    { label: 'Cotizaciones', path: '/quotations', icon: 'quotations' },
    { label: 'Clientes', path: '/clients', icon: 'clients' },
    { label: 'Productos', path: '/products', icon: 'products' },
    { label: 'Categorías', path: '/categories', icon: 'categories' },
    { label: 'Historial', path: '/history', icon: 'history' },
    { label: 'Informes', path: '/reports', icon: 'reports', roles: ['ADMINISTRADOR'] },
    { label: 'Equipo', path: '/users', icon: 'users', roles: ['ADMINISTRADOR'] },
    { label: 'Configuración', path: '/settings', icon: 'settings', roles: ['ADMINISTRADOR'] },
  ];

  protected readonly visibleNavigation = computed(() => {
    const role = this.auth.user()?.role ?? 'EMPLEADO';
    return this.navigation.filter((item) => !item.roles || item.roles.includes(role));
  });
  protected readonly initials = computed(() => {
    const name = this.auth.user()?.fullName ?? '';
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toLocaleUpperCase() ?? '')
      .join('');
  });
  protected readonly roleLabel = computed(() =>
    this.auth.user()?.role === 'ADMINISTRADOR' ? 'Administrador' : 'Empleado',
  );

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.closeMenu();
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
      error: (error: unknown) => {
        this.auth.clearSession();
        void this.router.navigate(['/login'], {
          queryParams: {
            notice: apiErrorMessage(
              error,
              'La sesión se cerró en este equipo, pero no se pudo confirmar con el servidor.',
            ),
          },
        });
      },
    });
  }
}
