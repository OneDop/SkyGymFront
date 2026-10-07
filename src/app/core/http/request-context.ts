import { HttpContext, HttpContextToken } from '@angular/common/http';

export const PAGE_LOAD = new HttpContextToken<boolean>(() => false);

export const LIST_LOAD = new HttpContextToken<(() => void) | null>(() => null);

export const SILENT = new HttpContextToken<boolean>(() => false);

export const pageLoad = () => new HttpContext().set(PAGE_LOAD, true);
export const listLoad = (retry: () => void) => new HttpContext().set(LIST_LOAD, retry);
