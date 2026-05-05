import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { SettingsService } from '../../services/settings.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-policy-access',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-[var(--app-bg)] py-8 px-4">
      <div class="max-w-4xl mx-auto bg-[var(--color-bg-surface)] border border-[var(--app-border)] rounded-2xl shadow-sm">
        <div class="px-6 py-5 border-b border-[var(--app-border)]">
          <h1 class="text-2xl font-black text-[var(--app-text)]">Política de Acesso</h1>
          <p class="text-sm text-[var(--app-text-muted)] mt-1">
            Termos aplicáveis para participação e confirmação de lances.
          </p>
        </div>

        <div *ngIf="loading" class="p-6 text-[var(--app-text-muted)] animate-pulse">
          Carregando política...
        </div>

        <div *ngIf="!loading && hasPdf" class="p-6 space-y-3">
          <button
            type="button"
            (click)="abrirPdfNovaAba()"
            class="text-sm text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
          >
            Abrir PDF em nova aba
          </button>
          <iframe
            [src]="pdfSafeUrl"
            title="PDF da política de acesso"
            class="w-full h-[75vh] rounded-lg border border-[var(--app-border)] bg-white"
          ></iframe>
        </div>

        <div
          *ngIf="!loading && !hasPdf"
          class="p-6 prose prose-sm max-w-none text-[var(--app-text)]"
          [innerHTML]="policyHtmlSafe"
        ></div>
      </div>
    </div>
  `,
})
export class PolicyAccessComponent implements OnInit, OnDestroy {
  loading = false;
  policyHtml = '';
  hasPdf = false;
  pdfObjectUrl = '';
  pdfSafeUrl: SafeResourceUrl | null = null;

  constructor(
    private settingsService: SettingsService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    this.loading = true;
    this.settingsService.getBidPolicy().subscribe({
      next: (res) => {
        this.hasPdf = Boolean(res?.hasPdf);
        this.policyHtml =
          res?.html?.trim() ||
          '<p><strong>Política de acesso não configurada.</strong></p><p>Contate o administrador do sistema.</p>';
        if (this.hasPdf) {
          this.settingsService.getBidPolicyDocumentBlob().subscribe({
            next: (blob) => {
              this.revokePdfUrl();
              this.pdfObjectUrl = URL.createObjectURL(blob);
              this.pdfSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfObjectUrl);
              this.loading = false;
            },
            error: () => {
              this.loading = false;
              Swal.fire('Erro', 'Não foi possível carregar o PDF da política.', 'error');
            },
          });
          return;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        Swal.fire('Erro', 'Não foi possível carregar a política de acesso.', 'error');
      },
    });
  }

  get policyHtmlSafe(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.policyHtml || '');
  }

  abrirPdfNovaAba() {
    if (!this.pdfObjectUrl) return;
    window.open(this.pdfObjectUrl, '_blank', 'noopener,noreferrer');
  }

  ngOnDestroy() {
    this.revokePdfUrl();
  }

  private revokePdfUrl() {
    if (!this.pdfObjectUrl) return;
    URL.revokeObjectURL(this.pdfObjectUrl);
    this.pdfObjectUrl = '';
    this.pdfSafeUrl = null;
  }
}
