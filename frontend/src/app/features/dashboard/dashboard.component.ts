import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { IconComponent } from '../../shared/icon.component';
import { ApiResponse, DashboardSummary, QuotationStatus } from '../../core/models/api.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ApiService } from '../../core/services/api.service';

interface MonthlyBar {
  month: string;
  quotationCount: number;
  total: string;
  label: string;
  height: number;
}

@Component({
  imports: [CurrencyPipe, DecimalPipe, IconComponent, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly summary = signal<DashboardSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  protected readonly monthlyBars = computed<MonthlyBar[]>(() => {
    const values = this.summary()?.quotationsByMonth ?? [];
    const maxTotal = Math.max(...values.map((entry) => Number(entry.total)), 0);

    return values.map((entry) => ({
      ...entry,
      label: new Date(`${entry.month}-01T00:00:00`).toLocaleDateString('es-CO', {
        month: 'short',
      }),
      height: maxTotal > 0 ? Math.max((Number(entry.total) / maxTotal) * 100, 4) : 4,
    }));
  });

  ngOnInit(): void {
    this.loadSummary();
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

  reload(): void {
    this.loadSummary();
  }

  private loadSummary(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.api
      .get<ApiResponse<DashboardSummary>>('/dashboard/summary')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ data }) => this.summary.set(data),
        error: (error: unknown) =>
          this.errorMessage.set(apiErrorMessage(error, 'No se pudo cargar el resumen comercial.')),
      });
  }
}
