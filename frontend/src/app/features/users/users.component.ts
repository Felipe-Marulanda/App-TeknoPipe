import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiResponse, PaginatedResponse, UserRecord, UserRole } from '../../core/models/api.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { toHttpParams } from '../../core/services/http-params';
import { IconComponent } from '../../shared/icon.component';

type ActiveFilter = 'all' | 'true' | 'false';
type RoleFilter = 'all' | UserRole;

@Component({
  imports: [DatePipe, IconComponent, ReactiveFormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly pageSize = 20;

  protected readonly users = signal<UserRecord[]>([]);
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly busyId = signal<string | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly selected = signal<UserRecord | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly formError = signal('');
  protected readonly filters = this.formBuilder.group({
    search: [''],
    active: this.formBuilder.control<ActiveFilter>('all'),
    role: this.formBuilder.control<RoleFilter>('all'),
  });
  protected readonly form = this.formBuilder.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(320)]],
    password: ['', [Validators.minLength(12), Validators.maxLength(72)]],
    role: this.formBuilder.control<UserRole>('EMPLEADO', Validators.required),
  });

  ngOnInit(): void {
    this.load();
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.total() / this.pageSize));
  }

  isCurrentUser(user: UserRecord): boolean {
    return user.id === this.auth.user()?.id;
  }

  roleLabel(role: UserRole): string {
    return role === 'ADMINISTRADOR' ? 'Administrador' : 'Empleado';
  }

  search(): void {
    this.page.set(1);
    this.load();
  }

  changeFilter(): void {
    this.page.set(1);
    this.load();
  }

  movePage(delta: number): void {
    const next = this.page() + delta;
    if (next < 1 || next > this.pageCount) return;
    this.page.set(next);
    this.load();
  }

  openCreate(): void {
    this.selected.set(null);
    this.formError.set('');
    this.form.controls.role.enable();
    this.form.reset({ fullName: '', email: '', password: '', role: 'EMPLEADO' });
    this.form.controls.password.setValidators([
      Validators.required,
      Validators.minLength(12),
      Validators.maxLength(72),
    ]);
    this.form.controls.password.updateValueAndValidity();
    this.formOpen.set(true);
  }

  openEdit(user: UserRecord): void {
    this.selected.set(user);
    this.formError.set('');
    this.form.reset({
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: user.role.name,
    });
    this.form.controls.password.clearValidators();
    this.form.controls.password.setValidators([Validators.minLength(12), Validators.maxLength(72)]);
    this.form.controls.password.updateValueAndValidity();
    if (this.isCurrentUser(user)) this.form.controls.role.disable();
    else this.form.controls.role.enable();
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.selected.set(null);
    this.formError.set('');
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    const selected = this.selected();
    const payload = {
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      ...(values.password ? { password: values.password } : {}),
      ...(!selected || !this.isCurrentUser(selected) ? { role: values.role } : {}),
    };
    const request = selected
      ? this.api.put<ApiResponse<UserRecord>>(`/users/${selected.id}`, payload)
      : this.api.post<ApiResponse<UserRecord>>('/users', payload);

    this.formError.set('');
    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.closeForm();
        this.load();
      },
      error: (error: unknown) =>
        this.formError.set(apiErrorMessage(error, 'No se pudo guardar el usuario.')),
    });
  }

  toggleActive(user: UserRecord): void {
    this.busyId.set(user.id);
    this.errorMessage.set('');
    this.api
      .patch<ApiResponse<UserRecord>>(`/users/${user.id}/status`, { active: !user.active })
      .pipe(finalize(() => this.busyId.set(null)))
      .subscribe({
        next: () => this.load(),
        error: (error: unknown) =>
          this.errorMessage.set(apiErrorMessage(error, 'No se pudo actualizar el usuario.')),
      });
  }

  private load(): void {
    const active = this.filters.controls.active.value;
    const role = this.filters.controls.role.value;
    this.loading.set(true);
    this.errorMessage.set('');
    this.api
      .get<PaginatedResponse<UserRecord>>(
        '/users',
        toHttpParams({
          page: this.page(),
          pageSize: this.pageSize,
          search: this.filters.controls.search.value.trim(),
          active: active === 'all' ? undefined : active,
          role: role === 'all' ? undefined : role,
        }),
      )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.users.set(response.data);
          this.total.set(response.meta.total);
        },
        error: (error: unknown) =>
          this.errorMessage.set(apiErrorMessage(error, 'No se pudo cargar el equipo.')),
      });
  }
}
