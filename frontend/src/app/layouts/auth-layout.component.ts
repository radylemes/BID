import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LoginCarouselComponent } from '../components/login-carousel/login-carousel.component';
import { LoginCarouselStateService } from '../services/login-carousel-state.service';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, LoginCarouselComponent],
  template: `
    <div class="relative w-full h-screen overflow-hidden">

      <!-- Carrossel ocupa toda a tela -->
      <div class="absolute inset-0 z-0">
        <app-login-carousel class="w-full h-full"></app-login-carousel>
      </div>

      <!-- Conteúdo sobre o carrossel -->
      <div class="relative z-10 flex flex-col h-full">

        <!-- Topbar -->
        <header class="flex items-center justify-between px-12 py-7 flex-shrink-0">
          <img src="assets/wtorre.svg" alt="WTorre" class="h-[18px] w-auto opacity-85" />
          <div class="flex items-center gap-1.5" *ngIf="carouselState$ | async as state">
            <button
              *ngFor="let i of dotIndices(state.total); trackBy: trackByIndex"
              type="button"
              (click)="goToSlide(i)"
              [attr.aria-label]="'Ir para slide ' + (i + 1)"
              class="w-[5px] h-[5px] rounded-full cursor-pointer transition-all duration-[350ms] ease-in-out"
              [class.bg-[#820AD1]]="i === state.currentIndex"
              [class.scale-150]="i === state.currentIndex"
              [class.bg-white/[0.18]]="i !== state.currentIndex"
            ></button>
          </div>
        </header>

        <!-- Card centralizado -->
        <main class="flex-1 flex items-center justify-center">
          <router-outlet></router-outlet>
        </main>

        <!-- Rodapé -->
        <footer class="flex flex-col items-center gap-3 pb-8 flex-shrink-0">
          <div class="flex items-center gap-8">
            <img src="assets/logo_nubankparque.svg" alt="Nubank Parque" class="h-[36px] w-auto" />
            <div class="w-px h-7 bg-white/10"></div>
            <img src="assets/wtorre.svg" alt="WTorre" class="h-[22px] w-auto opacity-45" />
          </div>
          <p class="text-[11px] text-white/20 text-center">
            &copy; 2026 WTorre. Portal Corporativo Interno.
          </p>
        </footer>

      </div>
    </div>
  `,
})
export class AuthLayoutComponent {
  private readonly carouselState = inject(LoginCarouselStateService);
  readonly carouselState$ = this.carouselState.carouselState$;

  dotIndices(total: number): number[] {
    return Array.from({ length: total }, (_, i) => i);
  }

  trackByIndex(index: number): number {
    return index;
  }

  goToSlide(index: number): void {
    this.carouselState.requestGoToSlide(index);
  }
}
