import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MatchService } from '../../services/match.service';
import { EmailService, SendEmailsResponse, DisparoLogEntry, TemplateEmail } from '../../services/email.service';
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
          Selecione o tipo de disparo e o BID para enviar e-mails ou gerencie os templates.
        </p>
      </div>

      <div class="flex gap-1 p-2 mb-4 rounded-xl bg-white border border-gray-200 shadow-sm">
        <button
          type="button"
          (click)="abaAtual = 'disparo'"
          [class.bg-indigo-600]="abaAtual === 'disparo'"
          [class.text-white]="abaAtual === 'disparo'"
          [class.bg-white]="abaAtual !== 'disparo'"
          [class.text-gray-600]="abaAtual !== 'disparo'"
          class="px-4 py-2.5 rounded-lg text-sm font-semibold transition"
        >
          Disparo
        </button>
        <button
          type="button"
          (click)="irAbaTemplates()"
          [class.bg-indigo-600]="abaAtual === 'templates'"
          [class.text-white]="abaAtual === 'templates'"
          [class.bg-white]="abaAtual !== 'templates'"
          [class.text-gray-600]="abaAtual !== 'templates'"
          class="px-4 py-2.5 rounded-lg text-sm font-semibold transition"
        >
          Templates de e-mail
        </button>
      </div>

      <div *ngIf="abaAtual === 'disparo'" class="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
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
                    <div class="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        (click)="verLogsDisparo(m)"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-indigo-400 transition"
                        title="Ver log de disparos (destinatários e status)"
                      >
                        Ver log
                      </button>
                      <button
                        (click)="abrirModalDisparo(m)"
                        [disabled]="podeDisparar(m) === false"
                        [class.opacity-50]="podeDisparar(m) === false"
                        [class.cursor-not-allowed]="podeDisparar(m) === false"
                        class="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:hover:bg-indigo-600 transition"
                      >
                        Disparar
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Aba Templates de e-mail -->
      <div *ngIf="abaAtual === 'templates'" class="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
        <div class="p-4 space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-bold text-gray-800">Templates de e-mail</h3>
            <button (click)="novoTemplate()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-sm">+ Novo template</button>
          </div>
          <div class="rounded-xl border border-gray-200 overflow-hidden">
            <div *ngIf="templatesLoading" class="p-6 text-center text-gray-500">A carregar...</div>
            <div *ngIf="!templatesLoading && templatesList.length === 0" class="p-6 text-center text-gray-400">Nenhum template. Crie um novo template.</div>
            <table *ngIf="!templatesLoading && templatesList.length > 0" class="min-w-full text-sm">
              <thead class="bg-gray-50 text-gray-500 uppercase font-bold text-xs">
                <tr>
                  <th class="px-4 py-3 text-left">Nome</th>
                  <th class="px-4 py-3 text-left">Assunto</th>
                  <th class="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr *ngFor="let t of templatesList" class="hover:bg-gray-50">
                  <td class="px-4 py-3 font-medium text-gray-900">{{ t.nome }}</td>
                  <td class="px-4 py-3 text-gray-600">{{ t.assunto }}</td>
                  <td class="px-4 py-3 text-right">
                    <button (click)="visualizarTemplate(t)" class="mr-2 px-2 py-1 bg-sky-50 text-sky-700 rounded text-xs font-bold hover:bg-sky-100" title="Visualizar">👁 Visualizar</button>
                    <button (click)="testeEnvioTemplate(t)" class="mr-2 px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs font-bold hover:bg-amber-100" title="Enviar e-mail de teste">✉ Teste</button>
                    <button (click)="editarTemplate(t)" class="mr-2 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-bold hover:bg-indigo-100">Editar</button>
                    <button (click)="clonarTemplate(t)" class="mr-2 px-2 py-1 bg-sky-50 text-sky-700 rounded text-xs font-bold hover:bg-sky-100" title="Clonar">Clonar</button>
                    <button (click)="excluirTemplate(t)" class="p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100" title="Excluir">🗑️</button>
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
  abaAtual: 'disparo' | 'templates' = 'disparo';
  matches: any[] = [];
  loading = false;
  tipoAtivo: TipoDisparo = 'BID_ABERTO';
  currentUser: any = {};
  listas: any[] = [];
  templates: any[] = [];
  templatesList: TemplateEmail[] = [];
  templatesLoading = false;

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
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.carregarMatches();
    this.route.queryParams.subscribe((params) => {
      const aba = params['aba'];
      if (aba === 'templates') {
        this.abaAtual = 'templates';
        this.loadTemplates();
      }
    });
  }

  irAbaTemplates(): void {
    this.abaAtual = 'templates';
    this.loadTemplates();
    this.router.navigate([], { relativeTo: this.route, queryParams: { aba: 'templates' }, queryParamsHandling: 'merge' });
  }

  loadTemplates(): void {
    this.templatesLoading = true;
    this.emailService.getTemplates().subscribe({
      next: (data) => {
        this.templatesList = data;
        this.templatesLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.templatesLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  novoTemplate(): void {
    this.router.navigate(['/settings/templates-email/new'], { queryParams: { returnTo: 'disparo' } });
  }

  editarTemplate(t: TemplateEmail): void {
    this.router.navigate(['/settings/templates-email/edit', t.id], { queryParams: { returnTo: 'disparo' } });
  }

  visualizarTemplate(t: TemplateEmail): void {
    const userId = this.currentUser?.id;
    if (!userId) {
      Swal.fire('Aviso', 'Sessão inválida. Faça login novamente.', 'warning');
      return;
    }
    this.matchService.getMatches(userId, false).subscribe({
      next: (partidas) => {
        const inputOptions: { [key: string]: string } = { '': 'Nenhum (preview sem evento)' };
        partidas.forEach((p: any) => {
          inputOptions[p.id] = p.titulo || `Evento #${p.id}`;
        });
        Swal.fire({
          title: 'Visualizar template',
          text: 'Escolha um evento para preencher as tags (ex.: {{evento.titulo}}). Opcional.',
          input: 'select',
          inputOptions,
          inputPlaceholder: 'Selecionar evento',
          showCancelButton: true,
          confirmButtonText: 'Visualizar',
        }).then((result) => {
          if (result.isConfirmed) {
            const partidaId = result.value ? Number(result.value) : undefined;
            this.emailService.previewTemplate(t.id, partidaId).subscribe({
              next: (res) => {
                Swal.fire({
                  title: res.assunto || t.nome,
                  html: `<div class="text-left max-h-[60vh] overflow-auto border border-gray-200 rounded-lg p-4 bg-white">${res.html || ''}</div>`,
                  width: '700px',
                  showConfirmButton: true,
                  confirmButtonText: 'Fechar',
                });
              },
              error: (err) => Swal.fire('Erro', err.error?.error || 'Não foi possível carregar a pré-visualização.', 'error'),
            });
          }
        });
      },
      error: () => Swal.fire('Erro', 'Não foi possível carregar a lista de eventos.', 'error'),
    });
  }

  testeEnvioTemplate(t: TemplateEmail): void {
    const userId = this.currentUser?.id;
    if (!userId) {
      Swal.fire('Aviso', 'Sessão inválida. Faça login novamente.', 'warning');
      return;
    }
    this.matchService.getMatches(userId, false).subscribe({
      next: (partidas) => {
        const inputOptions: { [key: string]: string } = { '': 'Nenhum (sem evento)' };
        partidas.forEach((p: any) => {
          inputOptions[p.id] = p.titulo || `Evento #${p.id}`;
        });
        Swal.fire({
          title: 'E-mail de teste',
          text: 'Escolha o evento para preencher as tags no e-mail (opcional).',
          input: 'select',
          inputOptions,
          inputPlaceholder: 'Selecionar evento',
          showCancelButton: true,
          confirmButtonText: 'Próximo',
        }).then((result) => {
          if (result.isDismissed) return;
          const partidaId = result.value ? Number(result.value) : undefined;
          Swal.fire({
            title: 'E-mail de destino',
            text: `Enviar o template "${t.nome}" para qual endereço?`,
            input: 'email',
            inputPlaceholder: 'email@exemplo.com',
            inputValidator: (value) => (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Indique um e-mail válido.' : null),
            showCancelButton: true,
            confirmButtonText: 'Enviar',
          }).then((result2) => {
            if (result2.isConfirmed && result2.value) {
              this.emailService.testTemplate(t.id, result2.value, partidaId).subscribe({
                next: () => Swal.fire({ icon: 'success', title: 'E-mail de teste enviado!', text: `Enviado para ${result2.value}` }),
                error: (err) => Swal.fire('Erro', err.error?.error || err.error?.message || 'Falha ao enviar o e-mail de teste.', 'error'),
              });
            }
          });
        });
      },
      error: () => Swal.fire('Erro', 'Não foi possível carregar a lista de eventos.', 'error'),
    });
  }

  clonarTemplate(t: TemplateEmail): void {
    this.emailService.createTemplate(t.nome + ' (cópia)', t.assunto, t.corpo_html ?? '').subscribe({
      next: () => {
        this.loadTemplates();
        Swal.fire({ icon: 'success', title: 'Template clonado.', timer: 1500, showConfirmButton: false });
      },
      error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao clonar.', 'error'),
    });
  }

  async excluirTemplate(t: TemplateEmail): Promise<void> {
    const { isConfirmed } = await Swal.fire({
      title: 'Excluir template?',
      text: `"${t.nome}" será excluído permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
    });
    if (isConfirmed) {
      this.emailService.deleteTemplate(t.id).subscribe({
        next: () => {
          this.loadTemplates();
          Swal.fire({ icon: 'success', title: 'Template excluído.', timer: 1500, showConfirmButton: false });
        },
        error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao excluir.', 'error'),
      });
    }
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

  private escapeHtml(s: string): string {
    if (s == null || s === undefined) return '';
    const str = String(s);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  verLogsDisparo(match: any): void {
    this.emailService.getDisparosLog(match.id).subscribe({
      next: (logs: DisparoLogEntry[]) => {
        if (!logs || logs.length === 0) {
          Swal.fire('Informação', 'Nenhum disparo registrado para este BID.', 'info');
          return;
        }
        const labelTipo = (t: string) => {
          if (t === 'BID_ABERTO') return 'Bid Aberto';
          if (t === 'BID_ENCERRADO') return 'Bid Encerrado';
          if (t === 'GANHADORES') return 'Ganhadores';
          return t || '—';
        };
        const blocos = logs.map((log) => {
          const dataHora = log.data_hora ? new Date(log.data_hora).toLocaleString('pt-BR') : '—';
          const enviados = log.enviados ?? 0;
          const total = log.totalDestinatarios ?? 0;
          const erros = log.erros ?? 0;
          const dest = log.destinatarios || [];
          const rows = dest
            .map(
              (d) =>
                `<tr class="border-b border-gray-100 hover:bg-gray-50">
                  <td class="p-2 text-sm text-gray-800">${this.escapeHtml(d.email)}</td>
                  <td class="p-2"><span class="px-2 py-0.5 rounded text-xs font-medium ${d.status === 'enviado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">${d.status === 'enviado' ? 'Enviado' : 'Erro'}</span></td>
                  <td class="p-2 text-xs text-gray-500">${d.status === 'erro' && d.mensagem ? this.escapeHtml(d.mensagem) : '—'}</td>
                </tr>`
            )
            .join('');
          return `
            <div class="mb-4 rounded-lg border border-gray-200 overflow-hidden">
              <div class="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                <span>${dataHora}</span>
                <span>${labelTipo(log.tipoDisparo ?? '')}</span>
                <span>${this.escapeHtml(log.admin_nome || 'Sistema')}</span>
                <span class="text-emerald-600">${enviados}/${total} enviados</span>
                ${erros > 0 ? `<span class="text-red-600">${erros} erro(s)</span>` : ''}
              </div>
              <div class="overflow-x-auto max-h-48 overflow-y-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-gray-50 sticky top-0">
                    <tr><th class="p-2 border-b font-semibold text-gray-600">E-mail</th><th class="p-2 border-b font-semibold text-gray-600">Status</th><th class="p-2 border-b font-semibold text-gray-600">Mensagem</th></tr>
                  </thead>
                  <tbody class="bg-white">${rows || '<tr><td colspan="3" class="p-2 text-gray-400">Nenhum destinatário registrado.</td></tr>'}</tbody>
                </table>
              </div>
            </div>`;
        });
        const html = `<div class="overflow-y-auto max-h-[70vh] pr-1">${blocos.join('')}</div>`;
        Swal.fire({
          title: `Log de disparos: ${match.titulo}`,
          html,
          width: '900px',
          showConfirmButton: true,
          confirmButtonText: 'Fechar',
          customClass: { popup: 'rounded-xl' },
        });
      },
      error: () => Swal.fire('Erro', 'Falha ao carregar log de disparos.', 'error'),
    });
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
          <option value="grupo" selected>Participantes do grupo</option>
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
        const popup = Swal.getPopup();
        const dest = popup?.querySelector('#swal-dest') as HTMLSelectElement | null;
        const wrap = popup?.querySelector('#swal-lista-wrap');
        if (dest) {
          dest.value = 'grupo';
          if (wrap) {
            dest.addEventListener('change', () => {
              (wrap as HTMLElement).classList.toggle('hidden', dest.value !== 'lista');
            });
          }
        }
      },
      preConfirm: () => {
        const popup = Swal.getPopup();
        const templateEl = popup?.querySelector('#swal-template') as HTMLSelectElement | null;
        const templateId = templateEl ? Number(templateEl.value) : 0;
        if (!templateId) {
          Swal.showValidationMessage('Selecione o template.');
          return null;
        }
        let listaId: number | undefined;
        let usarGrupo = false;
        if (usaLista) {
          const dest = popup?.querySelector('#swal-dest') as HTMLSelectElement | null;
          const destValue = (dest?.value ?? 'grupo').trim() || 'grupo';
          console.log('[Disparo] preConfirm destinatários:', { destValue, raw: dest?.value });
          if (destValue === 'lista') {
            const listaEl = popup?.querySelector('#swal-lista') as HTMLSelectElement | null;
            listaId = listaEl ? Number(listaEl.value) : undefined;
            if (!listaId) {
              Swal.showValidationMessage('Selecione a lista de e-mails.');
              return null;
            }
          } else {
            usarGrupo = true;
          }
        }
        console.log('[Disparo] preConfirm resultado:', { templateId, listaId, usarGrupo });
        return { templateId, listaId, usarGrupo };
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
        const { templateId, listaId, usarGrupo } = result.value!;
        console.log('[Disparo] Enviando:', { partidaId: match.id, templateId, listaId, usarGrupo });
        this.emailService
          .send(match.id, templateId, this.currentUser?.id, { listaId, usarGrupo, tipoDisparo: this.tipoAtivo })
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
              console.error('[Disparo] Erro na requisição:', err.status, err.error);
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
