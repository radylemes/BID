import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule, DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="min-h-screen w-full flex overflow-hidden">
      <!-- Coluna esquerda: vídeo de fundo -->
      <div class="hidden lg:flex lg:min-h-screen lg:w-[58%] relative overflow-hidden">
        <video
          class="absolute inset-0 h-full w-full object-cover"
          [src]="videoSrc"
          autoplay
          muted
          loop
          playsinline
          preload="auto"
          [poster]="posterSrc"
          aria-hidden="true"
        ></video>
      </div>

      <!-- Coluna direita: painel azul escuro fixo para login -->
      <div
        class="flex-1 min-h-screen flex flex-col bg-gradient-to-b from-[#0f172a] via-[#13203a] to-[#1e3a8a] text-slate-100"
      >
        <main class="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div class="w-full max-w-md text-center">
            <router-outlet></router-outlet>
          </div>
        </main>

        <footer class="py-4 text-center text-slate-300 text-xs px-4">
          &copy; 2026 WTorre. Todos os direitos reservados.
        </footer>
      </div>
    </div>
  `,
})
export class AuthLayoutComponent {
  private readonly document = inject(DOCUMENT);

  /** Resolve contra `document.baseURI` (respeita `<base href>` no deploy). */
  readonly videoSrc = new URL('assets/HOME-SITE.mp4', this.document.baseURI).href;
  readonly posterSrc = new URL('assets/allianz_parque_fiel.png', this.document.baseURI).href;
}
