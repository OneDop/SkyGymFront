import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { HeaderSearchService } from '../../services/header-search.service';

const firstSegment = (url: string) => url.split(/[/?#]/).filter(Boolean)[0] ?? '';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Sidebar, Header],
  template: `
    <div class="shell">
      <app-sidebar class="side" />
      <div class="main">
        <app-header />
        <main><router-outlet /></main>
      </div>
    </div>
  `,
  styles: `
    .shell { display: grid; grid-template-columns: 316px 1fr; min-height: 100vh; }
    .side { position: sticky; top: 0; height: 100vh; }
    .main { min-width: 0; display: flex; flex-direction: column; }
    main { flex: 1; }
    @media (max-width: 900px) { .shell { grid-template-columns: 1fr; } .side { position: static; height: auto; } }
  `,
})
export class Shell {
  constructor() {
    const router = inject(Router);
    const search = inject(HeaderSearchService);
    let feature = firstSegment(router.url);

    router.events.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((e) => {
      if (e instanceof NavigationStart) {
        const next = firstSegment(e.url);
        if (next !== feature) search.clear();
        feature = next;
      }
      if (e instanceof NavigationEnd) {
        let snap: ActivatedRouteSnapshot | null = router.routerState.snapshot.root;
        let placeholder = 'Search...';
        let target: string | null = null;
        while (snap) {
          placeholder = snap.data['searchPlaceholder'] ?? placeholder;
          target = snap.data['searchTarget'] ?? (snap.firstChild ? target : null);
          snap = snap.firstChild;
        }
        search.placeholder.set(placeholder);
        search.target.set(target);
      }
    });
  }
}
