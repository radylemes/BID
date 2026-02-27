import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';

interface TenantStatus {
  label: string;
  tenantId: string;
  status: string;
  message: string | null;
  userCount?: number | null;
}

@Component({
  selector: 'app-tenants-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-4xl mx-auto">
      <div
        class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6"
      >
        <div>
          <h1 class="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3">
            <span class="text-3xl">🔗</span> Status dos Tenants Azure AD
          </h1>
          <p class="text-gray-500 font-medium text-sm mt-1">
            Verifica se a aplicação está conectada a cada tenant (login e permissão Graph).
          </p>
        </div>
        <button
          (click)="carregar()"
          [disabled]="loading"
          class="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow"
        >
          {{ loading ? 'A verificar...' : '🔄 Atualizar' }}
        </button>
      </div>

      <div *ngIf="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent"></div>
      </div>

      <div *ngIf="!loading && tenants.length === 0" class="text-center py-12 bg-white rounded-xl border border-gray-200">
        <span class="text-4xl block mb-2 opacity-50">⚠️</span>
        <p class="text-gray-500 font-medium">Nenhum tenant configurado no servidor.</p>
      </div>

      <div *ngIf="!loading && tenants.length > 0" class="space-y-4">
        <div
          *ngFor="let t of tenants"
          class="p-5 rounded-xl border bg-white shadow-sm flex flex-col sm:flex-row sm:items-center gap-4"
          [ngClass]="
            t.status === 'ok'
              ? 'border-emerald-200 bg-emerald-50/30'
              : 'border-rose-200 bg-rose-50/30'
          "
        >
          <div class="shrink-0 flex items-center justify-center w-12 h-12 rounded-full text-2xl"
            [ngClass]="t.status === 'ok' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'">
            {{ t.status === 'ok' ? '✓' : '✕' }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <span class="font-bold text-gray-800">{{ t.label }}</span>
              <span
                class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
                [ngClass]="
                  t.status === 'ok' ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
                "
              >
                {{ t.status === 'ok' ? 'Conectado' : 'Erro' }}
              </span>
            </div>
            <p class="text-xs text-gray-500 font-mono truncate" title="{{ t.tenantId }}">{{ t.tenantId }}</p>
            <p *ngIf="t.message" class="text-sm text-gray-600 mt-1">{{ t.message }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class TenantsStatusComponent implements OnInit {
  tenants: TenantStatus[] = [];
  loading = true;

  constructor(
    private userService: UserService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    this.loading = true;
    this.userService.getTenantsStatus().subscribe({
      next: (res) => {
        this.tenants = res.tenants || [];
        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.tenants = [];
        this.loading = false;
        this.cd.detectChanges();
      },
    });
  }
}
