import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface LoginCarouselState {
  currentIndex: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class LoginCarouselStateService {
  private readonly state$ = new BehaviorSubject<LoginCarouselState>({
    currentIndex: 0,
    total: 0,
  });
  private readonly goToSlide$ = new Subject<number>();

  readonly carouselState$ = this.state$.asObservable();
  readonly slideCommand$ = this.goToSlide$.asObservable();

  updateState(currentIndex: number, total: number): void {
    this.state$.next({ currentIndex, total });
  }

  requestGoToSlide(index: number): void {
    this.goToSlide$.next(index);
  }
}
