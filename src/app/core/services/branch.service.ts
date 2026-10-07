import { HttpClient, HttpContext } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { retry, timer } from 'rxjs';
import { Branch, BranchSummary } from '../models/api.models';
import { environment } from '../../../environments/environment';
import { SILENT } from '../http/request-context';

const CURRENT_KEY = 'tf.branch';

@Injectable({ providedIn: 'root' })
export class BranchService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/branches`;

  private readonly _branches = signal<BranchSummary[]>([]);
  private readonly _currentId = signal<string | null>(this.readStored());
  private readonly details = new Map<string, Branch>();

  readonly branches = this._branches.asReadonly();
  readonly loaded = signal(false);

  readonly current = computed<BranchSummary | null>(() => {
    const list = this._branches();
    return list.find((b) => b.id === this._currentId()) ?? list[0] ?? null;
  });
  readonly currentId = computed(() => this.current()?.id ?? null);

  constructor() {
    effect(() => {
      const id = this.currentId();
      try {
        if (id) localStorage.setItem(CURRENT_KEY, id);
      } catch {
      }
    });
    this.load();
  }

  load(): void {
    this.http
      .get<BranchSummary[]>(this.url, { context: new HttpContext().set(SILENT, true) })
      .pipe(retry({ delay: (_err, attempt) => timer(Math.min(30_000, 1000 * 2 ** (attempt - 1))) }))
      .subscribe((list) => {
        this._branches.set(list);
        this.loaded.set(true);
      });
  }

  select(id: string): void {
    this._currentId.set(id);
  }

  nameOf(id: string | null | undefined): string {
    return this._branches().find((b) => b.id === id)?.name ?? '';
  }

  getDetails(id: string): Promise<Branch> {
    const cached = this.details.get(id);
    if (cached) return Promise.resolve(cached);
    return new Promise((resolve, reject) =>
      this.http.get<Branch>(`${this.url}/${id}`).subscribe({
        next: (b) => {
          this.details.set(id, b);
          resolve(b);
        },
        error: reject,
      }),
    );
  }

  private readStored(): string | null {
    try {
      return localStorage.getItem(CURRENT_KEY);
    } catch {
      return null;
    }
  }
}
