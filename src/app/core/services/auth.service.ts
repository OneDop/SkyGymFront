import { computed, Injectable, signal } from '@angular/core';

const TOKEN_KEY = 'tf.session';

interface Session {
  token: string;
  staffName: string;
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = signal<Session | null>(readSession());

  readonly token = computed(() => this.session()?.token ?? null);
  readonly staffName = computed(() => this.session()?.staffName ?? null);
  readonly initials = computed(() =>
    (this.staffName() ?? 'Staff')
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
  );

  signIn(staffName: string, token = 'local-session'): void {
    const session = { token, staffName: staffName.trim() };
    this.session.set(session);
    try {
      localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
    } catch {
    }
  }

  clear(): void {
    this.session.set(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
    }
  }
}
