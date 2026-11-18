import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { distinctUntilChanged, finalize, map } from 'rxjs';
import {
  ApiResponse,
  Quotation,
  QuotationStatus,
} from '../../core/models/api.models';
import { apiErrorMessage } from '../../core/services/api-error';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/icon.component';

type Action = 'status' | 'duplicate' | 'pdf' | null;

@Component({
  imports: [CurrencyPipe, DatePipe, IconComponent, RouterLink],
  templateUrl: './quotation-detail.component.html',
  styleUrl: './quotation-detail.component.scss',
})
export class QuotationDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected id = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly quotation = signal<Quotation | null>(null);
  protected readonly loading = signal(true);
  protected readonly busyAction = signal<Action>(null);
  protected readonly errorMessage = signal('');
  protected readonly actionError = signal('');
  protected readonly isAdministrator = this.auth.user()?.role === 'ADMINISTRADOR';

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => {
        this.id = id;
        this.quotation.set(null);
        this.actionError.set('');
        this.loadQuotation();
      });
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

  canExpire(): boolean {
    const current = this.quotation();
    if (!current || !['PENDIENTE', 'ENVIADA'].includes(current.status)) return false;
    return current.expirationDate.slice(0, 10) < new Date().toISOString().slice(0, 10);
  }

  hasDiscount(quote: Quotation): boolean {
    return Number(quote.discountTotal) > 0;
  }

  changeStatus(status: QuotationStatus): void {
    this.busyAction.set('status');
    this.actionError.set('');
    this.api
      .patch<ApiResponse<Quotation>>(`/quotations/${this.id}/status`, { status })
      .pipe(finalize(() => this.busyAction.set(null)))
      .subscribe({
        next: () => this.loadQuotation(),
        error: (error: unknown) =>
          this.actionError.set(apiErrorMessage(error, 'No se pudo actualizar el estado.')),
      });
  }

  duplicate(): void {
    this.busyAction.set('duplicate');
    this.actionError.set('');
    this.api
      .post<ApiResponse<Quotation>>(`/quotations/${this.id}/duplicate`, {})
      .pipe(finalize(() => this.busyAction.set(null)))
      .subscribe({
        next: ({ data }) => void this.router.navigate(['/quotations', data.id]),
        error: (error: unknown) =>
          this.actionError.set(apiErrorMessage(error, 'No se pudo crear una nueva revisión.')),
      });
  }

  downloadPdf(): void {
    const quote = this.quotation();
    if (!quote) return;

    this.busyAction.set('pdf');
    this.actionError.set('');
    this.api
      .getBlob(`/quotations/${this.id}/pdf`)
      .pipe(finalize(() => this.busyAction.set(null)))
      .subscribe({
        next: (file) => {
          const url = URL.createObjectURL(file);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${quote.number.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`;
          link.click();
          URL.revokeObjectURL(url);
        },
        error: (error: unknown) =>
          this.actionError.set(apiErrorMessage(error, 'No se pudo descargar el PDF.')),
      });
  }

  private loadQuotation(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.api
      .get<ApiResponse<Quotation>>(`/quotations/${this.id}`)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ data }) => this.quotation.set(data),
        error: (error: unknown) =>
          this.errorMessage.set(apiErrorMessage(error, 'No se pudo cargar la cotización.')),
      });
  }
}
