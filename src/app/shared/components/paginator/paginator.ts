import { Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-paginator',
  imports: [MatIconModule],
  template: `
    <div class="paginator">
      <span class="summary">
        @if (total() === 0) {
          No entries
        } @else {
          Showing {{ from() }} to {{ to() }} of {{ total() }} entries
        }
      </span>
      @if (pageCount() > 1) {
        <nav class="pages" aria-label="Pagination">
          <button type="button" class="page-btn" [disabled]="page() <= 1"
                  (click)="go(page() - 1)" aria-label="Previous page">
            <mat-icon>chevron_left</mat-icon>
          </button>
          @for (p of pages(); track $index) {
            @if (p === null) {
              <span class="gap">…</span>
            } @else {
              <button type="button" class="page-btn" [class.current]="p === page()"
                      [attr.aria-current]="p === page() ? 'page' : null" (click)="go(p)">{{ p }}</button>
            }
          }
          <button type="button" class="page-btn" [disabled]="page() >= pageCount()"
                  (click)="go(page() + 1)" aria-label="Next page">
            <mat-icon>chevron_right</mat-icon>
          </button>
        </nav>
      }
    </div>
  `,
  styles: `
    .paginator { display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding: 16px 20px; flex-wrap: wrap; }
    .summary { color: var(--tf-muted); font-size: 15px; }
    .pages { display: flex; gap: 6px; align-items: center; }
    .page-btn { min-width: 36px; height: 36px; padding: 0 8px; border: 1px solid var(--tf-border);
      background: var(--tf-surface); color: var(--tf-text); font: inherit; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; }
    .page-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .page-btn:hover:not(:disabled):not(.current) { background: var(--tf-grey-bg); }
    .page-btn:disabled { opacity: .45; cursor: default; }
    .page-btn.current { background: var(--tf-navy); border-color: var(--tf-navy); color: #fff; }
    .gap { color: var(--tf-muted); padding: 0 4px; }
  `,
})
export class Paginator {
  readonly total = input.required<number>();
  readonly page = input.required<number>();
  readonly pageSize = input(20);
  readonly pageChange = output<number>();

  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  protected readonly from = computed(() => (this.page() - 1) * this.pageSize() + 1);
  protected readonly to = computed(() => Math.min(this.total(), this.page() * this.pageSize()));

  protected readonly pages = computed<(number | null)[]>(() => {
    const count = this.pageCount();
    const current = this.page();
    if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
    const wanted = new Set([1, count, current - 1, current, current + 1]);
    const list: (number | null)[] = [];
    let last = 0;
    for (let p = 1; p <= count; p++) {
      if (!wanted.has(p)) continue;
      if (p - last > 1) list.push(null);
      list.push(p);
      last = p;
    }
    return list;
  });

  protected go(page: number): void {
    if (page >= 1 && page <= this.pageCount() && page !== this.page()) this.pageChange.emit(page);
  }
}
