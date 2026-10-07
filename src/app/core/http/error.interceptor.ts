import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { fieldErrors, serverMessage } from '../../shared/utils/form-errors';
import { LIST_LOAD, PAGE_LOAD, SILENT } from './request-context';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);
  const router = inject(Router);

  const token = auth.token();
  const request = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) return throwError(() => err);

      const silent = request.context.get(SILENT);
      const isPageLoad = request.context.get(PAGE_LOAD);
      const retry = request.context.get(LIST_LOAD);
      const notify = (message: string, onRetry?: () => void) => {
        if (!silent) toast.error(message, onRetry);
      };

      switch (err.status) {
        case 0:
          notify("Can't reach the server. Check your connection.");
          break;

        case 400:
        case 422:
          if (Object.keys(fieldErrors(err)).length === 0) {
            notify(serverMessage(err) ?? 'The request was not valid.');
          }
          break;

        case 401:
          auth.clear();
          router.navigate(['/sign-in'], { queryParams: { returnUrl: router.url } });
          break;

        case 403:
          notify("You don't have permission to do this.");
          if (isPageLoad) router.navigate(['/access-denied'], { skipLocationChange: true });
          break;

        case 404:
          if (!isPageLoad) notify('The item no longer exists.');
          break;

        case 409:
          notify(serverMessage(err) ?? 'This item was changed by someone else.');
          break;

        default:
          if (err.status >= 500) {
            notify('Something went wrong. Please try again.', retry ?? undefined);
          }
      }

      return throwError(() => err);
    }),
  );
};
