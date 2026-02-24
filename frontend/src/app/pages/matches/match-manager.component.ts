import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchService } from '../../services/match.service';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
        <div>
          <button
            (click)="criarJogo()"
            class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold shadow-md text-sm transition-all active:scale-95"
          >
            <span class="text-lg">🎫</span> Novo BID
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

        <table *ngIf="!loading && matches.length > 0" class="min-w-full text-left text-sm">
          <thead class="bg-gray-100 text-gray-500 uppercase font-bold text-xs sticky top-0">
            <tr>
              <th class="px-6 py-4 tracking-wider">BID</th>
              <th class="px-6 py-4 tracking-wider">Grupo de Apostas</th>
              <th class="px-6 py-4 tracking-wider">Ingressos</th>
              <th class="px-6 py-4 tracking-wider">Datas</th>
              <th class="px-6 py-4 tracking-wider">Status</th>
              <th class="px-6 py-4 text-right tracking-wider">Ações e Relatórios</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr *ngFor="let m of matches" class="hover:bg-gray-50 transition-colors group">
              <td class="px-6 py-4">
                <div class="font-bold text-gray-900 text-base">{{ m.titulo }}</div>
                <div class="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <span>📍</span> {{ m.local || 'Local não definido' }}
                </div>
              </td>
              <td class="px-6 py-4">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 shadow-sm"
                >
                  {{ m.nome_grupo || 'Público (Todos)' }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span
                  class="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md font-bold text-xs border border-blue-200"
                  >🎫 {{ m.quantidade_premios || 1 }}</span
                >
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col gap-1 text-xs font-medium">
                  <div class="text-emerald-600 flex items-center gap-1">
                    <span>🟢</span> {{ m.data_inicio_apostas | date: 'dd/MM HH:mm' }}
                  </div>
                  <div class="text-rose-500 flex items-center gap-1">
                    <span>🔴</span> {{ m.data_limite_aposta | date: 'dd/MM HH:mm' }}
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span
                  [ngClass]="{
                    'bg-emerald-100 text-emerald-700 border-emerald-200': m.status === 'ABERTA',
                    'bg-gray-100 text-gray-600 border-gray-200': m.status !== 'ABERTA',
                  }"
                  class="px-3 py-1 rounded-full text-[10px] font-bold uppercase border"
                  >{{ m.status }}</span
                >
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end items-center gap-2">
                  <button
                    (click)="editarJogo(m)"
                    class="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition shadow-sm border border-blue-100"
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    (click)="clonarJogo(m)"
                    class="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 hover:text-purple-700 transition shadow-sm border border-purple-100"
                    title="Clonar BID"
                  >
                    📑
                  </button>
                  <button
                    *ngIf="m.status === 'ABERTA'"
                    (click)="finalizarJogo(m)"
                    class="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 hover:text-amber-700 transition shadow-sm border border-amber-100"
                    title="Encerrar BID"
                  >
                    🏁
                  </button>
                  <button
                    (click)="excluirJogo(m)"
                    class="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 hover:text-rose-700 transition shadow-sm border border-rose-100"
                    title="Excluir"
                  >
                    🗑️
                  </button>
                  <div *ngIf="m.status !== 'ABERTA'" class="w-px h-6 bg-gray-200 mx-1"></div>
                  <button
                    *ngIf="m.status !== 'ABERTA'"
                    (click)="baixarRelatorio(m, 'pdf')"
                    class="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-red-100 border border-red-100 transition shadow-sm"
                    title="Baixar PDF Portaria"
                  >
                    <span>📄</span> PDF
                  </button>
                  <button
                    *ngIf="m.status !== 'ABERTA'"
                    (click)="baixarRelatorio(m, 'excel')"
                    class="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-emerald-100 border border-emerald-200 transition shadow-sm"
                    title="Baixar Excel"
                  >
                    <span>📊</span> Excel
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class MatchManagerComponent implements OnInit {
  matches: any[] = [];
  groups: any[] = [];
  currentUser: any = {};
  loading: boolean = false;

  constructor(
    private matchService: MatchService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.carregar();
    this.carregarGrupos();
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
    this.matchService.getGroups().subscribe((data) => {
      this.groups = data;
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

    const tituloModal = isEdit ? '✏️ Editar BID' : isClone ? '📑 Clonar BID' : '🎫 Novo BID';
    const tituloInput = isClone ? `${match.titulo} (Cópia)` : match?.titulo || '';

    const formatData = (iso: string) => {
      if (!iso) return '';
      try {
        const d = new Date(iso);
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
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

    const { value: formValues } = await Swal.fire({
      title: tituloModal,
      width: '700px',
      html: `
        <div class="text-left space-y-4 px-2">
          <div class="grid grid-cols-3 gap-4">
              <div class="col-span-2">
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Título do BID</label>
                <input id="titulo" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 focus:ring-indigo-500 rounded-lg" value="${tituloInput}">
              </div>
              <div class="col-span-1">
                <label class="block text-[10px] font-extrabold text-amber-600 uppercase mb-1">Grupo de Apostas</label>
                <select id="grupoId" class="swal2-select w-full m-0 h-10 text-sm border-amber-200 bg-amber-50 text-amber-700 rounded-lg">
                    <option value="null">👥 Público (Todos)</option>
                    ${groupsOptions}
                </select>
              </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Banner (Imagem)</label>
                <input id="bannerFile" type="file" accept="image/*" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-gray-300 rounded-lg h-10 bg-white">
                ${match?.banner ? `<p class="text-[9px] text-emerald-600 mt-1 font-bold">✓ Imagem vinculada. Envie outra para trocar.</p>` : ''}
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Local</label>
                <input id="local" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" value="${match?.local || ''}">
              </div>
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

        const formData = new FormData();
        formData.append('titulo', titulo);
        formData.append('grupo_id', getVal('grupoId'));
        formData.append('local', getVal('local'));
        formData.append('data_jogo', dataJogo);
        formData.append('data_inicio_apostas', getVal('dataInicio'));
        formData.append('data_limite_aposta', getVal('dataLimite'));
        formData.append('quantidade_premios', String(Number(getVal('qtdPremios')) || 1));
        formData.append('motivo', motivo);
        formData.append('adminId', String(this.currentUser.id));

        if (match?.banner) {
          formData.append('banner_existente', match.banner);
        }

        const bannerFile = (document.getElementById('bannerFile') as HTMLInputElement).files?.[0];
        if (bannerFile) {
          formData.append('banner_file', bannerFile);
        }

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
    const { value: motivo, isConfirmed } = await Swal.fire({
      title: 'Encerrar Leilão?',
      html: `
        <div class="text-left bg-amber-50 p-4 rounded-lg border border-amber-100 text-sm mb-4">
            <p class="font-bold text-amber-800 mb-2">Atenção:</p>
            <ul class="list-disc pl-4 text-amber-700 space-y-1">
                <li>Os <b>Top ${match.quantidade_premios}</b> maiores lances vencerão.</li>
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

  baixarRelatorio(match: any, tipo: 'pdf' | 'excel') {
    this.matchService.getWinnersReport(match.id).subscribe({
      next: (dados: any) => {
        if (dados.length === 0) {
          Swal.fire('Vazio', 'Não há ganhadores para este evento.', 'info');
          return;
        }

        const formatoTabela = dados.map((item: any) => [
          item.titular_nome,
          item.titular_setor || 'N/A',
          item.retirante_nome || 'Pendente de indicação',
          item.retirante_cpf || '---',
        ]);

        const colunas = [
          'Ganhador (Titular)',
          'Setor',
          'Retirante Autorizado',
          'CPF do Retirante',
          'Assinatura',
        ];
        const nomeArquivo = `Lista_Portaria_${match.titulo.replace(/\\s+/g, '_')}`;

        if (tipo === 'pdf') {
          this.gerarPDF(match.titulo, colunas, formatoTabela, nomeArquivo);
        } else {
          this.gerarExcel(colunas, formatoTabela, nomeArquivo);
        }
      },
      error: () => Swal.fire('Erro', 'Falha ao buscar relatório.', 'error'),
    });
  }

  gerarPDF(tituloEvento: string, colunas: string[], linhas: any[], nomeArquivo: string) {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Lista de Acesso (Concierge)', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Evento: ${tituloEvento}`, 14, 30);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 36);

    autoTable(doc, {
      head: [colunas],
      body: linhas,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
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
