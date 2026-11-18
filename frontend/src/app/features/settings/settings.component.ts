import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiResponse, CompanySettings } from '../../core/models/api.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ApiService } from '../../core/services/api.service';

const validTaxRate: ValidatorFn = (control) => {
  const value = Number(control.value);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? null : { taxRate: true };
};

const validValidityDays: ValidatorFn = (control) => {
  if (!control.value) return null;
  const value = Number(control.value);
  return Number.isInteger(value) && value >= 1 && value <= 365 ? null : { validityDays: true };
};

@Component({
  imports: [ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly settings = signal<CompanySettings | null>(null);
  protected readonly logoPreview = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly saveError = signal('');
  protected readonly logoError = signal('');
  protected readonly saved = signal(false);
  protected readonly form = this.formBuilder.group({
    commercialName: ['', Validators.maxLength(200)],
    taxIdentification: ['', Validators.maxLength(64)],
    logoData: [''],
    email: ['', [Validators.email, Validators.maxLength(320)]],
    phone: ['', Validators.maxLength(40)],
    address: ['', Validators.maxLength(240)],
    city: ['', Validators.maxLength(120)],
    department: ['', Validators.maxLength(120)],
    currency: ['COP', [Validators.required, Validators.pattern(/^[A-Z]{3}$/)]],
    taxRate: ['0', [Validators.required, Validators.pattern(/^\d{1,3}(\.\d{1,2})?$/), validTaxRate]],
    defaultValidityDays: ['', [Validators.pattern(/^\d{1,3}$/), validValidityDays]],
    defaultTerms: ['', Validators.maxLength(10000)],
    discountsEnabled: this.formBuilder.control(false),
    quotationPrefix: ['TP', [Validators.required, Validators.minLength(2), Validators.maxLength(12), Validators.pattern(/^[A-Z0-9]+$/)]],
  });

  ngOnInit(): void {
    this.loadSettings();
  }

  selectLogo(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const file = input.files?.[0];
    if (!file) return;

    this.logoError.set('');
    if (file.type !== 'image/png') {
      this.logoError.set('El logotipo debe ser una imagen PNG.');
      input.value = '';
      return;
    }
    if (file.size > 500_000) {
      this.logoError.set('El archivo no puede superar los 500 KB.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string' || reader.result.length > 700_000) {
        this.logoError.set('No se pudo leer el logotipo o supera el tamaño permitido.');
        return;
      }
      this.form.controls.logoData.setValue(reader.result);
      this.logoPreview.set(reader.result);
      this.saved.set(false);
    };
    reader.onerror = () => this.logoError.set('No se pudo leer el archivo seleccionado.');
    reader.readAsDataURL(file);
    input.value = '';
  }

  removeLogo(): void {
    this.form.controls.logoData.setValue('');
    this.logoPreview.set(null);
    this.logoError.set('');
    this.saved.set(false);
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    const payload = {
      commercialName: values.commercialName.trim() || null,
      taxIdentification: values.taxIdentification.trim() || null,
      logoData: values.logoData || null,
      email: values.email.trim() || null,
      phone: values.phone.trim() || null,
      address: values.address.trim() || null,
      city: values.city.trim() || null,
      department: values.department.trim() || null,
      currency: values.currency.trim().toUpperCase(),
      taxRate: values.taxRate.trim(),
      defaultValidityDays: values.defaultValidityDays
        ? Number(values.defaultValidityDays)
        : null,
      defaultTerms: values.defaultTerms.trim() || null,
      discountsEnabled: values.discountsEnabled,
      quotationPrefix: values.quotationPrefix.trim().toUpperCase(),
    };

    this.saving.set(true);
    this.saved.set(false);
    this.saveError.set('');
    this.api
      .put<ApiResponse<CompanySettings>>('/settings', payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: ({ data }) => {
          this.settings.set(data);
          this.logoPreview.set(data.logoData);
          this.saved.set(true);
        },
        error: (error: unknown) =>
          this.saveError.set(apiErrorMessage(error, 'No se pudo guardar la configuración.')),
      });
  }

  protected loadSettings(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.api
      .get<ApiResponse<CompanySettings>>('/settings')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ data }) => {
          this.settings.set(data);
          this.logoPreview.set(data.logoData);
          this.form.reset({
            commercialName: data.commercialName ?? '',
            taxIdentification: data.taxIdentification ?? '',
            logoData: data.logoData ?? '',
            email: data.email ?? '',
            phone: data.phone ?? '',
            address: data.address ?? '',
            city: data.city ?? '',
            department: data.department ?? '',
            currency: data.currency,
            taxRate: data.taxRate,
            defaultValidityDays: data.defaultValidityDays?.toString() ?? '',
            defaultTerms: data.defaultTerms ?? '',
            discountsEnabled: data.discountsEnabled,
            quotationPrefix: data.quotationPrefix,
          });
        },
        error: (error: unknown) =>
          this.errorMessage.set(apiErrorMessage(error, 'No se pudo cargar la configuración.')),
      });
  }
}
