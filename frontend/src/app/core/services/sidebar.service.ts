import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const STORAGE_KEY = 'blocktask_sidebar_open';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private readonly openSubject = new BehaviorSubject<boolean>(this.readInitial());
  readonly isOpen$ = this.openSubject.asObservable();

  get isOpen(): boolean {
    return this.openSubject.value;
  }

  toggle(): void {
    this.setOpen(!this.isOpen);
  }

  setOpen(open: boolean): void {
    this.openSubject.next(open);
    try {
      localStorage.setItem(STORAGE_KEY, String(open));
    } catch {
      /* ignore storage errors */
    }
  }

  private readInitial(): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        return stored === 'true';
      }
    } catch {
      /* ignore */
    }
    return typeof window !== 'undefined' ? window.innerWidth > 768 : true;
  }
}
