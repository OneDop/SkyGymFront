import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class HeaderSearchService {
  readonly term = signal('');
  readonly placeholder = signal('Search members...');
  readonly target = signal<string | null>(null);

  set(term: string): void {
    this.term.set(term);
  }

  clear(): void {
    this.term.set('');
  }
}
