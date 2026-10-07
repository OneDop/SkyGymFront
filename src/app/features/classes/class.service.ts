import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Booking, ClassSession, DayCapacity, PagedResult } from '../../core/models/api.models';
import { toParams } from '../../core/http/params';

export interface ClassQuery {
  branchId?: string | null;
  trainerId?: string | null;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ClassRequest {
  className: string;
  branchId: string;
  studioId: string | null;
  trainerId: string | null;
  sessionDate: string;
  startTime: string;
  durationMinutes: number;
  capacityLimit: number;
  description: string | null;
}

@Injectable({ providedIn: 'root' })
export class ClassService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/sessions`;
  private readonly dashboardUrl = `${environment.apiUrl}/dashboard`;

  list(query: ClassQuery, context?: HttpContext): Observable<PagedResult<ClassSession>> {
    return this.http.get<PagedResult<ClassSession>>(this.url, { params: toParams({ ...query }), context });
  }

  get(id: string, context?: HttpContext): Observable<ClassSession> {
    return this.http.get<ClassSession>(`${this.url}/${id}`, { context });
  }

  create(body: ClassRequest): Observable<string> {
    return this.http.post<string>(this.url, body);
  }

  update(id: string, body: ClassRequest): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}`, body);
  }

  cancel(id: string): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/cancel`, {});
  }

  book(id: string, memberId: string, notes: string | null): Observable<string> {
    return this.http.post<string>(`${this.url}/${id}/bookings`, { memberId, notes });
  }

  bookings(id: string): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.url}/${id}/bookings`);
  }

  upcoming(branchId: string | null, take = 10, context?: HttpContext): Observable<ClassSession[]> {
    return this.http.get<ClassSession[]>(`${this.dashboardUrl}/upcoming-sessions`, {
      params: toParams({ branchId, take }),
      context,
    });
  }

  capacity(branchId: string | null, date: string): Observable<DayCapacity> {
    return this.http.get<DayCapacity>(`${this.dashboardUrl}/today-capacity`, {
      params: toParams({ branchId, date }),
    });
  }
}
