import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiResponse, Category, PaginatedResponse, Product } from '../../core/models/api.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { toHttpParams } from '../../core/services/http-params';
import { IconComponent } from '../../shared/icon.component';

type ActiveFilter = 'all' | 'true' | 'false';

@Component({
  imports: [CurrencyPipe, IconComponent, ReactiveFormsModule],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
})
export class ProductsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly pageSize = 20;

  protected readonly isAdministrator = computed(
    () => this.auth.user()?.role === 'ADMINISTRADOR',
  );
  protected readonly products = signal<Product[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly busyId = signal<string | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly selected = signal<Product | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly formError = signal('');
  protected readonly filters = this.formBuilder.group({
    search: [''],
    active: this.formBuilder.control<ActiveFilter>('all'),
    categoryId: ['all'],
  });
  protected readonly form = this.formBuilder.group({
    reference: ['', [Validators.required, Validators.maxLength(80)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', Validators.maxLength(1000)],
    categoryId: [''],
    unit: ['', [Validators.required, Validators.maxLength(40)]],
    unitPrice: ['', [Validators.required, Validators.pattern(/^\d{1,12}(\.\d{1,2})?$/)]],
  });

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.total() / this.pageSize));
  }

  search(): void {
    this.page.set(1);
    this.loadProducts();
  }

  changeFilter(): void {
    this.page.set(1);
    this.loadProducts();
  }

  movePage(delta: number): void {
    const next = this.page() + delta;
    if (next < 1 || next > this.pageCount) return;
    this.page.set(next);
    this.loadProducts();
  }

  openCreate(): void {
    this.selected.set(null);
    this.formError.set('');
    this.form.reset({
      reference: '',
      name: '',
      description: '',
      categoryId: '',
      unit: 'Unidad',
      unitPrice: '',
    });
    this.formOpen.set(true);
  }

  openEdit(product: Product): void {
    this.selected.set(product);
    this.formError.set('');
    this.form.reset({
      reference: product.reference,
      name: product.name,
      description: product.description ?? '',
      categoryId: product.categoryId ?? '',
      unit: product.unit,
      unitPrice: product.unitPrice,
    });
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
      reference: values.reference.trim(),
      name: values.name.trim(),
      description: values.description.trim() || null,
      categoryId: values.categoryId || null,
      unit: values.unit.trim(),
      unitPrice: values.unitPrice.trim(),
    };
    const product = this.selected();
    const request = product
      ? this.api.put<ApiResponse<Product>>(`/products/${product.id}`, payload)
      : this.api.post<ApiResponse<Product>>('/products', payload);

    this.formError.set('');
    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.closeForm();
        this.loadProducts();
      },
      error: (error: unknown) =>
        this.formError.set(apiErrorMessage(error, 'No se pudo guardar el producto.')),
    });
  }

  toggleActive(product: Product): void {
    this.busyId.set(product.id);
    this.errorMessage.set('');
    this.api
      .patch<ApiResponse<Product>>(`/products/${product.id}/status`, {
        active: !product.active,
      })
      .pipe(finalize(() => this.busyId.set(null)))
      .subscribe({
        next: () => this.loadProducts(),
        error: (error: unknown) =>
          this.errorMessage.set(apiErrorMessage(error, 'No se pudo actualizar el producto.')),
      });
  }

  private loadCategories(): void {
    this.api
      .get<PaginatedResponse<Category>>(
        '/categories',
        toHttpParams({ page: 1, pageSize: 100 }),
      )
      .subscribe({
        next: (response) => this.categories.set(response.data),
        error: (error: unknown) =>
          this.errorMessage.set(apiErrorMessage(error, 'No se pudieron cargar las categorías.')),
      });
  }

  private loadProducts(): void {
    const active = this.filters.controls.active.value;
    const categoryId = this.filters.controls.categoryId.value;
    this.loading.set(true);
    this.errorMessage.set('');
    this.api
      .get<PaginatedResponse<Product>>(
        '/products',
        toHttpParams({
          page: this.page(),
          pageSize: this.pageSize,
          search: this.filters.controls.search.value.trim(),
          active: active === 'all' ? undefined : active,
          categoryId: categoryId === 'all' ? undefined : categoryId,
        }),
      )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.products.set(response.data);
          this.total.set(response.meta.total);
        },
        error: (error: unknown) =>
          this.errorMessage.set(apiErrorMessage(error, 'No se pudo cargar el catálogo de productos.')),
      });
  }
}
