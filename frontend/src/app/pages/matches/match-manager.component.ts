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
              <th class="px-6 py-4 tracking-wider">Empresa</th>
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
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                >
                  {{ m.nome_grupo || 'Geral' }}
                </span>
              </td>

              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <span
                    class="bg-amber-100 text-amber-800 px-2 py-1 rounded-md font-bold text-xs border border-amber-200"
                  >
                    🏆 {{ m.quantidade_premios || 1 }}
                  </span>
                </div>
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
                >
                  {{ m.status }}
                </span>
              </td>

              <td class="px-6 py-4 text-right">
                <div class="flex justify-end items-center gap-2 transition-opacity">
                  <button
                    (click)="editarJogo(m)"
                    class="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition shadow-sm border border-blue-100"
                    title="Editar"
                  >
                    ✏️
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

  async excluirJogo(match: any) {
    const result = await Swal.fire({
      title: 'Excluir BID?',
      text: `Tem certeza que deseja apagar "${match.titulo}"? Essa ação não pode ser desfeita e será auditada.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3b82f6',
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      this.matchService.deleteMatch(match.id, this.currentUser.id).subscribe(() => {
        this.carregar();
        Swal.fire('Excluído!', 'O BID foi removido.', 'success');
      });
    }
  }

  async abrirFormulario(match: any = null) {
    const isEdit = !!match;

    const formatData = (iso: string) => {
      if (!iso) return '';
      try {
        const d = new Date(iso);
        const offset = d.getTimezoneOffset() * 60000;
        const localISOTime = new Date(d.getTime() - offset).toISOString().slice(0, 16);
        return localISOTime;
      } catch (e) {
        return '';
      }
    };

    const groupsOptions = this.groups
      .map(
        (g) =>
          `<option value="${g.id}" ${match && match.grupo_id === g.id ? 'selected' : ''}>${g.nome}</option>`,
      )
      .join('');

    const { value: formValues } = await Swal.fire({
      title: isEdit ? '✏️ Editar BID' : '🎫 Novo BID',
      width: '700px',
      html: `
        <div class="text-left space-y-4 px-2">
          <div class="grid grid-cols-3 gap-4">
              <div class="col-span-2">
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Título do BID</label>
                <input id="titulo" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg" placeholder="Ex: Show Coldplay" value="${match?.titulo || ''}">
              </div>
              <div class="col-span-1">
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Empresa</label>
                <select id="grupoId" class="swal2-select w-full m-0 h-10 text-sm border-gray-300 rounded-lg">
                    ${groupsOptions}
                </select>
              </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Banner URL</label>
                <input id="banner" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" placeholder="https://..." value="${match?.banner || ''}">
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Local</label>
                <input id="local" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" placeholder="Ex: Allianz Parque" value="${match?.local || ''}">
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
                <input id="dataInicio" type="datetime-local" class="swal2-input w-full m-0 h-10 text-sm border-emerald-200 focus:border-emerald-500 rounded-lg" value="${match ? formatData(match.data_inicio_apostas) : ''}">
            </div>
            <div>
                <label class="block text-xs font-bold text-rose-500 uppercase mb-1">Fim das Apostas</label>
                <input id="dataLimite" type="datetime-local" class="swal2-input w-full m-0 h-10 text-sm border-rose-200 focus:border-rose-500 rounded-lg" value="${match ? formatData(match.data_limite_aposta) : ''}">
            </div>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Salvar BID',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const getVal = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value;
        return {
          titulo: getVal('titulo'),
          grupo_id: Number(getVal('grupoId')),
          banner: getVal('banner'),
          local: getVal('local'),
          data_jogo: getVal('dataEvento'),
          data_inicio_apostas: getVal('dataInicio'),
          data_limite_aposta: getVal('dataLimite'),
          quantidade_premios: Number(getVal('qtdPremios')) || 1,
          adminId: this.currentUser.id,
        };
      },
    });

    if (formValues) {
      if (!formValues.titulo || !formValues.data_jogo || !formValues.data_inicio_apostas) {
        Swal.fire('Atenção', 'Título e Datas são obrigatórios.', 'warning');
        return;
      }
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
        error: (err) => {
          this.loading = false;
          console.error(err);
          Swal.fire('Erro', 'Falha ao salvar BID. Verifique os dados.', 'error');
        },
      });
    }
  }

  async finalizarJogo(match: any) {
    const result = await Swal.fire({
      title: 'Encerrar Leilão?',
      html: `
        <div class="text-left bg-amber-50 p-4 rounded-lg border border-amber-100 text-sm">
            <p class="font-bold text-amber-800 mb-2">Atenção:</p>
            <ul class="list-disc pl-4 text-amber-700 space-y-1">
                <li>Os <b>Top ${match.quantidade_premios}</b> maiores lances vencerão.</li>
                <li>Todos os outros participantes serão <b>REEMBOLSADOS</b> integralmente.</li>
                <li>O status mudará para <span class="font-bold">FINALIZADA</span>.</li>
            </ul>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      confirmButtonText: 'Sim, Encerrar e Reembolsar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      this.loading = true;
      this.matchService
        .finishMatch({ partidaId: match.id, adminId: this.currentUser.id })
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
    // 1. Busca os dados no servidor
    this.matchService.getWinnersReport(match.id).subscribe({
      // CORREÇÃO: Alterado de (dados: any[]) para (dados: any)
      next: (dados: any) => {
        if (dados.length === 0) {
          Swal.fire('Vazio', 'Não há ganhadores para este evento.', 'info');
          return;
        }

        // Formata os dados para a tabela
        const formatoTabela = dados.map((item: any) => [
          item.titular_nome,
          item.titular_setor || 'N/A',
          // `${item.lance_pago} pts`,
          item.retirante_nome || 'Pendente de indicação',
          item.retirante_cpf || '---',
        ]);

        const colunas = [
          'Ganhador (Titular)',
          'Setor',
          // 'Lance Vencedor',
          'Retirante Autorizado',
          'CPF do Retirante',
          'Assinatura',
        ];
        const nomeArquivo = `Lista_Portaria_${match.titulo.replace(/\s+/g, '_')}`;

        if (tipo === 'pdf') {
          this.gerarPDF(match.titulo, colunas, formatoTabela, nomeArquivo);
        } else {
          this.gerarExcel(colunas, formatoTabela, nomeArquivo);
        }
      },
      error: () =>
        Swal.fire('Erro', 'A rota de listagem ainda não foi criada no backend.', 'error'),
    });
  }

  gerarPDF(tituloEvento: string, colunas: string[], linhas: any[], nomeArquivo: string) {
    const doc = new jsPDF();

    // Cabeçalho
    doc.setFontSize(18);
    doc.text('Lista de Acesso (Concierge)', 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Evento: ${tituloEvento}`, 14, 30);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 36);

    // Tabela
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
