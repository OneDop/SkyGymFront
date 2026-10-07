import { Component, DestroyRef, inject, input, model, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { Member } from '../../../core/models/api.models';
import { MemberService } from '../member.service';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { AutofocusDirective } from '../../../shared/directives/autofocus.directive';
import { HighlightPipe } from '../../../shared/pipes/highlight.pipe';

@Component({
  selector: 'app-member-search',
  imports: [ReactiveFormsModule, MatAutocompleteModule, MatInputModule, MatIconModule, Avatar, StatusBadge,
    AutofocusDirective, HighlightPipe],
  template: `
    @if (member(); as m) {
      <div class="chosen" [class.locked]="locked()">
        <app-avatar [name]="m.fullName" [size]="44" />
        <div class="who">
          <strong>{{ m.fullName }}</strong>
          <span>ID: #{{ m.membershipNumber }}</span>
        </div>
        <app-status-badge [status]="m.status" />
        @if (!locked()) {
          <button type="button" class="icon-btn" (click)="clear()" aria-label="Choose another member">
            <mat-icon>close</mat-icon>
          </button>
        }
      </div>
    } @else {
      <mat-form-field>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [formControl]="query" [matAutocomplete]="auto" [appAutofocus]="autofocus()"
               placeholder="Search by name or member ID (#TF-8932)" aria-label="Find member" />
        <mat-autocomplete #auto="matAutocomplete" (optionSelected)="pick($event.option.value)">
          @for (m of results(); track m.id) {
            <mat-option [value]="m" class="member-option">
              <div class="opt">
                <app-avatar [name]="m.fullName" [size]="32" />
                <span class="opt-name" [innerHTML]="m.fullName | highlight: term()"></span>
                <span class="opt-id" [innerHTML]="'#' + m.membershipNumber | highlight: term()"></span>
                <app-status-badge [status]="m.status" />
              </div>
            </mat-option>
          }
          @if (searched() && results().length === 0) {
            <mat-option disabled>No members match "{{ term() }}"</mat-option>
          }
        </mat-autocomplete>
      </mat-form-field>
    }
  `,
  styles: `
    .chosen { display: flex; align-items: center; gap: 14px; padding: 12px 16px; border: 1px solid var(--tf-border-strong);
      background: var(--tf-grey-bg); }
    .who { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .who span { color: var(--tf-muted); font-size: 15px; }
    mat-form-field { width: 100%; }
    .opt { display: flex; align-items: center; gap: 10px; }
    .opt-name { flex: 1; }
    .opt-id { color: var(--tf-muted); font-size: 14px; }
  `,
})
export class MemberSearch {
  private readonly members = inject(MemberService);

  readonly member = model<Member | null>(null);
  readonly locked = input(false);
  readonly autofocus = input(true);

  protected readonly query = new FormControl<string | Member>('', { nonNullable: true });
  protected readonly results = signal<Member[]>([]);
  protected readonly term = signal('');
  protected readonly searched = signal(false);

  constructor() {
    this.query.valueChanges
      .pipe(
        map((v) => (typeof v === 'string' ? v.replace(/^#/, '').trim() : '')),
        debounceTime(250),
        distinctUntilChanged(),
        tap((t) => this.term.set(t)),
        switchMap((t) =>
          t.length < 1
            ? of([])
            : this.members.list({ search: t, pageSize: 8 }).pipe(
                map((r) => r.items),
                catchError(() => of([])),
              ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((items) => {
        this.results.set(items);
        this.searched.set(this.term().length > 0);
      });
  }

  protected pick(m: Member): void {
    this.member.set(m);
  }

  protected clear(): void {
    this.member.set(null);
    this.query.setValue('');
  }
}
