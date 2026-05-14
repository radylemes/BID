import { ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import { catchError, finalize, switchMap, tap } from 'rxjs/operators';
import { SettingsService } from '../../services/settings.service';
import Swal from 'sweetalert2';

type PolicyScope = 'bids' | 'wtPass';

@Component({
  selector: 'app-policy-access',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full w-full min-h-0 flex flex-col bg-[var(--app-bg)] text-[var(--app-text)] overflow-hidden">
      <header
        class="shrink-0 border-b border-[var(--app-border)] bg-[var(--color-bg-surface)] px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 class="text-xl sm:text-2xl font-black text-[var(--app-text)]">{{ pageTitle }}</h1>
          <p class="text-sm text-[var(--app-text-muted)] mt-0.5">
            {{ pageSubtitle }}
          </p>
        </div>
        <button
          *ngIf="!loading && hasPdf && pdfSafeUrl"
          type="button"
          (click)="abrirPdfNovaAba()"
          class="text-sm text-indigo-600 hover:text-indigo-800 font-bold hover:underline shrink-0 text-left sm:text-right"
        >
          Abrir PDF em nova aba
        </button>
      </header>

      <main class="flex-1 min-h-0 flex flex-col relative">
        <div
          *ngIf="loading"
          class="absolute inset-0 flex items-center justify-center text-[var(--app-text-muted)] animate-pulse px-4"
        >
          Carregando política...
        </div>

        <iframe
          *ngIf="!loading && hasPdf && pdfSafeUrl"
          [src]="pdfSafeUrl"
          [title]="iframeTitle"
          class="flex-1 w-full min-h-0 border-0 bg-white"
        ></iframe>

        <div
          *ngIf="!loading && !hasPdf"
          class="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 prose prose-sm max-w-none text-[var(--app-text)]"
          [innerHTML]="policyHtmlSafe"
        ></div>
      </main>
    </div>
  `,
})
export class PolicyAccessComponent implements OnInit, OnDestroy {
  loading = false;
  policyHtml = '';
  hasPdf = false;
  pdfObjectUrl = '';
  pdfSafeUrl: SafeResourceUrl | null = null;

  pageTitle = 'Política de Acesso';
  pageSubtitle = 'Termos aplicáveis para participação e confirmação de lances.';
  iframeTitle = 'PDF da política de acesso';

  private scope: PolicyScope = 'bids';

  private readonly settingsService = inject(SettingsService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);

  ngOnInit() {
    this.route.data
      .pipe(
        switchMap((data) => {
          this.scope = data['policyScope'] === 'wtPass' ? 'wtPass' : 'bids';
          this.applyScopeLabels();
          this.revokePdfUrl();
          this.hasPdf = false;
          this.pdfSafeUrl = null;
          this.loading = true;

          const fallbackHtml =
            '<p><strong>Política de acesso não configurada.</strong></p><p>Contate o administrador do sistema.</p>';

          const getPolicy: () => Observable<{ html: string; hasPdf?: boolean }> =
            this.scope === 'wtPass'
              ? () => this.settingsService.getWtPassPolicy()
              : () => this.settingsService.getBidPolicy();
          const getDoc: () => Observable<Blob> =
            this.scope === 'wtPass'
              ? () => this.settingsService.getWtPassPolicyDocumentBlob()
              : () => this.settingsService.getBidPolicyDocumentBlob();

          return getPolicy().pipe(
            switchMap((res) => {
              this.hasPdf = Boolean(res?.hasPdf);
              this.policyHtml = res?.html?.trim() || fallbackHtml;
              if (!this.hasPdf) {
                return of(undefined);
              }
              return getDoc().pipe(
                tap((blob) => {
                  if (!blob || blob.size === 0) {
                    this.hasPdf = false;
                    Swal.fire(
                      'Aviso',
                      'O PDF da política está vazio ou indisponível. Exibindo a versão em texto.',
                      'warning',
                    );
                    return;
                  }
                  this.revokePdfUrl();
                  this.pdfObjectUrl = URL.createObjectURL(blob);
                  this.pdfSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfObjectUrl);
                }),
                catchError(() => {
                  this.hasPdf = false;
                  Swal.fire(
                    'Aviso',
                    'Não foi possível carregar o PDF da política. Será exibida a versão em texto, se existir.',
                    'warning',
                  );
                  return of(undefined);
                }),
              );
            }),
            finalize(() => {
              this.loading = false;
              this.cdr.detectChanges();
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        error: () => {
          const msg =
            this.scope === 'wtPass'
              ? 'Não foi possível carregar a política de acesso do WT Pass.'
              : 'Não foi possível carregar a política de acesso.';
          Swal.fire('Erro', msg, 'error');
        },
      });
  }

  private applyScopeLabels() {
    if (this.scope === 'wtPass') {
      this.pageTitle = 'Política de Acesso — WT Pass';
      this.pageSubtitle =
        'Termos aplicáveis à inscrição e participação nos eventos WT Pass.';
      this.iframeTitle = 'PDF da política de acesso WT Pass';
    } else {
      this.pageTitle = 'Política de Acesso';
      this.pageSubtitle = 'Termos aplicáveis para participação e confirmação de lances.';
      this.iframeTitle = 'PDF da política de acesso';
    }
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
