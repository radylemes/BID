import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatchService } from '../../services/match.service';
import { GuestService } from '../../services/guest.service';
import Swal from 'sweetalert2';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  matches: any[] = [];
  currentUser: any = {};
  loading = false;
  timerInterval: any;

  pontosEmJogo: number = 0;
  meusLancesCount: number = 0;

  constructor(
    private matchService: MatchService,
    private guestService: GuestService,
    private router: Router,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.carregarDados();

    this.timerInterval = setInterval(() => {
      this.atualizarTimers();
      this.cd.detectChanges();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  getBannerUrl(match: { banner?: string; id?: number }): string {
    if (!match?.banner) return 'assets/placeholder.jpg';
    if (match.banner.startsWith('http')) return match.banner;
    if (match.banner === 'db' && match.id) return `${environment.apiUri}/matches/${match.id}/banner`;
    const base = environment.apiUri.replace(/\/api\/?$/, '');
    return `${base}/${match.banner.replace(/\\/g, '/').replace(/^\//, '')}`;
  }

  carregarDados() {
    if (!localStorage.getItem('token') || !this.currentUser?.id) {
      this.loading = false;
      return;
    }
    this.loading = true;
    this.matchService.getMatches(this.currentUser.id, true).subscribe({
      next: (data) => {
        // FILTRO LOCAL GARANTIDO: Remove eventos passados (baseado na data_jogo)
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const dadosFiltrados = data.filter((m: any) => {
          if (!m.data_jogo) return true;
          const dataJogo = new Date(m.data_jogo);
          dataJogo.setHours(0, 0, 0, 0);
          return dataJogo.getTime() >= hoje.getTime();
        });

        this.matches = dadosFiltrados.map((match: any) => {
          let ingressosGanhos: any[] = [];

          // 1. Processa Lances (Financeiro/Compatibilidade)
          if (match.raw_lances) {
            const lancesArray = match.raw_lances.toString().split(',');
            lancesArray.forEach((item: string) => {
              const parts = item.split(':');
              if (parts[2] === 'GANHOU') {
                ingressosGanhos.push({
                  id: Number(parts[0]),
                  valor: parts[1],
                  nome: parts[3] && parts[3] !== 'null' && parts[3].trim() !== '' ? parts[3] : null,
                  checkin: parts[4] === '1' || parts[4] === 'true', // Fallback
                });
              }
            });
          }

          // 2. Processa Ingressos Físicos (NOVA ARQUITETURA - Se existir)
          if (match.raw_ingressos) {
            ingressosGanhos = match.raw_ingressos
              .toString()
              .split(',')
              .map((item: string) => {
                const p = item.split(':');
                return {
                  id: Number(p[0]), // ID Único do Ingresso
                  nome: p[1] && p[1] !== 'null' && p[1].trim() !== '' ? p[1] : null,
                  checkin: p[2] === '1' || p[2] === 'true',
                };
              });
          }

          return {
            ...match,
            ingressos_ganhos_detalhes: ingressosGanhos,
            tickets_ganhos: ingressosGanhos.length,
          };
        });

        this.atualizarTimers();

        // ORDENAÇÃO
        this.matches.sort((a, b) => {
          const pesoA = a.estado_tempo === 'ENCERRADO' ? 1 : 0;
          const pesoB = b.estado_tempo === 'ENCERRADO' ? 1 : 0;
          if (pesoA !== pesoB) return pesoA - pesoB;
          return (
            new Date(a.data_limite_aposta).getTime() - new Date(b.data_limite_aposta).getTime()
          );
        });

        this.calcularTotais();
        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cd.detectChanges();
      },
    });

    const uid = this.currentUser?.id;
    if (uid != null) {
      this.matchService.getBalance(uid).subscribe({
        next: (res: any) => {
          const pts = res?.pontos != null ? Number(res.pontos) : 0;
          if (this.currentUser) this.currentUser.pontos = pts;
          localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
          this.cd.detectChanges();
        },
        error: () => {
          // Atualiza no próximo ciclo para evitar NG0100 (ExpressionChangedAfterItHasBeenCheckedError)
          setTimeout(() => {
            if (this.currentUser) this.currentUser.pontos = 0;
            this.cd.detectChanges();
          }, 0);
        },
      });
    }
  }

  atualizarTimers() {
    const agora = new Date().getTime();

    this.matches.forEach((match) => {
      if (match.status !== 'ABERTA') {
        match.estado_tempo = 'ENCERRADO';
        match.timer_texto = 'Tempo Esgotado';
        return;
      }

      if (!match.data_inicio_apostas || !match.data_limite_aposta) return;

      const inicio = new Date(match.data_inicio_apostas).getTime();
      const fim = new Date(match.data_limite_aposta).getTime();

      if (agora < inicio) {
        match.estado_tempo = 'EM_BREVE';
        match.timer_texto = this.formatarTempo(inicio - agora);
      } else if (agora >= inicio && agora < fim) {
        match.estado_tempo = 'ABERTO';
        match.timer_texto = this.formatarTempo(fim - agora);
      } else {
        match.estado_tempo = 'ENCERRADO';
        match.timer_texto = 'Tempo Esgotado';
      }
    });
  }

  formatarTempo(ms: number): string {
    if (ms < 0) ms = 0;
    const dias = Math.floor(ms / (1000 * 60 * 60 * 24));
    const horas = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((ms % (1000 * 60)) / 1000);

    let texto = '';
    if (dias > 0) texto += `${dias}d `;
    texto += `${horas.toString().padStart(2, '0')}h `;
    texto += `${minutos.toString().padStart(2, '0')}m `;
    texto += `${segundos.toString().padStart(2, '0')}s`;
    return texto;
  }

  calcularTotais() {
    this.pontosEmJogo = 0;
    this.meusLancesCount = 0;

    this.matches.forEach((match) => {
      const comprados = Number(match.tickets_comprados) || 0;
      if (match.status === 'ABERTA' && comprados > 0) {
        this.meusLancesCount += comprados;
        if (match.raw_lances) {
          const lancesArray = match.raw_lances.split(',');
          const totalNoEvento = lancesArray.reduce((acc: number, lanceStr: string) => {
            const valor = Number(lanceStr.split(':')[1]) || 0;
            return acc + valor;
          }, 0);
          this.pontosEmJogo += totalNoEvento;
        }
      }
    });
  }

  // =========================================================================
  // MODAL EM MASSA ALINHADO E COM BLOQUEIO DE SEGURANÇA (IGUAL MY-BETS)
  // =========================================================================
  async definirRetirantes(match: any) {
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

      const { value: selecoes, dismiss } = await Swal.fire({
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
                // Modificado para usar ingressoId!
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
            this.carregarDados();
          } catch (e) {
            Swal.fire('Erro', 'Ocorreu um erro ao salvar alguns convidados.', 'error');
          }
        }
      }
    });
  }

  async cadastrarNovoConvidado(match: any) {
    const { value: formValues, dismiss } = await Swal.fire({
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
        next: (res: any) => {
          Swal.fire({ icon: 'success', title: 'Salvo!', timer: 1000, showConfirmButton: false });
          setTimeout(() => this.definirRetirantes(match), 1000);
        },
        error: () => Swal.fire('Erro', 'Não foi possível salvar o convidado.', 'error'),
      });
    } else {
      this.definirRetirantes(match);
    }
  }

  async apostar(match: any, previousValues: number[] = []) {
    if (match.estado_tempo === 'EM_BREVE') {
      Swal.fire('Aguarde', 'O período de lances ainda não iniciou.', 'warning');
      return;
    }
    if (match.estado_tempo === 'ENCERRADO') {
      Swal.fire('Fechado', 'O tempo para lances acabou.', 'error');
      return;
    }

    const lancesJaRealizados = match.tickets_comprados || 0;
    const limiteMaximo = 4;
    const lancesQuePodeDar = limiteMaximo - lancesJaRealizados;

    if (lancesQuePodeDar <= 0) {
      Swal.fire('Limite Atingido', 'Você já possui o limite de 4 lances.', 'info');
      return;
    }

    let lancesAtivosNoPopup = Math.max(1, previousValues.length);
    const saldoInicial = this.currentUser.pontos || 0;

    const { value: valores, isDismissed } = await Swal.fire({
      title: `<span class="text-xl font-black text-gray-800 tracking-tight">🎟️ Realizar Lances</span>`,
      width: '450px',
      showCancelButton: true,
      confirmButtonText: 'Confirmar Lances',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
      html: `
      <div class="text-left px-1">
        <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
          <div class="flex justify-between items-center mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <span>Status: ${lancesJaRealizados}/4 Lances</span>
            <span class="text-emerald-600">Disponível: ${saldoInicial}</span>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between items-center text-sm">
              <span class="text-gray-500 font-medium">Soma dos Novos Lances:</span>
              <span id="total-lances" class="font-black text-indigo-600">0 pts</span>
            </div>
            <div class="flex justify-between items-center pt-2 border-t border-gray-200">
              <span class="text-gray-800 font-bold">Saldo Após Lances:</span>
              <span id="saldo-restante" class="font-black text-xl text-emerald-700">${saldoInicial} pts</span>
            </div>
          </div>
        </div>
        <div id="lances-wrapper">
          ${Array.from({ length: lancesQuePodeDar })
            .map(
              (_, i) => {
                const isVisible = i === 0 || i < previousValues.length;
                const val = previousValues[i] ? previousValues[i] : '';
                return `
            <div id="container-lance-${i + 1}" class="flex items-center gap-3 mb-3 ${isVisible ? '' : 'hidden'}">
              <div class="w-24 text-[11px] font-black text-gray-400 uppercase tracking-tighter">Lance ${lancesJaRealizados + i + 1}</div>
              <div class="relative flex-1">
                <input id="lance-${i + 1}" type="number" class="swal2-input m-0 px-4 py-2 text-sm font-bold border-gray-200 focus:border-indigo-500 rounded-lg shadow-sm" placeholder="Valor do lance" value="${val}">
              </div>
            </div>`;
              }
            )
            .join('')}
        </div>
        ${lancesQuePodeDar > lancesAtivosNoPopup ? `<button id="add-lance-btn" type="button" class="w-full mt-2 py-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-[10px] font-bold hover:border-indigo-300 hover:text-indigo-500 transition-all">+ Adicionar outro lance (${lancesQuePodeDar - lancesAtivosNoPopup} vaga(s) restante(s))</button>` : ''}
      </div>`,
      didOpen: () => {
        const btn = document.getElementById('add-lance-btn');
        const totalLancesEl = document.getElementById('total-lances');
        const saldoRestanteEl = document.getElementById('saldo-restante');
        const inputs = Array.from({ length: lancesQuePodeDar }).map(
          (_, i) => document.getElementById(`lance-${i + 1}`) as HTMLInputElement,
        );

        const atualizarCalculo = () => {
          const total = inputs.reduce((acc, input) => acc + (parseFloat(input?.value) || 0), 0);
          const restante = saldoInicial - total;
          if (totalLancesEl) totalLancesEl.innerText = `${total} pts`;
          if (saldoRestanteEl) {
            saldoRestanteEl.innerText = `${restante} pts`;
            if (restante < 0) {
              saldoRestanteEl.className = 'font-black text-xl text-red-600';
              Swal.getConfirmButton()?.setAttribute('disabled', 'true');
            } else {
              saldoRestanteEl.className = 'font-black text-xl text-emerald-700';
              Swal.getConfirmButton()?.removeAttribute('disabled');
            }
          }
        };
        
        atualizarCalculo();

        inputs.forEach((input) => {
          if (input) {
            input.addEventListener('input', atualizarCalculo);
            input.addEventListener('keyup', atualizarCalculo);
          }
        });
        btn?.addEventListener('click', () => {
          if (lancesAtivosNoPopup < lancesQuePodeDar) {
            lancesAtivosNoPopup++;
            document
              .getElementById(`container-lance-${lancesAtivosNoPopup}`)
              ?.classList.remove('hidden');
            const vagas = lancesQuePodeDar - lancesAtivosNoPopup;
            if (vagas > 0) btn.innerHTML = `+ Adicionar outro lance (${vagas} vaga(s) restante(s))`;
            else btn.style.display = 'none';
          }
        });
      },
      preConfirm: () => {
        const inputsValidos = [];
        for (let i = 1; i <= lancesAtivosNoPopup; i++) {
          const el = document.getElementById(`lance-${i}`) as HTMLInputElement;
          if (el && el.value) {
            const val = parseFloat(el.value);
            if (val > 0) inputsValidos.push(val);
          }
        }
        const total = inputsValidos.reduce((a, b) => a + b, 0);
        if (inputsValidos.length === 0) {
          Swal.showValidationMessage('Digite pelo menos um valor.');
          return false;
        }
        if (total > saldoInicial) {
          Swal.showValidationMessage(`Saldo insuficiente! Total: ${total} pts`);
          return false;
        }
        return inputsValidos;
      },
    });

    if (isDismissed) {
      return;
    }

    if (valores) {
      const totalApostado = valores.reduce((a: number, b: number) => a + b, 0);
      const qtdLances = valores.length;

      const { isConfirmed } = await Swal.fire({
        title: '⚠️ Atenção: Participação Única',
        html: `
          <div class="text-left bg-rose-50 p-4 rounded-xl border border-rose-100 mt-2">
            <p class="text-sm text-gray-700 mb-2">
              Você está prestes a realizar <b>${qtdLances}</b> lance(s), consumindo um total de <b>${totalApostado} pts</b>.
            </p>
            <p class="text-sm font-black text-rose-700">
              Esta é uma ação definitiva! Após confirmar, você NÃO poderá alterar, adicionar novos lances ou cancelar sua participação neste evento.
            </p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Estou ciente, registrar lances',
        cancelButtonText: 'Voltar para revisar',
        reverseButtons: true
      });

      if (!isConfirmed) {
        this.apostar(match, valores);
        return;
      }

      match.tickets_comprados = (match.tickets_comprados || 0) + valores.length;
      this.cd.detectChanges();

      this.matchService
        .placeBet({ partidaId: match.id, usuarioId: this.currentUser.id, valores: valores })
        .subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Lances Confirmados!',
              text: `Você realizou ${valores.length} lance(s).`,
              timer: 2000,
              showConfirmButton: false,
            });

            const uid = this.currentUser?.id;
            if (uid != null) {
              this.matchService.getBalance(uid).subscribe({
                next: (res: any) => {
                  const pts = res?.pontos != null ? Number(res.pontos) : 0;
                  if (this.currentUser) this.currentUser.pontos = pts;
                  localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                  this.carregarDados();
                  this.cd.detectChanges();
                },
                error: () => {
                  this.carregarDados();
                  this.cd.detectChanges();
                },
              });
            } else {
              this.carregarDados();
              this.cd.detectChanges();
            }
          },
          error: (err) => {
            match.tickets_comprados = (match.tickets_comprados || 0) - valores.length;
            this.cd.detectChanges();
            Swal.fire('Erro', err.error?.error || 'Erro ao processar', 'error');
          },
        });
    }
  }

  trackByFn(index: number, item: any) {
    return item.id;
  }
}
