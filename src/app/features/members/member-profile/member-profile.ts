import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Member, MemberActivity, MembershipDetail, MembershipSummary } from '../../../core/models/api.models';
import { ToastService } from '../../../core/services/toast.service';
import { ListMemoryService } from '../../../core/services/list-memory.service';
import { pageLoad } from '../../../core/http/request-context';
import { MemberService } from '../member.service';
import { CheckInService } from '../../check-ins/check-in.service';
import { openMemberForm } from '../member-form-dialog/member-form-dialog';
import { MembershipDialogMode, openMembershipDialog } from '../membership-dialog/membership-dialog';
import { confirm } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { toDateOnly } from '../../../shared/utils/dates';
import { IdentityCard } from './identity-card/identity-card';
import { PlanCard } from './plan-card/plan-card';
import { ActivityList } from './activity-list/activity-list';
import { UsageCard } from './usage-card/usage-card';
import { StateMessage } from '../../../shared/components/state-message/state-message';

const RECENT = 7;
const ALL = 100;

@Component({
  selector: 'app-member-profile',
  imports: [MatIconModule, IdentityCard, PlanCard, ActivityList, UsageCard, StateMessage],
  template: `
    <div class="page">
      <div class="head">
        <button type="button" class="back" (click)="back()" aria-label="Back to members"><mat-icon>arrow_back</mat-icon></button>
        <h1 class="page-title">Member Profile</h1>
        @if (member()) {
          <button type="button" class="btn btn-outline edit" (click)="edit()">Edit Profile</button>
        }
      </div>

      @switch (state()) {
        @case ('loading') { <p class="muted">Loading member…</p> }
        @case ('notFound') {
          <app-state-message icon="person_off" title="Member not found"
                             message="This member doesn't exist or was removed." actionLabel="Back to Members" (act)="back()" />
        }
        @case ('error') {
          <app-state-message icon="cloud_off" title="The profile could not be loaded" actionLabel="Retry" (act)="load()" />
        }
        @case ('ready') {
          <div class="grid">
            <div class="left">
              <app-identity-card [member]="member()!" />
              <app-plan-card [membership]="membership()" [upcoming]="upcoming()" (freeze)="freeze()"
                             (sell)="openPlan('sell')" (change)="openPlan('change')" (renew)="openPlan('renew')"
                             (cancelMembership)="cancelMembership()" (endFreeze)="endFreeze()" />
            </div>
            <div class="right">
              @if (membership(); as ms) {
                <div class="usage">
                  <app-usage-card label="Freezes Used" icon="ac_unit" unit="freeze"
                                  [used]="ms.freezesUsed" [allowed]="ms.agreedTerms.maxFreezeCount" />
                  <app-usage-card label="Guest Passes" icon="person_add" unit="pass"
                                  [used]="ms.agreedTerms.guestPassQuota - ms.guestPassesRemaining"
                                  [allowed]="ms.agreedTerms.guestPassQuota" />
                </div>
              }
              <app-activity-list [items]="activity()" [loading]="activityLoading()"
                                 [canShowMore]="activityTotal() > activity().length" [expanded]="showAll()"
                                 (showMore)="viewAll()" />
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .head { display: flex; align-items: center; gap: 22px; margin-bottom: 28px; }
    .back { width: 52px; height: 52px; border: 1px solid var(--tf-border); background: var(--tf-surface); cursor: pointer;
      display: grid; place-items: center; color: var(--tf-text-soft); }
    .back:hover { background: var(--tf-grey-bg); }
    .edit { margin-left: auto; }
    .muted { color: var(--tf-muted); }
    .grid { display: grid; grid-template-columns: minmax(0, 470px) minmax(0, 1fr); gap: 32px; align-items: start; }
    .left, .right { display: flex; flex-direction: column; gap: 32px; }
    .usage { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    @media (max-width: 1100px) { .grid { grid-template-columns: 1fr; } }
    @media (max-width: 600px) { .usage { grid-template-columns: 1fr; } }
  `,
})
export class MemberProfile {
  private readonly members = inject(MemberService);
  private readonly checkIns = inject(CheckInService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly memory = inject(ListMemoryService);
  private readonly toast = inject(ToastService);

  readonly id = input.required<string>();

  protected readonly member = signal<Member | null>(null);
  protected readonly membership = signal<MembershipDetail | null>(null);
  protected readonly upcoming = signal<MembershipSummary | null>(null);
  protected readonly activity = signal<MemberActivity[]>([]);
  protected readonly activityTotal = signal(0);
  protected readonly activityLoading = signal(false);
  protected readonly showAll = signal(false);
  protected readonly state = signal<'loading' | 'ready' | 'notFound' | 'error'>('loading');

  constructor() {
    effect(() => {
      this.id();
      this.checkIns.recorded();
      untracked(() => this.load());
    });
  }

  load(): void {
    const id = this.id();
    if (!this.member()) this.state.set('loading');
    this.members.get(id, pageLoad()).subscribe({
      next: (m) => {
        this.member.set(m);
        this.state.set('ready');
        this.loadMembership(m);
        this.loadActivity();
      },
      error: (err: HttpErrorResponse) => this.state.set(err.status === 404 ? 'notFound' : 'error'),
    });
  }

  protected back(): void {
    this.router.navigateByUrl(this.memory.urlFor('members'));
  }

  protected edit(): void {
    const member = this.member();
    if (!member) return;
    openMemberForm(this.dialog, { member }).subscribe((saved) => {
      if (saved) this.load();
    });
  }

  protected freeze(): void {
    this.router.navigate(['/members', this.id(), 'freeze']);
  }

  protected openPlan(mode: MembershipDialogMode): void {
    const member = this.member();
    if (!member) return;
    openMembershipDialog(this.dialog, { mode, member, membership: this.membership() }).subscribe((saved) => {
      if (saved) this.load();
    });
  }

  protected endFreeze(): void {
    const ms = this.membership();
    if (!ms) return;
    const today = toDateOnly(new Date());
    const open = ms.freezes
      .filter((f) => !f.isLifted && f.endDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
    const started = !!open && open.startDate <= today;
    confirm(this.dialog, {
      title: started ? 'End the freeze today?' : 'Cancel the scheduled freeze?',
      message: started
        ? `${this.member()?.fullName}'s membership becomes active again today. Unused freeze days are given back and the end date moves earlier to match.`
        : `The freeze will not happen and won't count as a used freeze. The membership stays active and its end date goes back to what it was.`,
      confirmLabel: started ? 'End Freeze' : 'Cancel Freeze',
      cancelLabel: 'Keep Freeze',
    }).subscribe((yes) => {
      if (!yes) return;
      this.members.endFreeze(ms.id).subscribe({
        next: () => {
          this.toast.success(started ? 'Freeze ended — membership is active again' : 'Scheduled freeze cancelled');
          this.load();
        },
        error: () => {},
      });
    });
  }

  protected cancelMembership(): void {
    const ms = this.membership();
    if (!ms) return;
    confirm(this.dialog, {
      title: `Cancel ${ms.planName}?`,
      message: `${this.member()?.fullName} will lose access straight away. A cancelled membership can't be renewed — a new plan would have to be sold.`,
      confirmLabel: 'Cancel Membership',
      cancelLabel: 'Keep Membership',
      danger: true,
    }).subscribe((yes) => {
      if (!yes) return;
      this.members.cancelMembership(ms.id).subscribe({
        next: () => {
          this.toast.success('Membership cancelled');
          this.load();
        },
        error: () => {},
      });
    });
  }

  protected viewAll(): void {
    this.showAll.set(true);
    this.loadActivity();
  }

  private loadMembership(m: Member): void {
    this.members.memberships(m.id).subscribe({
      next: (list) => {
        const later = list
          .filter((x) => x.status === 'Pending' && x.id !== m.currentMembershipId)
          .sort((a, b) => a.startDate.localeCompare(b.startDate));
        this.upcoming.set(later[0] ?? null);
      },
      error: () => this.upcoming.set(null),
    });

    if (!m.currentMembershipId) {
      this.membership.set(null);
      return;
    }
    this.members.membership(m.currentMembershipId).subscribe({
      next: (ms) => this.membership.set(ms),
      error: () => this.membership.set(null),
    });
  }

  private loadActivity(): void {
    this.activityLoading.set(true);
    this.members.activity(this.id(), 1, this.showAll() ? ALL : RECENT).subscribe({
      next: (page) => {
        this.activity.set(page.items);
        this.activityTotal.set(page.totalCount);
        this.activityLoading.set(false);
      },
      error: () => this.activityLoading.set(false),
    });
  }
}
