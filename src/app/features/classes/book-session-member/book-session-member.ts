import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ClassSession, Member } from '../../../core/models/api.models';
import { pageLoad } from '../../../core/http/request-context';
import { ClassService } from '../class.service';
import { MemberService } from '../../members/member.service';
import { MemberSearch } from '../../members/member-search/member-search';
import { StateMessage } from '../../../shared/components/state-message/state-message';
import { formatMinutes, isSameDay, parseDateOnly } from '../../../shared/utils/dates';

@Component({
  selector: 'app-book-session-member',
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, MatInputModule, MemberSearch, StateMessage],
  templateUrl: './book-session-member.html',
  styleUrl: './book-session-member.scss',
})
export class BookSessionMember {
  private readonly classes = inject(ClassService);
  private readonly members = inject(MemberService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  readonly sessionId = input.required<string>();
  readonly memberId = input<string | undefined>(undefined, { alias: 'member' });

  protected readonly session = signal<ClassSession | null>(null);
  protected readonly member = signal<Member | null>(null);
  protected readonly state = signal<'loading' | 'ready' | 'notFound' | 'error'>('loading');
  protected readonly saving = signal(false);
  protected readonly booked = signal<'booked' | 'waitlist' | null>(null);
  protected readonly notes = new FormControl('', { nonNullable: true, validators: Validators.maxLength(500) });

  protected readonly when = computed(() => {
    const s = this.session();
    if (!s) return '';
    const date = parseDateOnly(s.sessionDate);
    const day = isSameDay(date, new Date())
      ? 'Today'
      : date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    const fmt = (t: string) => formatMinutes(toMinutes(t)).replace(/^0/, '');
    return `${day}, ${fmt(s.startTime)} - ${fmt(s.endTime)}`;
  });

  protected readonly fillPercent = computed(() => {
    const s = this.session();
    return s && s.capacityLimit ? Math.min(100, (s.confirmedCount / s.capacityLimit) * 100) : 0;
  });

  protected readonly blocked = computed(() => {
    const s = this.session();
    const m = this.member();
    if (!s || !m) return null;
    if (s.status !== 'Open') return s.status === 'Cancelled' ? 'This class was cancelled.' : 'This class has already started.';
    if (m.status === 'None') return 'You need a membership to book classes.';
    if (m.status !== 'Active') return `Your membership is ${m.status.toLowerCase()}.`;
    return null;
  });

  constructor() {
    effect(() => {
      const id = this.sessionId();
      const memberId = this.memberId();
      untracked(() => this.load(id, memberId));
    });
  }

  protected load(id = this.sessionId(), memberId = this.memberId()): void {
    this.state.set('loading');
    this.classes.get(id, pageLoad()).subscribe({
      next: (s) => {
        this.session.set(s);
        this.state.set('ready');
      },
      error: (err: HttpErrorResponse) => this.state.set(err.status === 404 ? 'notFound' : 'error'),
    });
    if (memberId) this.members.get(memberId).subscribe({ next: (m) => this.member.set(m), error: () => {} });
  }

  protected chooseMember(m: Member | null): void {
    this.member.set(m);
    this.router.navigate([], { queryParams: { member: m?.id ?? null }, replaceUrl: true });
  }

  protected confirm(): void {
    const s = this.session();
    const m = this.member();
    if (!s || !m || this.blocked()) return;
    this.saving.set(true);
    this.classes.book(s.id, m.id, this.notes.value.trim() || null).subscribe({
      next: () => {
        this.saving.set(false);
        this.booked.set(s.placesRemaining > 0 ? 'booked' : 'waitlist');
      },
      error: () => this.saving.set(false),
    });
  }

  protected back(): void {
    if (window.history.length > 1) this.location.back();
    else this.router.navigate(['/classes']);
  }
}
