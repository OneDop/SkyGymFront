import { Injectable } from '@angular/core';

export type ListKey = 'members' | 'trainers' | 'plans' | 'classes';

@Injectable({ providedIn: 'root' })
export class ListMemoryService {
  private readonly urls = new Map<ListKey, string>();

  remember(key: ListKey, url: string): void {
    this.urls.set(key, url);
  }

  urlFor(key: ListKey): string {
    return this.urls.get(key) ?? `/${key}`;
  }
}
