import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PagedResult, SortDir, Trainer } from '../../core/models/api.models';
import { toParams } from '../../core/http/params';

export interface TrainerQuery {
  search?: string;
  branchIds?: string[];
  specialties?: string[];
  isActive?: boolean | null;
  sortBy?: string;
  sortDir?: SortDir;
  page?: number;
  pageSize?: number;
}

export interface TrainerRequest {
  fullName: string;
  specialty: string | null;
  homeBranchId: string;
  email: string;
  phone: string | null;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class TrainerService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/trainers`;

  list(query: TrainerQuery, context?: HttpContext): Observable<PagedResult<Trainer>> {
    return this.http.get<PagedResult<Trainer>>(this.url, { params: toParams({ ...query }), context });
  }

  get(id: string, context?: HttpContext): Observable<Trainer> {
    return this.http.get<Trainer>(`${this.url}/${id}`, { context });
  }

  create(body: TrainerRequest): Observable<string> {
    return this.http.post<string>(this.url, body);
  }

  update(id: string, body: TrainerRequest): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}`, body);
  }

  specialties(): Observable<{ specialties: string[] }> {
    return this.http.get<{ specialties: string[] }>(`${this.url}/filter-options`);
  }
}
