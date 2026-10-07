import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const PERSON_NAME = /^[\p{L}\s'-]+$/u;
export const PHONE = /^\+?[0-9\s\-().]{7,20}$/;

export function trimmedLength(min: number, max: number): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    const value = (c.value ?? '').toString().trim();
    if (!value) return null;
    if (value.length < min || value.length > max) {
      return { trimmedLength: `Must be ${min}-${max} characters.` };
    }
    return null;
  };
}

export function pattern(regex: RegExp, message: string): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    const value = (c.value ?? '').toString().trim();
    return !value || regex.test(value) ? null : { format: message };
  };
}

export function wholeNumber(message = 'Enter a whole number.'): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    const v = c.value;
    if (v === null || v === undefined || v === '') return null;
    return Number.isInteger(Number(v)) ? null : { wholeNumber: message };
  };
}

export function maxDecimals(places: number): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    const v = c.value;
    if (v === null || v === undefined || v === '') return null;
    const [, decimals = ''] = String(v).split('.');
    return decimals.length <= places ? null : { decimals: `Use at most ${places} decimal places.` };
  };
}
