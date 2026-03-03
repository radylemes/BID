import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MatchService } from '../../services/match.service';
import { EmailService, SendEmailsResponse } from '../../services/email.service';
import Swal from 'sweetalert2';

type TipoDisparo = 'BID_ABERTO' | 'BID_ENCERRADO' | 'GANHADORES';

@Component({
  selector: 'app-disparo-emails',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto p-4 md:p-6 bg-gray-50 min-h-screen">
      <div class="mb-6">
        <h2 class="text-3xl font-extrabold text-gray-800 tracking-tight">Disparo de E-mails</h2>
        <p class="text-sm text-gray-500 font-medium mt-1">
          Selecione o tipo de disparo e o BID para enviar e-mails aos participantes.
        </p>
      </div>

      <div class="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
        <div class="flex gap-1 p-2 bg-gray-50 border-b border-gray-200">
          <button
            type="button"
            (click)="tipoAtivo = 'BID_ABERTO'"
            [class.bg-white]="tipoAtivo === 'BID_ABERTO'"
            [class.shadow-sm]="tipoAtivo === 'BID_ABERTO'"
            [class.text-indigo-700]="tipoAtivo === 'BID_ABERTO'"
            [class.font-semibold]="tipoAtivo === 'BID_ABERTO'"
            class="px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
          >
            1 – Bid Aberto
          </button>
          <button
            type="button"
            (click)="tipoAtivo = 'BID_ENCERRADO'"
            [class.bg-white]="tipoAtivo === 'BID_ENCERRADO'"
            [class.shadow-sm]="tipoAtivo === 'BID_ENCERRADO'"
            [class.text-indigo-700]="tipoAtivo === 'BID_ENCERRADO'"
            [class.font-semibold]="tipoAtivo === 'BID_ENCERRADO'"
            class="px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
          >
            2 – Bid Encerrado
          </button>
          <button
            type="button"
            (click)="tipoAtivo = 'GANHADORES'"
            [class.bg-white]="tipoAtivo === 'GANHADORES'"
            [class.shadow-sm]="tipoAtivo === 'GANHADORES'"
            [class.text-indigo-700]="tipoAtivo === 'GANHADORES'"
            [class.font-semibold]="tipoAtivo === 'GANHADORES'"
            class="px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
          >
            3 – Ganhadores
          </button>
        </div>

        <div class="p-4">
          <p class="text-sm text-gray-600 mb-4" [innerHTML]="descricaoTipo"></p>

          <div *ngIf="loading" class="py-8 text-center text-gray-500">
            <span class="animate-pulse">Carregando BIDs...</span>
          </div>

          <div *ngIf="!loading && matches.length === 0" class="py-8 text-center text-gray-400">
            Nenhum BID encontrado.
          </div>

          <div *ngIf="!loading && matches.length > 0" class="overflow-x-auto rounded-xl border border-gray-200">
            <table class="min-w-[700px] w-full text-sm">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-200">
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">BID</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Disparos já feitos</th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Ação</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr *ngFor="let m of matchesFiltrados" class="hover:bg-gray-50/80">
                  <td class="px-4 py-3">
                    <div class="font-semibold text-gray-900">{{ m.titulo }}</div>
                    <div class="text-xs text-gray-500">{{ m.nome_grupo || 'Público' }} · {{ m.data_limite_aposta | date:'dd/MM/yyyy HH:mm' }}</div>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span
                      [ngClass]="{
                        'bg-emerald-500/10 text-emerald-700': m.status === 'ABERTA',
                        'bg-gray-100 text-gray-600': m.status !== 'ABERTA'
                      }"
                      class="inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase"
                    >
                      {{ m.status }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex flex-wrap justify-center gap-1">
                      <span
                        [title]="m.email_bid_aberto_em ? ('Enviado em ' + (m.email_bid_aberto_em | date:'dd/MM HH:mm')) : 'Não enviado'"
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        [class.bg-emerald-100]="m.email_bid_aberto_em"
                        [class.text-emerald-700]="m.email_bid_aberto_em"
                        [class.bg-gray-100]="!m.email_bid_aberto_em"
                        [class.text-gray-500]="!m.email_bid_aberto_em"
                      >
                        Aberto {{ m.email_bid_aberto_em ? '✓' : '—' }}
                      </span>
                      <span
                        [title]="m.email_bid_encerrado_em ? ('Enviado em ' + (m.email_bid_encerrado_em | date:'dd/MM HH:mm')) : 'Não enviado'"
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        [class.bg-emerald-100]="m.email_bid_encerrado_em"
                        [class.text-emerald-700]="m.email_bid_encerrado_em"
                        [class.bg-gray-100]="!m.email_bid_encerrado_em"
                        [class.text-gray-500]="!m.email_bid_encerrado_em"
                      >
                        Encerrado {{ m.email_bid_encerrado_em ? '✓' : '—' }}
                      </span>
                      <span
                        [title]="m.email_ganhadores_em ? ('Enviado em ' + (m.email_ganhadores_em | date:'dd/MM HH:mm')) : 'Não enviado'"
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        [class.bg-emerald-100]="m.email_ganhadores_em"
                        [class.text-emerald-700]="m.email_ganhadores_em"
                        [class.bg-gray-100]="!m.email_ganhadores_em"
                        [class.text-gray-500]="!m.email_ganhadores_em"
                      >
                        Ganhadores {{ m.email_ganhadores_em ? '✓' : '—' }}
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button
                      (click)="abrirModalDisparo(m)"
                      [disabled]="podeDisparar(m) === false"
                      [class.opacity-50]="podeDisparar(m) === false"
                      [class.cursor-not-allowed]="podeDisparar(m) === false"
                      class="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:hover:bg-indigo-600 transition"
                    >
                      Disparar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DisparoEmailsComponent implements OnInit {
  matches: any[] = [];
  loading = false;
  tipoAtivo: TipoDisparo = 'BID_ABERTO';
  currentUser: any = {};
  listas: any[] = [];
  templates: any[] = [];

  get descricaoTipo(): string {
    switch (this.tipoAtivo) {
      case 'BID_ABERTO':
        return 'Enviar e-mail avisando que o BID está aberto para apostas. Destinatários: participantes do grupo ou lista de e-mails.';
      case 'BID_ENCERRADO':
        return 'Enviar e-mail com o resultado (apostas realizadas). Inclui PDF com nome e aposta. Apenas para BIDs já encerrados.';
      case 'GANHADORES':
        return 'Enviar e-mail apenas para os usuários vencedores do BID. Apenas para BIDs já finalizados com sorteio.';
      default:
        return '';
    }
  }

  get matchesFiltrados(): any[] {
    return this.matches;
  }

  constructor(
    private matchService: MatchService,
    private emailService: EmailService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.carregarMatches();
  }

  carregarMatches(): void {
    const userId = this.currentUser?.id;
    if (!userId) {
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }
    this.loading = true;
    this.cdr.markForCheck();
    this.matchService
      .getMatches(userId, false)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (data) => {
          this.matches = data || [];
        },
        error: () => {},
      });
  }

  podeDisparar(m: any): boolean {
    if (this.tipoAtivo === 'BID_ABERTO') return true;
    const status = (m.status || '').toUpperCase();
    if (this.tipoAtivo === 'BID_ENCERRADO' || this.tipoAtivo === 'GANHADORES') {
      return status === 'ENCERRADA' || status === 'FINALIZADA';
    }
    return true;
  }

  abrirModalDisparo(match: any): void {
    if (this.tipoAtivo !== 'BID_ABERTO' && (match.status || '').toUpperCase() !== 'ENCERRADA' && (match.status || '').toUpperCase() !== 'FINALIZADA') {
      Swal.fire('Atenção', 'Este disparo só é permitido para BID já encerrado ou finalizado.', 'warning');
      return;
    }

    forkJoin({
      listas: this.emailService.getLists(),
      templates: this.emailService.getTemplates(),
    }).subscribe({
      next: ({ listas, templates }) => {
        this.listas = listas || [];
        this.templates = templates || [];
        this.mostrarModalDisparo(match);
      },
      error: () => Swal.fire('Erro', 'Falha ao carregar listas ou templates.', 'error'),
    });
  }

  private mostrarModalDisparo(match: any): void {
    const usaLista = this.tipoAtivo === 'BID_ABERTO' || this.tipoAtivo === 'BID_ENCERRADO';
    const listasOptions =
      this.listas.length > 0
        ? this.listas.map((l) => `<option value="${l.id}">${l.nome}</option>`).join('')
        : '<option value="">— Nenhuma lista —</option>';
    const templatesOptions =
      this.templates.length > 0
        ? this.templates.map((t) => `<option value="${t.id}">${t.nome} – ${t.assunto}</option>`).join('')
        : '<option value="">— Nenhum template —</option>';

    let html = `
      <p class="text-left text-sm text-gray-600 mb-3">BID: <strong>${match.titulo}</strong></p>
      <p class="text-left text-xs text-gray-500 mb-3">Tipo: <strong>${this.getLabelTipo(this.tipoAtivo)}</strong></p>
      <label class="block text-left text-xs font-bold text-gray-500 uppercase mb-1">Template</label>
      <select id="swal-template" class="swal2-input w-full m-0 mb-3">${templatesOptions}</select>
    `;

    if (usaLista) {
      html += `
        <label class="block text-left text-xs font-bold text-gray-500 uppercase mb-1">Destinatários</label>
        <select id="swal-dest" class="swal2-input w-full m-0 mb-2">
          <option value="grupo">Participantes do grupo</option>
          <option value="lista">Lista de e-mails</option>
        </select>
        <div id="swal-lista-wrap" class="hidden">
          <label class="block text-left text-xs font-bold text-gray-500 uppercase mb-1">Lista</label>
          <select id="swal-lista" class="swal2-input w-full m-0">${listasOptions}</select>
        </div>
      `;
    }

    Swal.fire({
      title: 'Disparar e-mail',
      html,
      showCancelButton: true,
      confirmButtonText: 'Disparar',
      confirmButtonColor: '#4f46e5',
      didOpen: () => {
        const dest = document.getElementById('swal-dest') as HTMLSelectElement;
        const wrap = document.getElementById('swal-lista-wrap');
        if (dest && wrap) {
          dest.addEventListener('change', () => {
            wrap.classList.toggle('hidden', dest.value !== 'lista');
          });
        }
      },
      preConfirm: () => {
        const templateEl = document.getElementById('swal-template') as HTMLSelectElement;
        const templateId = templateEl ? Number(templateEl.value) : 0;
        if (!templateId) {
          Swal.showValidationMessage('Selecione o template.');
          return null;
        }
        let listaId: number | undefined;
        if (usaLista) {
          const dest = document.getElementById('swal-dest') as HTMLSelectElement;
          if (dest?.value === 'lista') {
            const listaEl = document.getElementById('swal-lista') as HTMLSelectElement;
            listaId = listaEl ? Number(listaEl.value) : undefined;
            if (!listaId) {
              Swal.showValidationMessage('Selecione a lista de e-mails.');
              return null;
            }
          }
        }
        return { templateId, listaId };
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        Swal.fire({
          title: 'Enviando...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });
        const listaId = result.value!.listaId;
        if (listaId == null) {
          Swal.fire('Erro', 'Selecione uma lista de e-mails.', 'error');
          return;
        }
        this.emailService
          .send(match.id, listaId, result.value!.templateId, this.currentUser?.id)
          .subscribe({
            next: (res: SendEmailsResponse) => {
              const msg =
                res.erros && res.erros.length > 0
                  ? `${res.enviados} enviado(s). Erros: ${res.erros.slice(0, 3).join('; ')}${res.erros.length > 3 ? '...' : ''}`
                  : `${res.enviados} e-mail(s) enviado(s) com sucesso.`;
              Swal.fire({ icon: 'success', title: 'Disparo concluído', text: msg });
              this.carregarMatches();
            },
            error: (err: HttpErrorResponse) => {
              Swal.fire('Erro', err.error?.error || 'Falha ao enviar e-mails.', 'error');
            },
          });
      }
    });
  }

  private getLabelTipo(t: TipoDisparo): string {
    switch (t) {
      case 'BID_ABERTO':
        return '1 – Bid Aberto';
      case 'BID_ENCERRADO':
        return '2 – Bid Encerrado';
      case 'GANHADORES':
        return '3 – Ganhadores';
      default:
        return t;
    }
  }
}
