import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiResponse, Category, PaginatedResponse } from '../../core/models/api.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { toHttpParams } from '../../core/services/http-params';
import { IconComponent } from '../../shared/icon.component';

type ActiveFilter = 'all' | 'true' | 'false';

@Component({
  imports: [IconComponent, ReactiveFormsModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss',
})
export class CategoriesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly pageSize = 20;

  protected readonly isAdministrator = computed(
    () => this.auth.user()?.role === 'ADMINISTRADOR',
  );
  protected readonly categories = signal<Category[]>([]);
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly busyId = signal<string | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly selected = signal<Category | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly formError = signal('');
  protected readonly filters = this.formBuilder.group({
    search: [''],
    active: this.formBuilder.control<ActiveFilter>('all'),
  });
  protected readonly form = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', Validators.maxLength(500)],
  });

  ngOnInit(): void {
    this.load();
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.total() / this.pageSize));
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
    this.form.reset({ name: '', description: '' });
    this.formOpen.set(true);
  }

  openEdit(category: Category): void {
    this.selected.set(category);
    this.formError.set('');
    this.form.reset({ name: category.name, description: category.description ?? '' });
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
    const payload = {
      name: values.name.trim(),
      description: values.description.trim() || null,
    };
    const category = this.selected();
    const request = category
      ? this.api.put<ApiResponse<Category>>(`/categories/${category.id}`, payload)
      : this.api.post<ApiResponse<Category>>('/categories', payload);

    this.formError.set('');
    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.closeForm();
        this.load();
      },
      error: (error: unknown) =>
        this.formError.set(apiErrorMessage(error, 'No se pudo guardar la categoría.')),
    });
  }

  toggleActive(category: Category): void {
    this.busyId.set(category.id);
    this.errorMessage.set('');
    this.api
      .patch<ApiResponse<Category>>(`/categories/${category.id}/status`, {
        active: !category.active,
      })
      .pipe(finalize(() => this.busyId.set(null)))
      .subscribe({
        next: () => this.load(),
        error: (error: unknown) =>
          this.errorMessage.set(apiErrorMessage(error, 'No se pudo actualizar la categoría.')),
      });
  }

  private load(): void {
    const active = this.filters.controls.active.value;
    this.loading.set(true);
    this.errorMessage.set('');
    this.api
      .get<PaginatedResponse<Category>>(
        '/categories',
        toHttpParams({
          page: this.page(),
          pageSize: this.pageSize,
          search: this.filters.controls.search.value.trim(),
          active: active === 'all' ? undefined : active,
        }),
      )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.categories.set(response.data);
          this.total.set(response.meta.total);
        },
        error: (error: unknown) =>
          this.errorMessage.set(apiErrorMessage(error, 'No se pudo cargar el catálogo de categorías.')),
      });
  }
}
