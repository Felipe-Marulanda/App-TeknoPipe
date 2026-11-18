import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import {
  ApiResponse,
  Client,
  PaginatedResponse,
  Product,
  Quotation,
} from '../../core/models/api.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ApiService } from '../../core/services/api.service';
import { toHttpParams } from '../../core/services/http-params';
import { IconComponent } from '../../shared/icon.component';

type QuotationLineForm = FormGroup<{
  productId: FormControl<string>;
  quantity: FormControl<string>;
  discountAmount: FormControl<string>;
}>;

const positiveNumber: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = Number(control.value);
  return Number.isFinite(value) && value > 0 ? null : { positive: true };
};

@Component({
  imports: [IconComponent, ReactiveFormsModule, RouterLink],
  templateUrl: './quotation-editor.component.html',
  styleUrl: './quotation-editor.component.scss',
})
export class QuotationEditorComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly quotationId = this.route.snapshot.paramMap.get('id');
  protected readonly quote = signal<Quotation | null>(null);
  protected readonly clients = signal<Client[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly optionsLoading = signal(true);
  protected readonly quoteLoading = signal(!!this.quotationId);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly formError = signal('');
  protected readonly form = this.formBuilder.group({
    clientId: ['', Validators.required],
    expirationDate: [''],
    observations: ['', Validators.maxLength(5000)],
    commercialTerms: ['', Validators.maxLength(5000)],
    items: this.formBuilder.array<QuotationLineForm>([this.createLine()], Validators.minLength(1)),
  });
  protected readonly ready = computed(
    () => !this.optionsLoading() && !this.quoteLoading() && !this.errorMessage(),
  );
  protected readonly today = new Date().toISOString().slice(0, 10);

  ngOnInit(): void {
    this.loadOptions();
    if (this.quotationId) this.loadQuotation(this.quotationId);
  }

  get lines(): FormArray<QuotationLineForm> {
    return this.form.controls.items;
  }

  addLine(): void {
    if (this.lines.length >= 100) return;
    this.lines.push(this.createLine());
  }

  removeLine(index: number): void {
    if (this.lines.length <= 1) return;
    this.lines.removeAt(index);
  }

  productFor(productId: string): Product | undefined {
    return this.products().find((product) => product.id === productId);
  }

  submit(): void {
    if (this.form.invalid || this.saving() || !this.ready()) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.quote() && this.quote()?.status !== 'BORRADOR') {
      this.formError.set('Solo se pueden editar cotizaciones en borrador.');
      return;
    }

    const values = this.form.getRawValue();
    const payload = {
      clientId: values.clientId,
      expirationDate: values.expirationDate || undefined,
      observations: values.observations.trim(),
      commercialTerms: values.commercialTerms.trim() || (this.quotationId ? '' : undefined),
      items: values.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity.trim(),
        discountAmount: item.discountAmount.trim() || '0',
      })),
    };
    const request = this.quotationId
      ? this.api.put<ApiResponse<Quotation>>(`/quotations/${this.quotationId}`, payload)
      : this.api.post<ApiResponse<Quotation>>('/quotations', payload);

    this.formError.set('');
    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: ({ data }) => void this.router.navigate(['/quotations', data.id]),
      error: (error: unknown) =>
        this.formError.set(apiErrorMessage(error, 'No se pudo guardar la cotización.')),
    });
  }

  private createLine(): QuotationLineForm {
    return this.formBuilder.group({
      productId: ['', Validators.required],
      quantity: [
        '1',
        [
          Validators.required,
          Validators.pattern(/^\d{1,11}(\.\d{1,3})?$/),
          positiveNumber,
        ],
      ],
      discountAmount: [
        '0',
        [Validators.required, Validators.pattern(/^\d{1,12}(\.\d{1,2})?$/)],
      ],
    });
  }

  private loadOptions(): void {
    forkJoin({
      clients: this.api.get<PaginatedResponse<Client>>(
        '/clients',
        toHttpParams({ page: 1, pageSize: 100, active: 'true' }),
      ),
      products: this.api.get<PaginatedResponse<Product>>(
        '/products',
        toHttpParams({ page: 1, pageSize: 100, active: 'true' }),
      ),
    })
      .pipe(finalize(() => this.optionsLoading.set(false)))
      .subscribe({
        next: ({ clients, products }) => {
          this.clients.set(clients.data);
          this.products.set(products.data);
        },
        error: (error: unknown) =>
          this.errorMessage.set(apiErrorMessage(error, 'No se pudieron cargar clientes y productos.')),
      });
  }

  private loadQuotation(id: string): void {
    this.api
      .get<ApiResponse<Quotation>>(`/quotations/${id}`)
      .pipe(finalize(() => this.quoteLoading.set(false)))
      .subscribe({
        next: ({ data }) => {
          this.quote.set(data);
          this.form.patchValue({
            clientId: data.clientId,
            expirationDate: data.expirationDate.slice(0, 10),
            observations: data.observations ?? '',
            commercialTerms: data.commercialTerms ?? '',
          });
          this.lines.clear();
          for (const item of data.items) {
            this.lines.push(
              this.formBuilder.group({
                productId: [item.productId ?? '', Validators.required],
                quantity: [
                  item.quantity,
                  [
                    Validators.required,
                    Validators.pattern(/^\d{1,11}(\.\d{1,3})?$/),
                    positiveNumber,
                  ],
                ],
                discountAmount: [
                  item.discountAmount,
                  [Validators.required, Validators.pattern(/^\d{1,12}(\.\d{1,2})?$/)],
                ],
              }),
            );
          }
          if (this.lines.length === 0) this.lines.push(this.createLine());
        },
        error: (error: unknown) =>
          this.errorMessage.set(apiErrorMessage(error, 'No se pudo abrir la cotización.')),
      });
  }
}
