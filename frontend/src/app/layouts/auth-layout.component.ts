import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="min-h-screen w-full flex overflow-hidden">
      <!-- Coluna esquerda: imagem do estádio + logo Allianz -->
      <div
        class="hidden lg:flex lg:min-h-screen lg:w-[58%] relative bg-cover bg-center bg-no-repeat"
        [style.backgroundImage]="'url(assets/allianz_parque_fiel.png)'"
      >
        <div class="absolute bottom-0 left-0 p-6" *ngIf="showAllianzLogo">
          <img
            src="assets/Logo-Allianz-Parque-Light.svg"
            alt="Allianz Parque"
            class="h-12 w-auto max-w-[200px] object-contain"
            (error)="showAllianzLogo = false"
          />
        </div>
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
  showAllianzLogo = true;
}
