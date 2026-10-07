import { HttpParams } from '@angular/common/http';

type ParamValue = string | number | boolean | null | undefined | readonly (string | number)[];

export function toParams(values: Record<string, ParamValue>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      for (const item of value) params = params.append(key, String(item));
    } else {
      params = params.set(key, String(value));
    }
  }
  return params;
}
