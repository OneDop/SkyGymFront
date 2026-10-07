import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FreezeReason,
  Member,
  MemberActivity,
  MembershipDetail,
  MembershipSummary,
  PagedResult,
  SortDir,
} from '../../core/models/api.models';
import { toParams } from '../../core/http/params';

export interface MemberQuery {
  search?: string;
  branchId?: string | null;
  status?: string | null;
  sortBy?: string;
  sortDir?: SortDir;
  page?: number;
  pageSize?: number;
}

export interface MemberCreate {
  fullName: string;
  homeBranchId: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export type PlanChangeTiming = 'AtRenewal' | 'Immediately';

export interface MemberUpdate {
  fullName: string;
  homeBranchId: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface FreezeRequest {
  startDate: string;
  endDate: string;
  reason: FreezeReason;
  notes: string | null;
}

@Injectable({ providedIn: 'root' })
export class MemberService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/members`;
  private readonly membershipsUrl = `${environment.apiUrl}/memberships`;

  list(query: MemberQuery, context?: HttpContext): Observable<PagedResult<Member>> {
    return this.http.get<PagedResult<Member>>(this.url, {
      params: toParams({ ...query }),
      context,
    });
  }

  get(id: string, context?: HttpContext): Observable<Member> {
    return this.http.get<Member>(`${this.url}/${id}`, { context });
  }

  create(body: MemberCreate): Observable<string> {
    return this.http.post<string>(this.url, body);
  }

  update(id: string, body: MemberUpdate): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}`, body);
  }

  activity(id: string, page = 1, pageSize = 7): Observable<PagedResult<MemberActivity>> {
    return this.http.get<PagedResult<MemberActivity>>(`${this.url}/${id}/activity`, {
      params: toParams({ page, pageSize }),
    });
  }

  membership(id: string, context?: HttpContext): Observable<MembershipDetail> {
    return this.http.get<MembershipDetail>(`${this.membershipsUrl}/${id}`, { context });
  }

  freeze(membershipId: string, body: FreezeRequest): Observable<string> {
    return this.http.post<string>(`${this.membershipsUrl}/${membershipId}/freeze`, body);
  }

  memberships(memberId: string): Observable<MembershipSummary[]> {
    return this.http.get<MembershipSummary[]>(`${this.membershipsUrl}/by-member/${memberId}`);
  }

  purchase(memberId: string, planId: string, startDate: string): Observable<string> {
    return this.http.post<string>(this.membershipsUrl, { memberId, planId, startDate });
  }

  renew(membershipId: string, planId: string | null): Observable<string> {
    return this.http.post<string>(`${this.membershipsUrl}/${membershipId}/renew`, { planId });
  }

  changePlan(membershipId: string, planId: string, timing: PlanChangeTiming): Observable<string> {
    return this.http.post<string>(`${this.membershipsUrl}/${membershipId}/change-plan`, { planId, timing });
  }

  endFreeze(membershipId: string): Observable<void> {
    return this.http.post<void>(`${this.membershipsUrl}/${membershipId}/end-freeze`, {});
  }

  cancelMembership(membershipId: string): Observable<void> {
    return this.http.post<void>(`${this.membershipsUrl}/${membershipId}/cancel`, {});
  }
}
