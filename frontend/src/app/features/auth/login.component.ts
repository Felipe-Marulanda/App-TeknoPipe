import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { apiErrorMessage } from '../../core/services/api-error';
import { AuthService } from '../../core/services/auth.service';

@Component({
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal(
    this.route.snapshot.queryParamMap.get('notice') ?? '',
  );
  protected readonly showPassword = signal(false);
  protected readonly currentYear = new Date().getFullYear();

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    this.submitting.set(true);
    const { email, password } = this.form.getRawValue();

    this.auth
      .login(email.trim(), password)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          const destination =
            returnUrl?.startsWith('/') && !returnUrl.startsWith('//')
              ? returnUrl
              : '/dashboard';
          void this.router.navigateByUrl(destination);
        },
        error: (error: unknown) =>
          this.errorMessage.set(apiErrorMessage(error, 'No fue posible iniciar sesión.')),
      });
  }
}
