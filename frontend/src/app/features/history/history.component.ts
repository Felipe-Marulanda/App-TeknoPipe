import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { QuotationStatus } from '../../core/models/api.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ApiService } from '../../core/services/api.service';
import { toHttpParams } from '../../core/services/http-params';

type StatusFilter = 'all' | QuotationStatus;

interface HistoryRecord {
  id: string;
  number: string;
  status: QuotationStatus;
  issueDate: string;
  expirationDate: string;
  total: string;
  currency: string;
  clientNameSnapshot: string;
  client: { id: string; legalName: string };
  createdBy: { id: string; fullName: string };
}

interface HistoryResponse {
  data: HistoryRecord[];
  meta: { page: number; pageSize: number; total: number };
}

@Component({
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
})
export class HistoryComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly pageSize = 20;

  protected readonly records = signal<HistoryRecord[]>([]);
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly rangeError = signal('');
  protected readonly filters = this.formBuilder.group({
    search: [''],
    status: this.formBuilder.control<StatusFilter>('all'),
    from: [''],
    to: [''],
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
    const { from, to } = this.filters.getRawValue();
    if (from && to && from > to) {
      this.rangeError.set('La fecha inicial debe ser anterior o igual a la fecha final.');
      return;
    }
    this.rangeError.set('');
    this.page.set(1);
    this.load();
  }

  changeStatus(): void {
    this.search();
  }

  movePage(delta: number): void {
    const next = this.page() + delta;
    if (next < 1 || next > this.pageCount) return;
    this.page.set(next);
    this.load();
  }

  private load(): void {
    const values = this.filters.getRawValue();
    this.loading.set(true);
    this.errorMessage.set('');
    this.api
      .get<HistoryResponse>(
        '/history',
        toHttpParams({
          page: this.page(),
          pageSize: this.pageSize,
          search: values.search.trim(),
          status: values.status === 'all' ? undefined : values.status,
          from: values.from,
          to: values.to,
        }),
      )
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.records.set(response.data);
          this.total.set(response.meta.total);
        },
        error: (error: unknown) =>
          this.errorMessage.set(apiErrorMessage(error, 'No se pudo cargar el historial.')),
      });
  }
}
