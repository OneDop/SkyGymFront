import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardSummary } from '../../core/models/api.models';
import { toParams } from '../../core/http/params';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  summary(branchId: string | null): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${environment.apiUrl}/dashboard/summary`, {
      params: toParams({ branchId }),
    });
  }
}
