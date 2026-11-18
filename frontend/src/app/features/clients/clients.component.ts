import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiResponse, Client, PaginatedResponse } from '../../core/models/api.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { toHttpParams } from '../../core/services/http-params';
import { IconComponent } from '../../shared/icon.component';

type ActiveFilter = 'all' | 'true' | 'false';

@Component({
  imports: [IconComponent, ReactiveFormsModule],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss',
})
export class ClientsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly pageSize = 20;

  protected readonly isAdministrator = computed(
    () => this.auth.user()?.role === 'ADMINISTRADOR',
  );
  protected readonly clients = signal<Client[]>([]);
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly formOpen = signal(false);
  protected readonly selectedClient = signal<Client | null>(null);
  protected readonly busyClientId = signal<string | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly formError = signal('');
  protected readonly filters = this.formBuilder.group({
    search: [''],
    active: this.formBuilder.control<ActiveFilter>('all'),
  });
  protected readonly form = this.formBuilder.group({
    identificationType: ['NIT', Validators.required],
    identificationNumber: ['', [Validators.required, Validators.maxLength(64)]],
    legalName: ['', [Validators.required, Validators.maxLength(200)]],
    contactName: ['', Validators.maxLength(160)],
    email: ['', Validators.email],
    phone: ['', Validators.maxLength(40)],
    address: ['', Validators.maxLength(240)],
    city: ['', Validators.maxLength(120)],
    department: ['', Validators.maxLength(120)],
  });

  ngOnInit(): void {
    this.loadClients();
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.total() / this.pageSize));
  }

  search(): void {
    this.page.set(1);
    this.loadClients();
  }

  changeFilter(): void {
    this.page.set(1);
    this.loadClients();
  }

  previousPage(): void {
    if (this.page() <= 1) return;
    this.page.update((value) => value - 1);
    this.loadClients();
  }

  nextPage(): void {
    if (this.page() >= this.pageCount) return;
    this.page.update((value) => value + 1);
    this.loadClients();
  }

  location(client: Client): string {
    return [client.city, client.department].filter((part) => part !== null && part !== '').join(', ') || '—';
  }

  openCreate(): void {
    this.selectedClient.set(null);
    this.formError.set('');
    this.form.reset({
      identificationType: 'NIT',
      identificationNumber: '',
      legalName: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      department: '',
    });
    this.formOpen.set(true);
  }

  openEdit(client: Client): void {
    this.selectedClient.set(client);
    this.formError.set('');
    this.form.reset({
      identificationType: client.identificationType,
      identificationNumber: client.identificationNumber,
      legalName: client.legalName,
      contactName: client.contactName ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      address: client.address ?? '',
      city: client.city ?? '',
      department: client.department ?? '',
    });
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.selectedClient.set(null);
    this.formError.set('');
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    const payload = {
      identificationType: values.identificationType.trim(),
      identificationNumber: values.identificationNumber.trim(),
      legalName: values.legalName.trim(),
      contactName: values.contactName.trim() || null,
      email: values.email.trim() || null,
      phone: values.phone.trim() || null,
      address: values.address.trim() || null,
      city: values.city.trim() || null,
      department: values.department.trim() || null,
    };
    const selected = this.selectedClient();
    const request = selected
      ? this.api.put<ApiResponse<Client>>(`/clients/${selected.id}`, payload)
      : this.api.post<ApiResponse<Client>>('/clients', payload);

    this.formError.set('');
    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.closeForm();
        this.loadClients();
      },
      error: (error: unknown) =>
        this.formError.set(apiErrorMessage(error, 'No se pudo guardar el cliente.')),
    });
  }

  toggleActive(client: Client): void {
    this.busyClientId.set(client.id);
    this.errorMessage.set('');
    this.api
      .patch<ApiResponse<Client>>(`/clients/${client.id}/status`, { active: !client.active })
      .pipe(finalize(() => this.busyClientId.set(null)))
      .subscribe({
        next: () => this.loadClients(),
        error: (error: unknown) =>
          this.errorMessage.set(apiErrorMessage(error, 'No se pudo actualizar el cliente.')),
      });
  }

  private loadClients(): void {
    const active = this.filters.controls.active.value;
    this.loading.set(true);
    this.errorMessage.set('');
    this.api
      .get<PaginatedResponse<Client>>(
        '/clients',
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
          this.clients.set(response.data);
          this.total.set(response.meta.total);
        },
        error: (error: unknown) =>
          this.errorMessage.set(apiErrorMessage(error, 'No se pudo cargar la lista de clientes.')),
      });
  }
}
