import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, contentChildren, Directive, inject, input, model, TemplateRef } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SortDir } from '../../../core/models/api.models';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right';
  width?: string;
}

export interface TableSort {
  by: string;
  dir: SortDir;
}

@Directive({ selector: 'ng-template[appCell]' })
export class CellDef {
  readonly appCell = input.required<string>();
  readonly template = inject<TemplateRef<{ $implicit: unknown }>>(TemplateRef);
}

@Component({
  selector: 'app-data-table',
  imports: [NgTemplateOutlet, MatIconModule],
  template: `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            @for (col of columns(); track col.key) {
              <th [style.width]="col.width" [class.right]="col.align === 'right'"
                  [attr.aria-sort]="ariaSort(col)">
                @if (col.sortable) {
                  <button type="button" class="sort" (click)="toggleSort(col.key)">
                    {{ col.label }}
                    <mat-icon [class.on]="sort()?.by === col.key">{{ sortIcon(col.key) }}</mat-icon>
                  </button>
                } @else {
                  {{ col.label }}
                }
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track trackBy()(row)) {
            <tr>
              @for (col of columns(); track col.key) {
                <td [class.right]="col.align === 'right'">
                  @if (templates().get(col.key); as tpl) {
                    <ng-container [ngTemplateOutlet]="tpl" [ngTemplateOutletContext]="{ $implicit: row }" />
                  } @else {
                    {{ cell(row, col.key) }}
                  }
                </td>
              }
            </tr>
          } @empty {
            <tr class="state-row">
              <td [attr.colspan]="columns().length">
                @if (loading()) { Loading… } @else { {{ emptyText() }} }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-weight: 500; font-size: 14px; letter-spacing: .06em; text-transform: uppercase;
      color: var(--tf-text-soft); padding: 18px 20px; border-bottom: 1px solid var(--tf-border); white-space: nowrap; }
    td { padding: 14px 20px; border-bottom: 1px solid var(--tf-border); font-size: 16px; vertical-align: middle; }
    tbody tr:last-child td { border-bottom: 0; }
    tbody tr:not(.state-row):hover { background: var(--tf-row-hover); }
    .right { text-align: right; }
    .sort { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;
      font: inherit; letter-spacing: inherit; text-transform: inherit; }
    .sort:focus-visible { outline: 2px solid var(--tf-navy); outline-offset: 2px; }
    .sort mat-icon { font-size: 16px; width: 16px; height: 16px; opacity: .35; }
    .sort mat-icon.on { opacity: 1; color: var(--tf-navy); }
    .state-row td { text-align: center; color: var(--tf-muted); padding: 40px 20px; }
  `,
})
export class DataTable<T> {
  readonly columns = input.required<TableColumn[]>();
  readonly rows = input.required<T[]>();
  readonly sort = model<TableSort | null>(null);
  readonly loading = input(false);
  readonly emptyText = input('Nothing to show.');
  readonly trackBy = input<(row: T) => unknown>((row: T) => (row as { id?: unknown }).id ?? row);

  private readonly cellDefs = contentChildren(CellDef);
  protected readonly templates = computed(
    () => new Map(this.cellDefs().map((d) => [d.appCell(), d.template] as const)),
  );

  protected cell(row: T, key: string): unknown {
    return (row as Record<string, unknown>)[key] ?? '';
  }

  protected toggleSort(key: string): void {
    const current = this.sort();
    const dir: SortDir = current?.by === key && current.dir === 'asc' ? 'desc' : 'asc';
    this.sort.set({ by: key, dir });
  }

  protected sortIcon(key: string): string {
    const s = this.sort();
    if (s?.by !== key) return 'unfold_more';
    return s.dir === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  protected ariaSort(col: TableColumn): string | null {
    if (!col.sortable) return null;
    const s = this.sort();
    if (s?.by !== col.key) return 'none';
    return s.dir === 'asc' ? 'ascending' : 'descending';
  }
}
