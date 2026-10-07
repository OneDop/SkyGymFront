import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StateMessage } from '../../../shared/components/state-message/state-message';

@Component({
  selector: 'app-not-found',
  imports: [StateMessage, RouterLink],
  template: `
    <div class="page">
      <app-state-message icon="explore_off" title="Page not found"
                         message="The page you were looking for doesn't exist or has moved.">
        <a routerLink="/dashboard" class="btn btn-primary">Go to Dashboard</a>
      </app-state-message>
    </div>
  `,
})
export class NotFound {}
