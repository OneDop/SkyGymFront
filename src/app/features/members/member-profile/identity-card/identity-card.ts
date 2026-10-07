import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Member } from '../../../../core/models/api.models';
import { Avatar } from '../../../../shared/components/avatar/avatar';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-identity-card',
  imports: [DatePipe, MatIconModule, Avatar, StatusBadge],
  template: `
    @let m = member();
    <section class="card identity">
      <div class="badge"><app-status-badge [status]="m.status" /></div>
      <div class="photo"><app-avatar [name]="m.fullName" [size]="120" /></div>
      <h2>{{ m.fullName }}</h2>
      <p class="id">ID: #{{ m.membershipNumber }}</p>
      <ul>
        <li><mat-icon>mail</mat-icon>{{ m.email ?? 'No email on file' }}</li>
        <li><mat-icon>call</mat-icon>{{ m.phone ?? 'No phone on file' }}</li>
        <li><mat-icon>location_on</mat-icon>{{ m.address ?? 'No address on file' }}</li>
        <li><mat-icon>home_pin</mat-icon>{{ m.branchName }}</li>
        <li><mat-icon>calendar_today</mat-icon>Joined: {{ m.joinedDate | date: 'MMM d, y' }}</li>
      </ul>
    </section>
  `,
  styles: `
    .identity { position: relative; padding: 32px 32px 28px; text-align: center; }
    .badge { position: absolute; top: 20px; right: 20px; }
    .photo { display: flex; justify-content: center; margin-bottom: 14px; }
    .photo app-avatar ::ng-deep .avatar { border-radius: 8px; }
    h2 { margin: 0; font-size: 30px; }
    .id { margin: 6px 0 22px; color: var(--tf-text-soft); font-size: 18px; }
    ul { list-style: none; margin: 0; padding: 0; text-align: left; display: flex; flex-direction: column; gap: 12px; }
    li { display: flex; align-items: center; gap: 14px; font-size: 17px; color: var(--tf-text-soft); word-break: break-word; }
    li mat-icon { color: var(--tf-muted); font-size: 20px; width: 20px; height: 20px; flex: none; }
  `,
})
export class IdentityCard {
  readonly member = input.required<Member>();
}
