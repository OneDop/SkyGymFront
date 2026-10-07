import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StateMessage } from '../../../shared/components/state-message/state-message';

@Component({
  selector: 'app-access-denied',
  imports: [StateMessage, RouterLink],
  template: `
    <div class="page">
      <app-state-message icon="lock" title="Access denied"
                         message="You don't have permission to view this page. Ask a branch manager if you need access.">
        <a routerLink="/dashboard" class="btn btn-primary">Go to Dashboard</a>
      </app-state-message>
    </div>
  `,
})
export class AccessDenied {}
