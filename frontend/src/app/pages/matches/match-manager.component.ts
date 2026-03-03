import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { of, forkJoin } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { MatchService } from '../../services/match.service';
import { SettingsService, ExportPdfStyle } from '../../services/settings.service';
import { EmailService } from '../../services/email.service';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-match-manager',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto p-4 bg-gray-50 min-h-screen">
      <div
        class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white p-6 rounded-xl shadow-md border border-gray-100"
      >
        <div>
          <h2 class="text-3xl font-extrabold text-gray-800 tracking-tight">Gerenciar BIDs</h2>
          <p class="text-sm text-gray-500 font-medium">
            Total de {{ matches.length }} BIDs cadastrados
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            (click)="criarSetor()"
            class="flex items-center gap-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2.5 rounded-lg font-bold text-sm transition-all border border-indigo-200"
          >
            <img
              src="assets/allianz_stadium_seat_realistic.png"
              alt=""
              class="w-10 h-10 object-contain"
            />
            Criar setor
          </button>
          <button
            (click)="criarJogo()"
            class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold shadow-md text-sm transition-all active:scale-95"
          >
            <img
              src="assets/allianz_ticket_blue_cartoon.png"
              alt=""
              class="w-10 h-10 object-contain inline-block align-middle"
            />
            Novo BID
          </button>
        </div>
      </div>

      <div class="bg-white shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
        <div *ngIf="loading" class="p-8 text-center text-gray-500">
          <span class="animate-pulse">Carregando BIDs...</span>
        </div>
        <div *ngIf="!loading && matches.length === 0" class="p-8 text-center text-gray-400">
          Nenhum bid encontrado. Crie um novo!
        </div>

        <div
          *ngIf="!loading && matches.length > 0"
          class="border-b border-gray-200 bg-gray-50/50 px-4 pt-4"
        >
          <div class="flex gap-1 rounded-lg p-1 bg-gray-100 w-fit">
            <button
              type="button"
              (click)="abaAtiva = 'atuais'"
              [class.bg-white]="abaAtiva === 'atuais'"
              [class.shadow-sm]="abaAtiva === 'atuais'"
              [class.text-indigo-700]="abaAtiva === 'atuais'"
              [class.font-semibold]="abaAtiva === 'atuais'"
              class="px-4 py-2.5 rounded-md text-sm text-gray-600 hover:text-gray-800 transition"
            >
              Em andamento ({{ matchesAtuaisCount }})
            </button>
            <button
              type="button"
              (click)="abaAtiva = 'anteriores'"
              [class.bg-white]="abaAtiva === 'anteriores'"
              [class.shadow-sm]="abaAtiva === 'anteriores'"
              [class.text-indigo-700]="abaAtiva === 'anteriores'"
              [class.font-semibold]="abaAtiva === 'anteriores'"
              class="px-4 py-2.5 rounded-md text-sm text-gray-600 hover:text-gray-800 transition"
            >
              Anteriores ({{ matchesAnterioresCount }})
            </button>
          </div>
        </div>

        <div
          *ngIf="!loading && matches.length > 0 && displayedMatches.length > 0"
          class="overflow-x-auto rounded-xl border border-gray-200/80"
        >
          <table class="min-w-[900px] w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200">
                <th
                  class="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  BID
                </th>
                <th
                  class="px-4 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                >
                  Ingressos
                </th>
                <th
                  class="px-4 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                >
                  Não sort.
                </th>
                <th
                  class="px-4 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                >
                  Datas
                </th>
                <th
                  class="px-4 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  class="px-4 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                >
                  Ações
                </th>
                <th
                  class="px-4 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                >
                  Relatórios
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
              <tr *ngFor="let m of displayedMatches" class="hover:bg-gray-50/80 transition-colors">
                <td class="px-5 py-4">
                  <div class="font-semibold text-gray-900">{{ m.titulo }}</div>
                  <div
                    class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1.5"
                  >
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200 shrink-0"
                    >
                      {{ m.nome_grupo || 'Público' }}
                    </span>
                    <span class="flex items-center gap-1"
                      ><span class="text-rose-500">📍</span>
                      {{ m.local || 'Local não definido' }}</span
                    >
                    <span
                      *ngIf="m.setor_evento_nome"
                      class="flex items-center gap-1 text-indigo-600 font-medium"
                      ><span aria-hidden="true">🪑</span> {{ m.setor_evento_nome }}</span
                    >
                  </div>
                </td>
                <td class="px-4 py-4 text-center align-middle">
                  <span
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                    [title]="
                      (m.ingressos_transferidos || 0) > 0
                        ? (m.quantidade_premios_efetiva ?? m.quantidade_premios ?? 1) +
                          ' orig., ' +
                          m.ingressos_transferidos +
                          ' transf.'
                        : null
                    "
                    ><img
                      src="assets/allianz_ticket_blue_cartoon.png"
                      alt=""
                      class="w-4 h-4 object-contain inline-block"
                      aria-hidden="true"
                    />
                    {{
                      m.quantidade_premios_restante ??
                        m.quantidade_premios_efetiva ??
                        m.quantidade_premios ??
                        1
                    }}</span
                  >
                </td>
                <td class="px-4 py-4 text-center align-middle">
                  <span
                    *ngIf="m.status !== 'ABERTA' && (m.ingressos_nao_sorteados || 0) > 0"
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                    title="Não sorteados"
                    ><span aria-hidden="true">🎟️</span> {{ m.ingressos_nao_sorteados }}</span
                  >
                  <span
                    *ngIf="m.status === 'ABERTA' || (m.ingressos_nao_sorteados || 0) === 0"
                    class="text-gray-300"
                    >—</span
                  >
                </td>
                <td class="px-4 py-4 text-center align-middle">
                  <div class="flex flex-col gap-0.5 text-xs">
                    <span
                      class="text-emerald-600 font-medium flex items-center justify-center gap-1"
                      ><span aria-hidden="true">🟢</span>
                      {{ m.data_inicio_apostas | date: 'dd/MM HH:mm' }}</span
                    >
                    <span class="text-rose-500 font-medium flex items-center justify-center gap-1"
                      ><span aria-hidden="true">🔴</span>
                      {{ m.data_limite_aposta | date: 'dd/MM HH:mm' }}</span
                    >
                  </div>
                </td>
                <td class="px-4 py-4 text-center align-middle">
                  <span
                    [ngClass]="{
                      'bg-emerald-500/10 text-emerald-700 border-emerald-300':
                        m.status === 'ABERTA',
                      'bg-gray-100 text-gray-600 border-gray-200': m.status !== 'ABERTA',
                    }"
                    class="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border"
                    >{{ m.status }}</span
                  >
                </td>
                <td class="px-4 py-4 text-right align-middle">
                  <div class="flex justify-end items-center gap-1.5 flex-wrap">
                    <button
                      (click)="m.status === 'ABERTA' && editarJogo(m)"
                      [disabled]="m.status !== 'ABERTA'"
                      [class.opacity-50]="m.status !== 'ABERTA'"
                      [class.cursor-not-allowed]="m.status !== 'ABERTA'"
                      class="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 transition disabled:hover:bg-blue-50"
                      [title]="m.status === 'ABERTA' ? 'Editar' : 'Edição não permitida'"
                    >
                      ✏️
                    </button>
                    <button
                      (click)="clonarJogo(m)"
                      class="p-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-100 transition"
                      title="Clonar"
                    >
                      📑
                    </button>
                    <button
                      *ngIf="m.status === 'ABERTA'"
                      (click)="finalizarJogo(m)"
                      class="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100 transition"
                      title="Encerrar"
                    >
                      🏁
                    </button>
                    <button
                      (click)="excluirJogo(m)"
                      class="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 transition"
                      title="Excluir"
                    >
                      🗑️
                    </button>
                    <span class="w-px h-5 bg-gray-200 mx-0.5" *ngIf="m.status !== 'ABERTA'"></span>
                    <button
                      *ngIf="m.status !== 'ABERTA' && (m.ingressos_nao_sorteados || 0) > 0"
                      (click)="redistribuir(m)"
                      class="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100 transition"
                      title="Encaminhar sobresalentes"
                    >
                      🔄
                    </button>
                    <button
                      *ngIf="m.status !== 'ABERTA'"
                      (click)="acrescentarIngressos(m)"
                      class="p-2 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-100 transition"
                      title="Acrescentar ingressos"
                    >
                      ➕
                    </button>
                  </div>
                </td>
                <td class="px-4 py-4 text-right align-middle">
                  <div class="flex justify-end items-center gap-1.5">
                    <button
                      (click)="dispararEmail(m)"
                      class="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition"
                      title="Enviar e-mail"
                    >
                      ✉️ E-mail
                    </button>
                    <button
                      *ngIf="m.status !== 'ABERTA'"
                      (click)="baixarRelatorio(m, 'pdf')"
                      class="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition"
                      title="PDF"
                    >
                      PDF
                    </button>
                    <button
                      *ngIf="m.status !== 'ABERTA'"
                      (click)="baixarRelatorio(m, 'excel')"
                      class="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                      title="Excel"
                    >
                      Excel
                    </button>
                    <span *ngIf="m.status === 'ABERTA'" class="text-gray-300 text-xs">—</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          *ngIf="!loading && matches.length > 0 && displayedMatches.length === 0"
          class="p-8 text-center text-gray-500"
        >
          Nenhum BID nesta aba.
        </div>
      </div>
    </div>
  `,
})
export class MatchManagerComponent implements OnInit {
  matches: any[] = [];
  groups: any[] = [];
  setoresEvento: any[] = [];
  currentUser: any = {};
  loading: boolean = false;
  abaAtiva: 'atuais' | 'anteriores' = 'atuais';

  private get hojeInicio(): Date {
    const h = new Date();
    h.setHours(0, 0, 0, 0);
    return h;
  }

  get displayedMatches(): any[] {
    if (this.abaAtiva === 'anteriores') {
      return this.matches.filter((m) => {
        if (!m.data_jogo) return false;
        const d = new Date(m.data_jogo);
        d.setHours(0, 0, 0, 0);
        return d.getTime() < this.hojeInicio.getTime();
      });
    }
    return this.matches.filter((m) => {
      if (!m.data_jogo) return true;
      const d = new Date(m.data_jogo);
      d.setHours(0, 0, 0, 0);
      return d.getTime() >= this.hojeInicio.getTime();
    });
  }

  get matchesAtuaisCount(): number {
    return this.matches.filter((m) => {
      if (!m.data_jogo) return true;
      const d = new Date(m.data_jogo);
      d.setHours(0, 0, 0, 0);
      return d.getTime() >= this.hojeInicio.getTime();
    }).length;
  }

  get matchesAnterioresCount(): number {
    return this.matches.filter((m) => {
      if (!m.data_jogo) return false;
      const d = new Date(m.data_jogo);
      d.setHours(0, 0, 0, 0);
      return d.getTime() < this.hojeInicio.getTime();
    }).length;
  }

  constructor(
    private matchService: MatchService,
    private settingsService: SettingsService,
    private emailService: EmailService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!localStorage.getItem('token') || !this.currentUser?.id) return;
    this.carregar();
    this.carregarGrupos();
    this.carregarSetoresEvento();
  }

  carregarSetoresEvento() {
    this.matchService.getSetoresEvento().subscribe({
      next: (data) => {
        this.setoresEvento = data;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  async dispararEmail(match: any) {
    forkJoin({
      listas: this.emailService.getLists(),
      templates: this.emailService.getTemplates(),
    }).subscribe({
      next: ({ listas, templates }) => {
        const listasOptions = listas.length
          ? listas.map((l) => `<option value="${l.id}">${l.nome}</option>`).join('')
          : '<option value="">— Nenhuma lista —</option>';
        const templatesOptions = templates.length
          ? templates.map((t) => `<option value="${t.id}">${t.nome} – ${t.assunto}</option>`).join('')
          : '<option value="">— Nenhum template —</option>';
        Swal.fire({
          title: 'Enviar e-mail',
          html: `
            <p class="text-left text-sm text-gray-600 mb-3">BID: <strong>${match.titulo}</strong></p>
            <label class="block text-left text-xs font-bold text-gray-500 uppercase mb-1">Lista de e-mail</label>
            <select id="swal-lista" class="swal2-input w-full m-0 mb-3">${listasOptions}</select>
            <label class="block text-left text-xs font-bold text-gray-500 uppercase mb-1">Template</label>
            <select id="swal-template" class="swal2-input w-full m-0">${templatesOptions}</select>
          `,
          showCancelButton: true,
          confirmButtonText: 'Enviar',
          confirmButtonColor: '#4f46e5',
          preConfirm: () => {
            const listaId = Number((document.getElementById('swal-lista') as HTMLSelectElement)?.value);
            const templateId = Number((document.getElementById('swal-template') as HTMLSelectElement)?.value);
            if (!listaId || !templateId) {
              Swal.showValidationMessage('Selecione a lista e o template.');
              return null;
            }
            return { listaId, templateId };
          },
        }).then((result) => {
          if (result.isConfirmed && result.value) {
            Swal.fire({ title: 'Enviando...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
            this.emailService
              .send(match.id, result.value!.listaId, result.value!.templateId, this.currentUser?.id)
              .subscribe({
                next: (res) => {
                  const msg = res.erros?.length
                    ? `${res.enviados} enviado(s). Erros: ${res.erros.slice(0, 3).join('; ')}${res.erros.length > 3 ? '...' : ''}`
                    : `${res.enviados} e-mail(s) enviado(s) com sucesso.`;
                  Swal.fire({ icon: 'success', title: 'Disparo concluído', text: msg });
                },
                error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao enviar e-mails.', 'error'),
              });
          }
        });
      },
      error: () => Swal.fire('Erro', 'Falha ao carregar listas ou templates.', 'error'),
    });
  }

  buildSetoresModalHtml(): string {
    const list = (this.setoresEvento || [])
      .map(
        (s) =>
          `<div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <span class="text-sm font-medium text-gray-800">${s.nome}</span>
            <button type="button" data-delete-setor-id="${s.id}" class="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs font-medium transition">Excluir</button>
          </div>`,
      )
      .join('');
    return `
      <div class="text-left">
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Cadastrados</p>
        <div id="setores-lista" class="max-h-48 overflow-y-auto mb-4 rounded-lg border border-gray-100 bg-gray-50/50 p-2">${list || '<p class="text-gray-400 text-sm py-2">Nenhum setor cadastrado.</p>'}</div>
        <hr class="my-4 border-gray-100">
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Novo setor</p>
        <div class="flex gap-2">
          <input id="setor-novo-nome" type="text" class="swal2-input flex-1 m-0 text-sm" placeholder="Ex.: Cadeira inferior, Pista, Camarote">
          <button type="button" id="setor-novo-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">Adicionar</button>
        </div>
      </div>
    `;
  }

  private refreshSetoresModalContent(): void {
    this.matchService.getSetoresEvento().subscribe((data) => {
      this.setoresEvento = data;
      this.cdr.detectChanges();
      const container = Swal.getHtmlContainer();
      if (container && Swal.getTitle()?.textContent?.includes('Setores de evento')) {
        container.innerHTML = this.buildSetoresModalHtml();
        this.attachSetoresHandlers();
      } else {
        Swal.close();
        Swal.fire({
          title: 'Setores de evento',
          html: this.buildSetoresModalHtml(),
          showConfirmButton: false,
          showCancelButton: true,
          cancelButtonText: 'Fechar',
          cancelButtonColor: '#6b7280',
          width: '480px',
          didOpen: () => this.attachSetoresHandlers(),
        });
      }
    });
  }

  private attachSetoresHandlers(): void {
    const container = Swal.getHtmlContainer();
    if (!container) return;
    container.querySelectorAll('[data-delete-setor-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-delete-setor-id');
        if (!id) return;
        Swal.fire({
          title: 'Excluir setor?',
          text: 'BIDs que usam este setor ficarão sem setor.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#dc2626',
          cancelButtonColor: '#6b7280',
        }).then((r) => {
          if (r.isConfirmed) {
            this.matchService.deleteSetorEvento(Number(id)).subscribe({
              next: () => this.refreshSetoresModalContent(),
              error: () => Swal.fire('Erro', 'Não foi possível excluir o setor.', 'error'),
            });
          }
        });
      });
    });
    const addBtn = container.querySelector('#setor-novo-btn');
    const addInput = container.querySelector('#setor-novo-nome') as HTMLInputElement | null;
    if (addBtn && addInput) {
      addBtn.addEventListener('click', () => {
        const nome = addInput.value?.trim();
        if (!nome) {
          Swal.fire('Atenção', 'Informe o nome do setor.', 'warning');
          return;
        }
        if (this.setoresEvento.some((s) => s.nome.toLowerCase() === nome.toLowerCase())) {
          Swal.fire('Atenção', 'Já existe um setor com este nome.', 'warning');
          return;
        }
        this.matchService.createSetorEvento(nome, this.currentUser.id).subscribe({
          next: () => {
            addInput.value = '';
            this.refreshSetoresModalContent();
          },
          error: () => Swal.fire('Erro', 'Não foi possível criar o setor.', 'error'),
        });
      });
    }
  }

  async criarSetor() {
    this.matchService.getSetoresEvento().subscribe((data) => {
      this.setoresEvento = data;
      this.cdr.detectChanges();
      Swal.fire({
        title: 'Setores de evento',
        html: this.buildSetoresModalHtml(),
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Fechar',
        cancelButtonColor: '#6b7280',
        width: '480px',
        didOpen: () => this.attachSetoresHandlers(),
      });
    });
  }

  async redistribuir(match: any) {
    const bidsReceptor = this.matches.filter((m) => m.id !== match.id);
    if (bidsReceptor.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Nenhum BID receptor',
        text: 'Não há outro BID para receber os ingressos sobresalentes.',
        confirmButtonColor: '#4f46e5',
      });
      return;
    }
    const maxTransferir = match.ingressos_nao_sorteados || 1;
    const optionsHtml = bidsReceptor
      .map(
        (m) =>
          `<option value="${m.id}">${m.titulo || 'Sem título'} (${m.quantidade_premios_restante ?? m.quantidade_premios_efetiva ?? m.quantidade_premios ?? 1} ing.) — ${m.status === 'ABERTA' ? 'Aberto' : 'Encerrado'}</option>`,
      )
      .join('');
    const { value: result, isConfirmed } = await Swal.fire({
      title: 'Encaminhar ingressos sobresalentes',
      html: `
        <p class="text-left text-sm text-gray-600 mb-2">
          <strong>${match.titulo}</strong> tem <strong>${maxTransferir}</strong> ingresso(s) sobresalentes disponíveis.
        </p>
        <label class="block text-left text-xs font-medium text-gray-600 mt-3 mb-1">Quantidade a transferir (máx. ${maxTransferir})</label>
        <input id="swal-quantidade-redist" type="number" min="1" max="${maxTransferir}" value="${maxTransferir}" class="swal2-input w-full m-0 text-sm">
        <label class="block text-left text-xs font-medium text-gray-600 mt-3 mb-1">BID receptor</label>
        <select id="swal-bid-receptor" class="swal2-input w-full m-0 text-sm">
          ${optionsHtml}
        </select>
        <label class="block text-left text-xs font-medium text-gray-600 mt-3 mb-1">Motivo (obrigatório para auditoria)</label>
        <input id="swal-motivo-redist" class="swal2-input w-full m-0 text-sm" placeholder="Ex.: Realocação de sobra para outro evento">
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      confirmButtonText: 'Encaminhar',
      preConfirm: () => {
        const partidaDestinoId = Number(
          (document.getElementById('swal-bid-receptor') as HTMLSelectElement)?.value,
        );
        const qtdInput = document.getElementById('swal-quantidade-redist') as HTMLInputElement;
        const quantidade = qtdInput
          ? Math.min(Math.max(1, Math.floor(Number(qtdInput.value) || 1)), maxTransferir)
          : maxTransferir;
        const m = (document.getElementById('swal-motivo-redist') as HTMLInputElement)?.value;
        if (!m || !m.trim()) {
          Swal.showValidationMessage('O motivo é obrigatório.');
          return null;
        }
        if (!partidaDestinoId) {
          Swal.showValidationMessage('Selecione o BID receptor.');
          return null;
        }
        return { partidaDestinoId, quantidade, motivo: m.trim() };
      },
    });
    if (isConfirmed && result) {
      const destTitulo =
        bidsReceptor.find((b) => b.id === result.partidaDestinoId)?.titulo || 'BID receptor';
      const { isConfirmed: consentimento } = await Swal.fire({
        title: 'Confirmar alteração',
        html: `
          <p class="text-left text-sm text-gray-600 mb-2">
            Deseja realmente <strong>encaminhar ${result.quantidade} ingresso(s)</strong> de <strong>${match.titulo}</strong> para <strong>${destTitulo}</strong>?
          </p>
          <p class="text-left text-xs text-gray-500">Motivo: ${result.motivo}</p>
          <p class="text-left text-xs text-amber-600 mt-2 font-medium">Esta ação altera dados do sistema. Confirme apenas se tiver certeza.</p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f59e0b',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sim, encaminhar',
        cancelButtonText: 'Cancelar',
      });
      if (!consentimento) return;

      this.loading = true;
      this.matchService
        .redistribuirIngressos(
          match.id,
          result.partidaDestinoId,
          result.quantidade,
          result.motivo,
          this.currentUser.id,
        )
        .subscribe({
          next: (res: any) => {
            this.loading = false;
            const qtd = res.quantidade_encaminhada ?? 0;
            const dest = res.partida_destino_titulo || 'BID receptor';
            let msg: string;
            if (res.destino_aberto) {
              msg = `${qtd} ingresso(s) encaminhado(s) para "${dest}". Serão atribuídos quando o BID receptor for encerrado.`;
            } else {
              msg = `${qtd} ingresso(s) encaminhado(s) para "${dest}". Os pontos foram debitados dos apostadores do BID receptor.`;
              if (res.pulados_por_saldo_insuficiente?.length > 0) {
                msg +=
                  ' Alguns usuários do BID receptor não tinham pontos suficientes e passaram para o próximo da fila.';
              }
            }
            Swal.fire({
              title: 'Encaminhamento concluído',
              text: msg,
              icon: 'success',
              confirmButtonColor: '#4f46e5',
            });
            this.carregar();
          },
          error: (err) => {
            this.loading = false;
            Swal.fire(
              'Erro',
              err.error?.error || 'Não foi possível encaminhar os ingressos.',
              'error',
            );
          },
        });
    }
  }

  async acrescentarIngressos(match: any) {
    const { value: result, isConfirmed } = await Swal.fire({
      title: 'Acrescentar ingressos ao BID',
      html: `
        <p class="text-left text-sm text-gray-600 mb-2">
          Os novos ingressos serão atribuídos à fila de perdedores (maior lance primeiro). Os pontos serão debitados dos beneficiados.
        </p>
        <label class="block text-left text-xs font-medium text-gray-600 mt-3 mb-1">Quantidade de ingressos</label>
        <input id="swal-qtd-acrescentar" type="number" min="1" value="1" class="swal2-input w-full m-0 text-sm">
        <label class="block text-left text-xs font-medium text-gray-600 mt-3 mb-1">Motivo (obrigatório para auditoria)</label>
        <input id="swal-motivo-acrescentar" class="swal2-input w-full m-0 text-sm" placeholder="Ex.: Inclusão de cortesias">
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0d9488',
      confirmButtonText: 'Acrescentar',
      preConfirm: () => {
        const qtdInput = document.getElementById('swal-qtd-acrescentar') as HTMLInputElement;
        const quantidade = Math.max(1, Math.floor(Number(qtdInput?.value) || 1));
        const motivo = (
          document.getElementById('swal-motivo-acrescentar') as HTMLInputElement
        )?.value?.trim();
        if (!motivo) {
          Swal.showValidationMessage('O motivo é obrigatório.');
          return null;
        }
        return { quantidade, motivo };
      },
    });
    if (isConfirmed && result) {
      const { isConfirmed: consentimento } = await Swal.fire({
        title: 'Confirmar alteração',
        html: `
          <p class="text-left text-sm text-gray-600 mb-2">
            Deseja realmente <strong>acrescentar ${result.quantidade} ingresso(s)</strong> ao BID <strong>${match.titulo}</strong>?
          </p>
          <p class="text-left text-xs text-gray-500">Motivo: ${result.motivo}</p>
          <p class="text-left text-xs text-amber-600 mt-2 font-medium">Os ingressos serão atribuídos à fila de perdedores e os pontos debitados. Confirme apenas se tiver certeza.</p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0d9488',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sim, acrescentar',
        cancelButtonText: 'Cancelar',
      });
      if (!consentimento) return;

      this.loading = true;
      this.matchService
        .acrescentarIngressos(match.id, result.quantidade, result.motivo, this.currentUser.id)
        .subscribe({
          next: (res: any) => {
            this.loading = false;
            const atribuidos = res.quantidade_atribuida ?? 0;
            let msg = `${atribuidos} ingresso(s) atribuído(s) à fila de perdedores. Pontos debitados.`;
            if (res.pulados_por_saldo_insuficiente?.length > 0) {
              msg += ' Alguns usuários não tinham pontos suficientes e foram pulados.';
            }
            Swal.fire({
              title: 'Concluído',
              text: msg,
              icon: 'success',
              confirmButtonColor: '#4f46e5',
            });
            this.carregar();
          },
          error: (err) => {
            this.loading = false;
            Swal.fire(
              'Erro',
              err.error?.error || 'Não foi possível acrescentar ingressos.',
              'error',
            );
          },
        });
    }
  }

  carregar() {
    this.loading = true;
    this.matchService.getMatches(this.currentUser.id).subscribe({
      next: (data) => {
        this.matches = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  carregarGrupos() {
    this.matchService.getGroups().subscribe({
      next: (data) => {
        this.groups = data;
      },
      error: () => {},
    });
  }

  async criarJogo() {
    await this.abrirFormulario();
  }

  async editarJogo(match: any) {
    await this.abrirFormulario(match);
  }

  async clonarJogo(match: any) {
    // Chamamos o formulário passando a flag "isClone" = true
    await this.abrirFormulario(match, true);
  }

  async excluirJogo(match: any) {
    const { value: motivo, isConfirmed } = await Swal.fire({
      title: 'Excluir BID?',
      text: `Justifique a exclusão de "${match.titulo}". (Todos os pontos serão reembolsados)`,
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'Motivo da exclusão para auditoria...',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => (!value ? 'O motivo é obrigatório para a auditoria!' : null),
    });

    if (isConfirmed && motivo) {
      this.matchService.deleteMatch(match.id, this.currentUser.id, motivo).subscribe({
        next: () => {
          this.carregar();
          Swal.fire('Excluído!', 'O BID foi removido e os pontos devolvidos.', 'success');
        },
        error: () => Swal.fire('Erro', 'Não foi possível excluir o evento.', 'error'),
      });
    }
  }

  async abrirFormulario(match: any = null, isClone: boolean = false) {
    const isEdit = !!match && !isClone;

    const tituloModal = isEdit ? '✏️ Editar BID' : isClone ? '📑 Clonar BID' : 'Novo BID';
    const tituloInput = isClone ? `${match.titulo} (Cópia)` : match?.titulo || '';

    /** Converte ISO (UTC) para "YYYY-MM-DDTHH:mm" em horário local do usuário (valor do datetime-local). */
    const formatData = (iso: string) => {
      if (!iso) return '';
      try {
        const d = new Date(iso);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch (e) {
        return '';
      }
    };

    const groupsOptions = this.groups
      .map(
        (g) =>
          `<option value="${g.id}" ${match && match.grupo_id === g.id ? 'selected' : ''}>🎲 ${g.nome}</option>`,
      )
      .join('');

    const setoresOptions = this.setoresEvento
      .map(
        (s) =>
          `<option value="${s.id}" ${match && match.setor_evento_id === s.id ? 'selected' : ''}>📌 ${s.nome}</option>`,
      )
      .join('');

    const { value: formValues } = await Swal.fire({
      title: tituloModal,
      width: '700px',
      didOpen: () => {
        if (match) {
          const bannerEl = document.getElementById('banner') as HTMLInputElement;
          const subtituloEl = document.getElementById('subtitulo') as HTMLInputElement;
          const informacoesEl = document.getElementById('informacoesExtras') as HTMLTextAreaElement;
          const linkExtraEl = document.getElementById('linkExtra') as HTMLInputElement;
          if (bannerEl && match.banner) bannerEl.value = match.banner.startsWith('http') ? match.banner : '';
          if (subtituloEl && match.subtitulo) subtituloEl.value = match.subtitulo;
          if (informacoesEl && match.informacoes_extras) informacoesEl.value = match.informacoes_extras;
          if (linkExtraEl && match.link_extra) linkExtraEl.value = match.link_extra;
        }
        if (!isEdit && !isClone) {
          const titleEl = document.querySelector('.swal2-title') as HTMLElement | null;
          if (titleEl) {
            titleEl.style.display = 'flex';
            titleEl.style.alignItems = 'center';
            titleEl.style.justifyContent = 'center';
            titleEl.style.width = '100%';
            titleEl.style.gap = '10px';
            titleEl.innerHTML =
              '<span style="display:inline-flex;align-items:center;gap:10px"><img src="assets/allianz_ticket_blue_cartoon.png" alt="" style="width:50px;height:50px;object-fit:contain" />Novo BID</span>';
          }
        }
      },
      html: `
        <div class="text-left space-y-4 px-2">
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Título do BID</label>
            <input id="titulo" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 focus:ring-indigo-500 rounded-lg" value="${tituloInput}">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-extrabold text-amber-600 uppercase mb-1">Grupo de Apostas</label>
              <select id="grupoId" class="swal2-select w-full m-0 h-10 text-sm border-amber-200 bg-amber-50 text-amber-700 rounded-lg">
                  <option value="null">👥 Público (Todos)</option>
                  ${groupsOptions}
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-extrabold text-indigo-600 uppercase mb-1">Setor do evento</label>
              <select id="setorEventoId" class="swal2-select w-full m-0 h-10 text-sm border-indigo-200 bg-indigo-50/50 text-indigo-700 rounded-lg">
                  <option value="null">— Nenhum</option>
                  ${setoresOptions}
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Subtítulo</label>
            <input id="subtitulo" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" placeholder="Opcional">
          </div>
          <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Banner (URL da imagem)</label>
                <input id="banner" type="url" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" placeholder="https://...">
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Local</label>
                <input id="local" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" value="${match?.local || ''}">
              </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Informações extras</label>
            <textarea id="informacoesExtras" class="swal2-textarea w-full m-0 text-sm border-gray-300 rounded-lg" rows="3" placeholder="Texto livre (opcional)"></textarea>
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Link extra</label>
            <input id="linkExtra" type="url" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" placeholder="https://... (opcional)">
          </div>
          <div class="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
              <div>
                 <label class="block text-xs font-bold text-blue-600 uppercase mb-1">Qtd. Ingressos</label>
                 <input id="qtdPremios" type="number" min="1" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" value="${match?.quantidade_premios || 1}">
              </div>
              <div>
                 <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Data do Show/Jogo</label>
                 <input id="dataEvento" type="datetime-local" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" value="${match ? formatData(match.data_jogo) : ''}">
              </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-bold text-emerald-600 uppercase mb-1">Início das Apostas</label>
                <input id="dataInicio" type="datetime-local" class="swal2-input w-full m-0 h-10 text-sm border-emerald-200 rounded-lg" value="${match ? formatData(match.data_inicio_apostas) : ''}">
            </div>
            <div>
                <label class="block text-xs font-bold text-rose-500 uppercase mb-1">Fim das Apostas</label>
                <input id="dataLimite" type="datetime-local" class="swal2-input w-full m-0 h-10 text-sm border-rose-200 rounded-lg" value="${match ? formatData(match.data_limite_aposta) : ''}">
            </div>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Salvar BID',
      preConfirm: () => {
        const getVal = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value;
        const titulo = getVal('titulo');
        const dataJogo = getVal('dataEvento');

        // Geração do motivo de auditoria 100% invisível e automático
        let motivo = '';
        if (isClone) {
          motivo = `Clonagem do evento: ${match.titulo} -> ${titulo}`;
        } else if (isEdit) {
          motivo = `Edição do evento: ${titulo}`;
        } else {
          motivo = `Criação do evento: ${titulo}`;
        }

        if (!titulo || !dataJogo) {
          Swal.showValidationMessage('Título e Data do Show/Jogo são obrigatórios.');
          return false;
        }

        const getTextarea = (id: string) => (document.getElementById(id) as HTMLTextAreaElement)?.value ?? '';
        /** Envia data/hora em ISO UTC para o backend gravar em UTC (evita diferença de fuso). */
        const toIsoUtc = (v: string) => (v ? new Date(v).toISOString() : '');

        const formData = new FormData();
        formData.append('titulo', titulo);
        formData.append('grupo_id', getVal('grupoId'));
        formData.append(
          'setor_evento_id',
          (document.getElementById('setorEventoId') as HTMLSelectElement)?.value ?? 'null',
        );
        formData.append('banner', getVal('banner'));
        formData.append('subtitulo', getVal('subtitulo'));
        formData.append('informacoes_extras', getTextarea('informacoesExtras'));
        formData.append('link_extra', getVal('linkExtra'));
        formData.append('local', getVal('local'));
        formData.append('data_jogo', toIsoUtc(dataJogo) || dataJogo);
        formData.append('data_inicio_apostas', toIsoUtc(getVal('dataInicio')) || getVal('dataInicio'));
        formData.append('data_limite_aposta', toIsoUtc(getVal('dataLimite')) || getVal('dataLimite'));
        formData.append('quantidade_premios', String(Number(getVal('qtdPremios')) || 1));
        formData.append('motivo', motivo);
        formData.append('adminId', String(this.currentUser.id));

        return formData;
      },
    });

    if (formValues) {
      this.loading = true;
      const req = isEdit
        ? this.matchService.updateMatch(match.id, formValues)
        : this.matchService.createMatch(formValues);

      req.subscribe({
        next: () => {
          Swal.fire({
            title: 'Sucesso!',
            text: 'BID salvo com sucesso.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
          this.carregar();
        },
        error: () => {
          this.loading = false;
          Swal.fire('Erro', 'Falha ao salvar BID.', 'error');
        },
      });
    }
  }

  async finalizarJogo(match: any) {
    const qtdVencedores = match.quantidade_premios_efetiva ?? match.quantidade_premios ?? 1;
    const { value: motivo, isConfirmed } = await Swal.fire({
      title: 'Encerrar Leilão?',
      html: `
        <div class="text-left bg-amber-50 p-4 rounded-lg border border-amber-100 text-sm mb-4">
            <p class="font-bold text-amber-800 mb-2">Atenção:</p>
            <ul class="list-disc pl-4 text-amber-700 space-y-1">
                <li>Os <b>Top ${qtdVencedores}</b> maiores lances vencerão${(match.ingressos_recebidos || 0) > 0 ? ' (incl. ' + match.ingressos_recebidos + ' recebidos de outros BIDs)' : ''}.</li>
                <li>Todos os outros serão <b>REEMBOLSADOS</b> integralmente.</li>
            </ul>
        </div>
        <input id="swal-motivo-fim" class="swal2-input w-full m-0 text-sm" placeholder="Motivo/Auditoria (Obrigatório)">
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      confirmButtonText: 'Sim, Encerrar',
      preConfirm: () => {
        const m = (document.getElementById('swal-motivo-fim') as HTMLInputElement).value;
        if (!m) Swal.showValidationMessage('O motivo é obrigatório!');
        return m;
      },
    });

    if (isConfirmed && motivo) {
      this.loading = true;
      this.matchService
        .finishMatch({ partidaId: match.id, adminId: this.currentUser.id, motivo })
        .subscribe({
          next: () => {
            Swal.fire('Concluído', 'Vencedores definidos e reembolsos processados.', 'success');
            this.carregar();
          },
          error: () => {
            this.loading = false;
            Swal.fire('Erro', 'Não foi possível encerrar o leilão.', 'error');
          },
        });
    }
  }

  private getValorCampoListaPortaria(item: any, key: string): string | number {
    switch (key) {
      case 'titular_nome': return item.titular_nome ?? '';
      case 'titular_setor': return item.titular_setor || 'N/A';
      case 'retirante_nome': return item.retirante_nome || 'Pendente de indicação';
      case 'retirante_cpf': return item.retirante_cpf || '---';
      case 'lance_pago': return item.lance_pago ?? '';
      case 'assinatura': return '';
      default: return '';
    }
  }

  baixarRelatorio(match: any, tipo: 'pdf' | 'excel') {
    this.settingsService.getExportSettings().pipe(
      catchError(() => of(null)),
      switchMap((settings) =>
        this.matchService.getWinnersReport(match.id).pipe(
          map((dados: any) => ({ settings, dados })),
        ),
      ),
    ).subscribe({
      next: ({ settings, dados }: { settings: Record<string, string> | null; dados: any[] }) => {
        if (!dados || dados.length === 0) {
          Swal.fire('Vazio', 'Não há ganhadores para este evento.', 'info');
          return;
        }
        const fields = this.settingsService.parseListaPortariaFields(settings).filter((f) => f.enabled !== false);
        const colunas = fields.map((f) => f.label);
        const formatoTabela = dados.map((item: any) =>
          fields.map((f) => this.getValorCampoListaPortaria(item, f.key)),
        );
        const nomeArquivo = `Lista_Portaria_${match.titulo.replace(/\s+/g, '_')}`;
        const pdfStyle = this.settingsService.parseExportPdfStyle(settings);

        if (tipo === 'pdf') {
          const useLetterhead = this.settingsService.useLetterhead(settings);
          const letterheadPath = settings?.['export_pdf_letterhead_path'] ?? '';
          if (useLetterhead && letterheadPath) {
            this.settingsService.getLetterheadBlob().subscribe({
              next: (blob) => {
                const pathLower = letterheadPath.toLowerCase();
                const isImageByPath = /\.(png|jpg|jpeg)$/.test(pathLower);
                const useAsImage =
                  blob.size > 0 &&
                  (blob.type.startsWith('image/') || (isImageByPath && (blob.type === '' || blob.type === 'application/octet-stream')));
                if (useAsImage) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    this.gerarPDF(match.titulo, colunas, formatoTabela, nomeArquivo, reader.result as string, pdfStyle);
                  };
                  reader.readAsDataURL(blob);
                } else if (blob.type === 'application/pdf' || pathLower.endsWith('.pdf')) {
                  this.renderTimbradoPdfNaPrimeiraPagina(match.titulo, colunas, formatoTabela, nomeArquivo, blob, pdfStyle);
                } else {
                  this.gerarPDF(match.titulo, colunas, formatoTabela, nomeArquivo, undefined, pdfStyle);
                }
              },
              error: () => this.gerarPDF(match.titulo, colunas, formatoTabela, nomeArquivo, undefined, pdfStyle),
            });
          } else {
            this.gerarPDF(match.titulo, colunas, formatoTabela, nomeArquivo, undefined, pdfStyle);
          }
        } else {
          this.gerarExcel(colunas, formatoTabela, nomeArquivo);
        }
      },
      error: () => Swal.fire('Erro', 'Falha ao buscar relatório.', 'error'),
    });
  }

  /** Constrói o PDF de conteúdo (título + tabela) sem timbrado. Usado para fusão com timbrado PDF. */
  private buildConteudoPdf(
    tituloEvento: string,
    colunas: string[],
    linhas: any[],
    style: ExportPdfStyle,
  ): jsPDF {
    const doc = new jsPDF();
    const startY = 20;
    const titleRgb = this.settingsService.hexToRgb(style.colorTitle);
    const subtitleRgb = this.settingsService.hexToRgb(style.colorSubtitle);
    const headerRgb = this.settingsService.hexToRgb(style.colorTableHeader);
    const altRgb = this.settingsService.hexToRgb(style.colorTableAlt);

    doc.setFont(style.fontFamily, 'normal');
    doc.setFontSize(style.fontSizeTitle);
    doc.setTextColor(titleRgb[0], titleRgb[1], titleRgb[2]);
    doc.text(style.title, 14, startY);
    doc.setFontSize(style.fontSizeSubtitle);
    doc.setTextColor(subtitleRgb[0], subtitleRgb[1], subtitleRgb[2]);
    doc.text(`${style.subtitleEventoLabel} ${tituloEvento}`, 14, startY + 8);
    doc.text(`${style.subtitleGeradoLabel} ${new Date().toLocaleDateString('pt-BR')}`, 14, startY + 14);

    autoTable(doc, {
      head: [colunas],
      body: linhas,
      startY: startY + 22,
      theme: 'grid',
      headStyles: { fillColor: headerRgb },
      alternateRowStyles: { fillColor: altRgb },
    });
    return doc;
  }

  /** Renderiza a primeira página do PDF do timbrado como imagem e gera um único PDF (timbrado no topo + lista abaixo). */
  private async renderTimbradoPdfNaPrimeiraPagina(
    tituloEvento: string,
    colunas: string[],
    linhas: any[],
    nomeArquivo: string,
    letterheadPdfBlob: Blob,
    style: ExportPdfStyle,
  ): Promise<void> {
    try {
      const dataUrl = await this.pdfFirstPageToDataUrl(letterheadPdfBlob);
      if (dataUrl) {
        this.gerarPDF(tituloEvento, colunas, linhas, nomeArquivo, dataUrl, style);
      } else {
        await this.gerarPDFComTimbradoPdf(tituloEvento, colunas, linhas, nomeArquivo, letterheadPdfBlob, style);
      }
    } catch {
      await this.gerarPDFComTimbradoPdf(tituloEvento, colunas, linhas, nomeArquivo, letterheadPdfBlob, style);
    }
  }

  /** Converte a primeira página de um PDF (blob) em data URL PNG para usar como imagem no jsPDF. */
  private async pdfFirstPageToDataUrl(blob: Blob): Promise<string | null> {
    const arrayBuffer = await blob.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const scale = 2;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/png');
  }

  /** Gera o PDF com papel timbrado em PDF: primeira página = timbrado, seguintes = conteúdo. */
  private async gerarPDFComTimbradoPdf(
    tituloEvento: string,
    colunas: string[],
    linhas: any[],
    nomeArquivo: string,
    letterheadPdfBlob: Blob,
    style: ExportPdfStyle,
  ): Promise<void> {
    try {
      const s = style ?? this.settingsService.parseExportPdfStyle(null);
      const contentDoc = this.buildConteudoPdf(tituloEvento, colunas, linhas, s);
      const contentBytes = contentDoc.output('arraybuffer');

      const letterheadBytes = await letterheadPdfBlob.arrayBuffer();
      const letterheadPdf = await PDFDocument.load(letterheadBytes);
      const contentPdf = await PDFDocument.load(contentBytes);
      const mergedPdf = await PDFDocument.create();

      const letterheadPageCount = letterheadPdf.getPageCount();
      const letterheadIndices = Array.from({ length: letterheadPageCount }, (_, i) => i);
      const letterheadPages = await mergedPdf.copyPages(letterheadPdf, letterheadIndices);
      letterheadPages.forEach((p) => mergedPdf.addPage(p));

      const contentPageCount = contentPdf.getPageCount();
      const contentIndices = Array.from({ length: contentPageCount }, (_, i) => i);
      const contentPages = await mergedPdf.copyPages(contentPdf, contentIndices);
      contentPages.forEach((p) => mergedPdf.addPage(p));

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nomeArquivo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao mesclar PDF com timbrado:', err);
      this.gerarPDF(tituloEvento, colunas, linhas, nomeArquivo, undefined, style);
    }
  }

  gerarPDF(
    tituloEvento: string,
    colunas: string[],
    linhas: any[],
    nomeArquivo: string,
    letterheadDataUrl?: string,
    style?: ExportPdfStyle,
  ) {
    const doc = new jsPDF();
    let startY = 20;
    const s = style ?? this.settingsService.parseExportPdfStyle(null);
    const titleRgb = this.settingsService.hexToRgb(s.colorTitle);
    const subtitleRgb = this.settingsService.hexToRgb(s.colorSubtitle);
    const headerRgb = this.settingsService.hexToRgb(s.colorTableHeader);
    const altRgb = this.settingsService.hexToRgb(s.colorTableAlt);

    if (letterheadDataUrl) {
      const imgW = doc.internal.pageSize.getWidth();
      const imgH = 52;
      const format = letterheadDataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(letterheadDataUrl, format, 0, 0, imgW, imgH);
      startY = imgH + 14;
    }

    doc.setFont(s.fontFamily, 'normal');
    doc.setFontSize(s.fontSizeTitle);
    doc.setTextColor(titleRgb[0], titleRgb[1], titleRgb[2]);
    doc.text(s.title, 14, startY);
    doc.setFontSize(s.fontSizeSubtitle);
    doc.setTextColor(subtitleRgb[0], subtitleRgb[1], subtitleRgb[2]);
    doc.text(`${s.subtitleEventoLabel} ${tituloEvento}`, 14, startY + 8);
    doc.text(`${s.subtitleGeradoLabel} ${new Date().toLocaleDateString('pt-BR')}`, 14, startY + 14);

    autoTable(doc, {
      head: [colunas],
      body: linhas,
      startY: startY + 22,
      theme: 'grid',
      headStyles: { fillColor: headerRgb },
      alternateRowStyles: { fillColor: altRgb },
    });
    doc.save(`${nomeArquivo}.pdf`);
  }

  gerarExcel(colunas: string[], linhas: any[], nomeArquivo: string) {
    const dadosExcel = [colunas, ...linhas];
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(dadosExcel);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lista Portaria');
    XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
  }
}
