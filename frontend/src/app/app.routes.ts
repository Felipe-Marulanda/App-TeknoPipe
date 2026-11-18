import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((module) => module.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/app-shell.component').then((module) => module.AppShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (module) => module.DashboardComponent,
          ),
        data: { title: 'Resumen' },
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./features/clients/clients.component').then((module) => module.ClientsComponent),
        data: { title: 'Clientes' },
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/categories/categories.component').then(
            (module) => module.CategoriesComponent,
          ),
        data: { title: 'Categorías' },
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/products.component').then(
            (module) => module.ProductsComponent,
          ),
        data: { title: 'Productos' },
      },
      {
        path: 'quotations',
        loadComponent: () =>
          import('./features/quotations/quotations.component').then(
            (module) => module.QuotationsComponent,
          ),
        data: { title: 'Cotizaciones' },
      },
      {
        path: 'quotations/new',
        loadComponent: () =>
          import('./features/quotations/quotation-editor.component').then(
            (module) => module.QuotationEditorComponent,
          ),
        data: { title: 'Nueva cotización' },
      },
      {
        path: 'quotations/:id/edit',
        loadComponent: () =>
          import('./features/quotations/quotation-editor.component').then(
            (module) => module.QuotationEditorComponent,
          ),
        data: { title: 'Editar cotización' },
      },
      {
        path: 'quotations/:id',
        loadComponent: () =>
          import('./features/quotations/quotation-detail.component').then(
            (module) => module.QuotationDetailComponent,
          ),
        data: { title: 'Detalle de cotización' },
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./features/history/history.component').then((module) => module.HistoryComponent),
        data: { title: 'Historial' },
      },
      {
        path: 'reports',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR'], title: 'Informes' },
        loadComponent: () =>
          import('./features/reports/reports.component').then((module) => module.ReportsComponent),
      },
      {
        path: 'users',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR'], title: 'Equipo' },
        loadComponent: () =>
          import('./features/users/users.component').then((module) => module.UsersComponent),
      },
      {
        path: 'settings',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR'], title: 'Configuración' },
        loadComponent: () =>
          import('./features/settings/settings.component').then(
            (module) => module.SettingsComponent,
          ),
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },
];
