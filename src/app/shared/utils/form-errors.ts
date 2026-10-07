import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormGroup } from '@angular/forms';

export function fieldErrors(err: unknown): Record<string, string[]> {
  if (err instanceof HttpErrorResponse && err.error && typeof err.error === 'object') {
    const errors = (err.error as { errors?: Record<string, string[]> }).errors;
    if (errors && typeof errors === 'object') return errors;
  }
  return {};
}

export function serverMessage(err: unknown): string | null {
  if (err instanceof HttpErrorResponse && err.error && typeof err.error === 'object') {
    const body = err.error as { detail?: string; title?: string };
    return body.detail ?? body.title ?? null;
  }
  return null;
}

export function applyServerErrors(
  form: FormGroup,
  err: unknown,
  aliases: Record<string, string> = {},
): boolean {
  let applied = false;
  for (const [apiName, messages] of Object.entries(fieldErrors(err))) {
    const name = aliases[apiName] ?? apiName.charAt(0).toLowerCase() + apiName.slice(1);
    const control: AbstractControl | null = form.get(name);
    if (control && messages.length) {
      control.setErrors({ ...(control.errors ?? {}), server: messages[0] });
      control.markAsTouched();
      applied = true;
    }
  }
  return applied;
}

export function errorText(control: AbstractControl | null, label: string): string | null {
  if (!control || !control.errors || !(control.touched || control.dirty)) return null;
  const e = control.errors;
  if (e['server']) return e['server'];
  if (e['required']) return `${label} is required.`;
  if (e['minlength']) return `${label} must be at least ${e['minlength'].requiredLength} characters.`;
  if (e['maxlength']) return `${label} cannot exceed ${e['maxlength'].requiredLength} characters.`;
  if (e['min']) return `${label} must be at least ${e['min'].min}.`;
  if (e['max']) return `${label} cannot be more than ${e['max'].max}.`;
  if (e['email']) return 'Enter a valid email address.';
  if (e['pattern']) return `${label} is not in a valid format.`;
  for (const value of Object.values(e)) if (typeof value === 'string') return value;
  return `${label} is not valid.`;
}
