import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AccessScope, PagedResult, Plan, PlanFilterOptions, SortDir } from '../../core/models/api.models';
import { toParams } from '../../core/http/params';

export interface PlanQuery {
  search?: string;
  durations?: number[];
  accessScope?: AccessScope | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  isPublished?: boolean | null;
  sortBy?: string;
  sortDir?: SortDir;
  page?: number;
  pageSize?: number;
}

export interface PlanRequest {
  name: string;
  price: number;
  durationInMonths: number;
  maxFreezeDays: number;
  maxFreezeCount: number;
  guestPassQuota: number;
  accessScope: AccessScope | null;
  isPublished: boolean;
}

@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/plans`;

  list(query: PlanQuery, context?: HttpContext): Observable<PagedResult<Plan>> {
    return this.http.get<PagedResult<Plan>>(this.url, { params: toParams({ ...query }), context });
  }

  get(id: string, context?: HttpContext): Observable<Plan> {
    return this.http.get<Plan>(`${this.url}/${id}`, { context });
  }

  create(body: PlanRequest): Observable<string> {
    return this.http.post<string>(this.url, body);
  }

  update(id: string, body: PlanRequest): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}`, body);
  }

  filterOptions(): Observable<PlanFilterOptions> {
    return this.http.get<PlanFilterOptions>(`${this.url}/filter-options`);
  }
}
