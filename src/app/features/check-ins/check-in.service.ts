import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CheckInOutcome } from '../../core/models/api.models';

export interface CheckInRequest {
  memberId: string;
  branchId: string;
  occurredAt: string;
  notes: string | null;
}

@Injectable({ providedIn: 'root' })
export class CheckInService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/checkins`;

  readonly recorded = signal(0);

  record(body: CheckInRequest): Observable<CheckInOutcome> {
    return this.http
      .post<CheckInOutcome>(this.url, body)
      .pipe(tap(() => this.recorded.update((n) => n + 1)));
  }
}
