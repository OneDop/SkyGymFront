import { Component, inject, input } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../services/auth.service';
import { AutofocusDirective } from '../../../shared/directives/autofocus.directive';

@Component({
  selector: 'app-sign-in',
  imports: [ReactiveFormsModule, MatInputModule, AutofocusDirective],
  template: `
    <div class="wrap">
      <form class="card" (ngSubmit)="submit()">
        <div class="brand">Titan Fitness <span>Staff Portal</span></div>
        <h1>Sign in</h1>
        <p class="sub">Your session has ended. Sign in to continue where you left off.</p>
        <div class="field">
          <label class="field-label" for="staff">Staff name<span class="req">*</span></label>
          <mat-form-field>
            <input matInput id="staff" [formControl]="name" appAutofocus autocomplete="name" />
          </mat-form-field>
          @if (name.touched && name.invalid) { <span class="field-error">Enter your name.</span> }
        </div>
        <button type="submit" class="btn btn-primary btn-block">Sign in</button>
      </form>
    </div>
  `,
  styles: `
    .wrap { min-height: 100vh; display: grid; place-items: center; background: var(--tf-navy); padding: 16px; }
    .card { width: 400px; max-width: 100%; padding: 36px; box-sizing: border-box; }
    .brand { font-weight: 700; font-size: 20px; color: var(--tf-navy); }
    .brand span { display: block; font-weight: 400; font-size: 14px; color: var(--tf-muted); }
    h1 { margin: 24px 0 4px; }
    .sub { margin: 0 0 20px; color: var(--tf-muted); }
    .btn-block { margin-top: 12px; }
  `,
})
export class SignIn {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly returnUrl = input<string>('/dashboard');
  protected readonly name = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  protected submit(): void {
    if (this.name.invalid) {
      this.name.markAsTouched();
      return;
    }
    this.auth.signIn(this.name.value);
    this.router.navigateByUrl(this.returnUrl() || '/dashboard');
  }
}
