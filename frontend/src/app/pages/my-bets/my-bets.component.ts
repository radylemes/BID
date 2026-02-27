import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatchService } from '../../services/match.service';
import { GuestService } from '../../services/guest.service';
import Swal from 'sweetalert2';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-my-bets',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-bets.component.html',
})
export class MyBetsComponent implements OnInit {
  matches: any[] = [];
  currentUser: any = {};
  loading = false;

  constructor(
    private matchService: MatchService,
    private guestService: GuestService,
    private router: Router,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.carregarHistorico();
  }

  getBannerUrl(match: { banner?: string; id?: number }): string {
    if (!match?.banner) return 'assets/placeholder.jpg';
    if (match.banner.startsWith('http')) return match.banner;
    if (match.banner === 'db' && match.id) return `${environment.apiUri}/matches/${match.id}/banner`;
    const base = environment.apiUri.replace(/\/api\/?$/, '');
    return `${base}/${match.banner.replace(/\\/g, '/').replace(/^\//, '')}`;
  }

  carregarHistorico() {
    this.loading = true;

    this.matchService.getMyBets(this.currentUser.id).subscribe({
      next: (data) => {
        let processadas = data.map((match) => {
          let lancesProcessados: any[] = [];
          let ingressosGanhos: any[] = [];
          let totalGasto = 0;
          let totalReembolsado = 0;

          if (match.raw_lances) {
            const lancesArray = match.raw_lances.toString().split(',');
            lancesProcessados = lancesArray.map((item: string) => {
              const parts = item.split(':');
              const apostaId = Number(parts[0]);
              const valor = Number(parts[1]);
              const status = parts[2];

              if (status === 'GANHOU') totalGasto += valor;
              else if (status === 'PERDEU') totalReembolsado += valor;

              return { id: apostaId, valor, status };
            });
            lancesProcessados.sort((a, b) => b.valor - a.valor);
          }

          // Lê e formata a coluna exclusiva de ingressos que vem da nova Query
          if (match.raw_ingressos) {
            ingressosGanhos = match.raw_ingressos
              .toString()
              .split(',')
              .map((item: string) => {
                const p = item.split(':');
                return {
                  id: Number(p[0]), // ID Único do Ingresso!
                  nome: p[1] && p[1] !== 'null' && p[1].trim() !== '' ? p[1] : null,
                  checkin: p[2] === '1' || p[2] === 'true',
                };
              });
          }

          return {
            ...match,
            lances_detalhados: lancesProcessados,
            ingressos_ganhos_detalhes: ingressosGanhos,
            tickets_ganhos: ingressosGanhos.length,
            total_gasto: totalGasto,
            total_reembolsado: totalReembolsado,
          };
        });

        // Ordenar: 1) por status (ABERTA/em andamento primeiro), 2) por data (mais recente primeiro)
        processadas.sort((a, b) => {
          const statusA = a.status === 'ABERTA' ? 1 : 0;
          const statusB = b.status === 'ABERTA' ? 1 : 0;
          if (statusB !== statusA) return statusB - statusA;
          return new Date(b.data_evento).getTime() - new Date(a.data_evento).getTime();
        });
        this.matches = processadas;
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.cd.detectChanges();
      },
    });
  }

  /** Retorna true se a data do evento for anterior a hoje (sem hora). */
  eventoAnteriorHoje(match: any): boolean {
    if (!match?.data_evento) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataEvento = new Date(match.data_evento);
    dataEvento.setHours(0, 0, 0, 0);
    return dataEvento.getTime() < hoje.getTime();
  }

