import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="min-h-screen w-full bg-gray-100 flex flex-col overflow-hidden">
      <div class="w-full bg-gray-900 py-6 flex justify-center shadow-md">
        <h1 class="text-3xl font-bold text-white tracking-widest uppercase">WTORRE</h1>
      </div>

      <div class="flex-1 flex items-center justify-center p-4">
        <div class="w-full max-w-md">
          <router-outlet></router-outlet>
        </div>
      </div>

      <div class="py-4 text-center text-gray-400 text-xs">
        &copy; 2026 Bolão BID - Todos os direitos reservados.
      </div>
    </div>
  `,
})
export class AuthLayoutComponent {}
