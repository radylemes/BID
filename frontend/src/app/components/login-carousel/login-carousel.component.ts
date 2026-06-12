import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Subject, startWith, switchMap, timer } from 'rxjs';
import { LoginCarouselStateService } from '../../services/login-carousel-state.service';

@Component({
  selector: 'app-login-carousel',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('fade', [
      state('visible', style({ opacity: 1 })),
      state('hidden', style({ opacity: 0 })),
      transition('hidden => visible', animate('1000ms ease-in-out')),
      transition('visible => hidden', animate('1000ms ease-in-out')),
    ]),
  ],
  template: `
    <div
      class="relative h-full w-full overflow-hidden bg-black"
      aria-hidden="true"
      role="presentation"
      (mouseenter)="pauseAutoplay()"
      (mouseleave)="resumeAutoplay()"
    >
      <img
        *ngFor="let src of slides; let i = index"
        [src]="src"
        alt=""
        [@fade]="i === currentIndex ? 'visible' : 'hidden'"
        class="absolute inset-0 h-full w-full object-cover pointer-events-none"
        [class.z-10]="i === currentIndex"
        [class.z-0]="i !== currentIndex"
      />
    </div>
  `,
})
export class LoginCarouselComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly carouselState = inject(LoginCarouselStateService);
  private readonly autoplayMs = 5000;
  private readonly restartAutoplay$ = new Subject<void>();

  readonly slides = [
    'assets/login-carousel/01-henrique-juliano.png',
    'assets/login-carousel/02-gilberto-gil.png',
    'assets/login-carousel/03-gusttavo-lima.png',
    'assets/login-carousel/04-show-azul.png',
    'assets/login-carousel/05-allianz-parque.png',
    'assets/login-carousel/06-show-fisheye.png',
    'assets/login-carousel/07-show-spotlights.png',
    'assets/login-carousel/08-crowd-brasil.png',
    'assets/login-carousel/09-show-telas.png',
    'assets/login-carousel/10-show-azul-2.png',
    'assets/login-carousel/11-kings-league.png',
    'assets/login-carousel/12-pirotecnia.png',
  ];

  currentIndex = 0;
  autoplayActive = true;

  ngOnInit(): void {
    this.carouselState.updateState(this.currentIndex, this.slides.length);

    this.carouselState.slideCommand$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((index) => this.goToSlide(index));

    this.restartAutoplay$
      .pipe(
        startWith(undefined),
        switchMap(() => timer(this.autoplayMs, this.autoplayMs)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        if (this.autoplayActive) {
          this.nextSlide();
        }
      });
  }

  pauseAutoplay(): void {
    this.autoplayActive = false;
  }

  resumeAutoplay(): void {
    if (!this.autoplayActive) {
      this.autoplayActive = true;
      this.restartAutoplay$.next();
    }
  }

  private goToSlide(index: number): void {
    if (index >= 0 && index < this.slides.length) {
      this.currentIndex = index;
      this.carouselState.updateState(this.currentIndex, this.slides.length);
      this.restartAutoplay$.next();
    }
  }

  private nextSlide(): void {
    this.currentIndex = (this.currentIndex + 1) % this.slides.length;
    this.carouselState.updateState(this.currentIndex, this.slides.length);
  }
}