  // =========================================================================
  // MODAL EM MASSA ALINHADO COMO TABELA E COM BLOQUEIO DE SEGURANÇA
  // =========================================================================
  async definirRetirantes(match: any) {
    if (this.eventoAnteriorHoje(match)) {
      await Swal.fire({
        icon: 'warning',
        title: 'Evento encerrado',
        text: 'Não é possível alterar retirantes para eventos cuja data já passou.',
        confirmButtonColor: '#4f46e5',
      });
      return;
    }
    this.guestService.getGuests(this.currentUser.id).subscribe(async (convidados: any[]) => {
      const htmlSelects = match.ingressos_ganhos_detalhes
        .map((ticket: any, index: number) => {
          if (ticket.checkin) {
            return `
              <div class="mb-2 bg-gray-50 p-2 rounded-xl border border-gray-200 flex items-center opacity-80 cursor-not-allowed">
                <div class="w-20 shrink-0 text-[10px] font-bold text-gray-500 uppercase tracking-wide m-0">
                  🎟️ Ingresso ${index + 1}
                </div>
                <div class="flex-1 text-xs font-black text-emerald-800 bg-emerald-100/50 px-3 py-1.5 rounded-lg border border-emerald-200 truncate">
                  ${ticket.nome || 'Desconhecido'}
                </div>
                <div class="w-20 shrink-0 text-right">
                  <span class="text-[9px] uppercase tracking-widest bg-emerald-500 text-white px-2 py-0.5 rounded shadow-sm">Entregue ✓</span>
                </div>
              </div>
            `;
          }

          const optionsHtml = convidados
            .map((c) => {
              const isSelected = ticket.nome === c.nome_completo ? 'selected' : '';
              return `<option value="${c.id}" ${isSelected}>${c.nome_completo} (CPF: ${c.cpf})</option>`;
            })
            .join('');

          return `
          <div class="mb-2 bg-gray-50 p-2 rounded-xl border border-gray-100 flex items-center">
            <label class="whitespace-nowrap w-20 shrink-0 text-[10px] font-bold text-gray-500 uppercase tracking-wide m-0">
              🎟️ Ingresso ${index + 1}
            </label>
            <div class="flex-1 px-1">
              <select id="select-ticket-${ticket.id}" class="w-full border border-gray-300 rounded-lg p-1.5 text-xs text-gray-700 bg-white focus:border-indigo-500 outline-none shadow-sm cursor-pointer">
                <option value="">-- Selecione o retirante --</option>
                ${optionsHtml}
              </select>
            </div>
            <div class="w-20 shrink-0 text-right">
              <span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider inline-block">Pendente ⏳</span>
            </div>
          </div>
        `;
        })
        .join('');

      const { value: selecoes } = await Swal.fire({
        title:
          '<h3 class="text-xl font-black text-gray-800 tracking-tight">Responsáveis pela Retirada</h3>',
        html: `
          <div class="text-left mt-2">
            <p class="text-xs text-gray-500 mb-4">Você possui <strong>${match.ingressos_ganhos_detalhes.length} ingresso(s)</strong>. Selecione quem irá utilizar cada um:</p>
            <div class="max-h-80 overflow-y-auto custom-scrollbar pr-1">
                ${htmlSelects}
            </div>
            <button id="btn-novo" type="button" class="w-full mt-3 py-2 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-600 text-xs font-bold hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
              <span class="text-lg leading-none">+</span> Cadastrar Novo Convidado
            </button>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Salvar Nomes',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10b981',
        didOpen: () => {
          document.getElementById('btn-novo')?.addEventListener('click', () => {
            Swal.close();
            this.cadastrarNovoConvidado(match);
          });
        },
        preConfirm: () => {
          const resultados = [];
          for (const ticket of match.ingressos_ganhos_detalhes) {
            if (!ticket.checkin) {
              const select = document.getElementById(
                `select-ticket-${ticket.id}`,
              ) as HTMLSelectElement;
              if (select && select.value) {
                // ATUALIZADO: Agora envia o ID da tabela de ingressos!
                resultados.push({ ingressoId: ticket.id, convidadoId: select.value });
              }
            }
          }
          return resultados;
        },
      });

      if (selecoes) {
        const promises = selecoes.map((s: any) => {
          return new Promise<void>((resolve, reject) => {
            // ATUALIZADO: Bindando na rota de ingressos
            this.guestService
              .assignTicket(s.ingressoId, {
                convidado_id: s.convidadoId,
                usuario_id: this.currentUser.id,
              })
              .subscribe({
                next: () => resolve(),
                error: (err) => reject(err),
              });
          });
        });

        if (promises.length > 0) {
          try {
            await Promise.all(promises);
            Swal.fire({
              icon: 'success',
              title: 'Salvo!',
              text: 'Retirantes atualizados com sucesso.',
              timer: 2000,
              showConfirmButton: false,
            });
            this.carregarHistorico();
          } catch (e) {
            Swal.fire('Erro', 'Ocorreu um erro ao salvar alguns convidados.', 'error');
          }
        }
      }
    });
  }

  async cadastrarNovoConvidado(match: any) {
    const { value: formValues } = await Swal.fire({
      title: '<h3 class="text-xl font-black text-gray-800">Novo Convidado</h3>',
      width: '450px',
      html: `
        <div class="space-y-4 text-left px-1 mt-4">
          <div>
            <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Nome Completo</label>
            <input id="swal-nome" class="swal2-input !m-0 !mt-1 w-full text-sm rounded-lg" placeholder="Ex: João da Silva">
          </div>
          <div>
            <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">CPF (Obrigatório)</label>
            <input id="swal-cpf" maxlength="14" class="swal2-input !m-0 !mt-1 w-full text-sm rounded-lg font-mono" placeholder="000.000.000-00">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">E-mail <span class="text-gray-400 font-normal">(Opc.)</span></label>
              <input id="swal-email" type="email" class="swal2-input !m-0 !mt-1 w-full text-sm rounded-lg" placeholder="email@exemplo.com">
            </div>
            <div>
              <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Telefone <span class="text-gray-400 font-normal">(Opc.)</span></label>
              <input id="swal-telefone" class="swal2-input !m-0 !mt-1 w-full text-sm rounded-lg" placeholder="(11) 90000-0000">
            </div>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Salvar Convidado',
      cancelButtonText: 'Voltar',
      confirmButtonColor: '#4f46e5',
      didOpen: () => {
        const cpfInput = document.getElementById('swal-cpf') as HTMLInputElement;
        if (cpfInput) {
          const aplicarMascara = () => {
            let v = cpfInput.value.replace(/\D/g, '');
            if (v.length > 11) v = v.slice(0, 11);
            v = v.replace(/(\d{3})(\d)/, '$1.$2');
            v = v.replace(/(\d{3})(\d)/, '$1.$2');
            v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            cpfInput.value = v;
          };
          cpfInput.addEventListener('input', aplicarMascara);
        }
      },
      preConfirm: () => {
        const nome = (document.getElementById('swal-nome') as HTMLInputElement).value;
        const cpf = (document.getElementById('swal-cpf') as HTMLInputElement).value;
        const email = (document.getElementById('swal-email') as HTMLInputElement).value;
        const telefone = (document.getElementById('swal-telefone') as HTMLInputElement).value;

        if (!nome || !cpf) {
          Swal.showValidationMessage('Os campos Nome e CPF são obrigatórios.');
          return false;
        }
        return { usuario_id: this.currentUser.id, nome_completo: nome, cpf, email, telefone };
      },
    });

    if (formValues) {
      this.guestService.createGuest(formValues).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Salvo!', timer: 1000, showConfirmButton: false });
          setTimeout(() => this.definirRetirantes(match), 1000);
        },
        error: () => Swal.fire('Erro', 'Não foi possível salvar o convidado.', 'error'),
      });
    } else {
      this.definirRetirantes(match);
    }
  }
}
