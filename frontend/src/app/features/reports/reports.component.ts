import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  QuotationStatus,
} from '../../core/models/api.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ApiService } from '../../core/services/api.service';
import { toHttpParams } from '../../core/services/http-params';
import { IconComponent } from '../../shared/icon.component';

type ReportType = 'quotations' | 'clients' | 'users';
type StatusFilter = 'all' | QuotationStatus;

function localDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

interface ReportMeta {
  page: number;
  pageSize: number;
  total: number;
  quotedValue?: string;
}

interface ReportResponse<T> {
  data: T[];
  meta: ReportMeta;
}

interface QuotationReportRow {
  number: string;
  status: QuotationStatus;
  issueDate: string;
  expirationDate: string;
  clientName: string;
  createdBy: string;
  total: string;
  currency: string;
}

interface ClientReportRow {
  clientId: string;
  clientName: string;
  quotationCount: number;
  quotedValue: string;
}

interface UserReportRow {
  userId: string;
  fullName: string;
  quotationCount: number;
  quotedValue: string;
}

type ReportState =
  | { kind: 'quotations'; data: QuotationReportRow[]; meta: ReportMeta }
  | { kind: 'clients'; data: ClientReportRow[]; meta: ReportMeta }
  | { kind: 'users'; data: UserReportRow[]; meta: ReportMeta };

@Component({
  imports: [CurrencyPipe, DatePipe, DecimalPipe, IconComponent, ReactiveFormsModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly pageSize = 25;

  protected readonly page = signal(1);
  protected readonly loading = signal(true);
  protected readonly downloading = signal(false);
  protected readonly report = signal<ReportState | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly rangeError = signal('');
  protected readonly filters = this.formBuilder.group({
    reportType: this.formBuilder.control<ReportType>('quotations'),
    status: this.formBuilder.control<StatusFilter>('all'),
    from: [localDate(new Date(new Date().getFullYear(), 0, 1))],
    to: [localDate(new Date())],
  });
  protected readonly quotationRows = computed(() => {
    const report = this.report();
    return report?.kind === 'quotations' ? report.data : [];
  });
  protected readonly clientRows = computed(() => {
    const report = this.report();
    return report?.kind === 'clients' ? report.data : [];
  });
  protected readonly userRows = computed(() => {
    const report = this.report();
    return report?.kind === 'users' ? report.data : [];
  });
  protected readonly reportMeta = computed(() => this.report()?.meta ?? null);

  get pageCount(): number {
    const meta = this.reportMeta();
    return meta ? Math.max(1, Math.ceil(meta.total / meta.pageSize)) : 1;
  }

  ngOnInit(): void {
    this.load();
  }

  changeReport(): void {
    this.search();
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

  movePage(delta: number): void {
    const meta = this.reportMeta();
    if (!meta) return;
    const next = this.page() + delta;
    if (next < 1 || next > this.pageCount) return;
    this.page.set(next);
    this.load();
  }

  downloadCsv(): void {
    if (!this.report()?.data.length) return;
    const type = this.filters.controls.reportType.value;
    const path = `/reports/${type}`;
    const params = this.params(true).set('page', 1).set('pageSize', 500);
    this.downloading.set(true);
    this.errorMessage.set('');
    this.api
      .getBlob(`${path}?${params.toString()}`)
      .pipe(finalize(() => this.downloading.set(false)))
      .subscribe({
        next: (file) => {
          const url = URL.createObjectURL(file);
          const link = document.createElement('a');
          link.href = url;
          link.download = `reporte-${type}-${this.today()}.csv`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
        error: (error: unknown) =>
          this.errorMessage.set(apiErrorMessage(error, 'No se pudo exportar el informe.')),
      });
  }

  private load(): void {
    const type = this.filters.controls.reportType.value;
    this.loading.set(true);
    this.errorMessage.set('');
    this.report.set(null);

    switch (type) {
      case 'quotations':
        this.fetchReport<QuotationReportRow>('/reports/quotations', (result) =>
          this.report.set({ kind: 'quotations', ...result }),
        );
        break;
      case 'clients':
        this.fetchReport<ClientReportRow>('/reports/clients', (result) =>
          this.report.set({ kind: 'clients', ...result }),
        );
        break;
      case 'users':
        this.fetchReport<UserReportRow>('/reports/users', (result) =>
          this.report.set({ kind: 'users', ...result }),
        );
        break;
    }
  }

  private fetchReport<T>(path: string, onData: (result: ReportResponse<T>) => void): void {
    this.api
      .get<ReportResponse<T>>(path, this.params(false))
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: onData,
        error: (error: unknown) =>
          this.errorMessage.set(apiErrorMessage(error, 'No se pudo generar el informe.')),
      });
  }

  private params(csv: boolean) {
    const values = this.filters.getRawValue();
    return toHttpParams({
      from: values.from,
      to: values.to,
      status:
        values.reportType === 'quotations' && values.status !== 'all'
          ? values.status
          : undefined,
      format: csv ? 'csv' : 'json',
      page: this.page(),
      pageSize: this.pageSize,
    });
  }

  private today(): string {
    return localDate(new Date());
  }
}
