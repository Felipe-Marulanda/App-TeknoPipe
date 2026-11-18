import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, NonNullableFormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { PaginatedResponse, QuotationStatus, QuotationSummary } from '../../core/models/api.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ApiService } from '../../core/services/api.service';
import { toHttpParams } from '../../core/services/http-params';
import { IconComponent } from '../../shared/icon.component';

type StatusFilter = 'all' | QuotationStatus;

@Component({
  imports: [CurrencyPipe, DatePipe, IconComponent, ReactiveFormsModule, RouterLink],
  templateUrl: './quotations.component.html',
  styleUrl: './quotations.component.scss',
})
export class QuotationsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly pageSize = 20;

  protected readonly quotations = signal<QuotationSummary[]>([]);
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly filters = this.formBuilder.group({
    search: [''],
    status: this.formBuilder.control<StatusFilter>('all'),
  });

  ngOnInit(): void {
    this.load();
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.total() / this.pageSize));
  }

  statusLabel(status: QuotationStatus): string {
    const labels: Record<QuotationStatus, string> = {
      BORRADOR: 'Borrador',
      PENDIENTE: 'Pendiente',
      ENVIADA: 'Enviada',
      APROBADA: 'Aprobada',
      RECHAZADA: 'Rechazada',
      VENCIDA: 'Vencida',
    };
    return labels[status];
  }

  search(): void {
    this.page.set(1);
    this.load();
  }

  changeStatus(): void {
    this.page.set(1);
    this.load();
  }

  movePage(delta: number): void {
    const next = this.page() + delta;
    if (next < 1 || next > this.pageCount) return;
    this.page.set(next);
    this.load();
  }

  private load(): void {
    const status = this.filters.controls.status.value;
    this.loading.set(true);
    this.errorMessage.set('');
    this.api
      .get<PaginatedResponse<QuotationSummary>>(
        '/quotations',
        toHttpParams({
          page: this.page(),
          pageSize: this.pageSize,
          search: this.filters.controls.search.value.trim(),
          status: status === 'all' ? undefined : status,
        }),
      )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.quotations.set(response.data);
          this.total.set(response.meta.total);
        },
        error: (error: unknown) =>
          this.errorMessage.set(apiErrorMessage(error, 'No se pudieron cargar las cotizaciones.')),
      });
  }
}
