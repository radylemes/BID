import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatchService } from '../../services/match.service';
import Swal from 'sweetalert2';

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

  carregarDados() {
    this.loading = true;
    this.matchService.getMatches(this.currentUser.id).subscribe({
      next: (data) => {
        this.matches = [...data];

        // Atualiza os timers primeiro para definir o estado (ABERTO, EM_BREVE, ENCERRADO)
        this.atualizarTimers();

        // ORDENAÇÃO: Eventos ativos/próximos primeiro, depois pela data mais próxima. Encerrados no final.
        this.matches.sort((a, b) => {
          const pesoA = a.estado_tempo === 'ENCERRADO' ? 1 : 0;
          const pesoB = b.estado_tempo === 'ENCERRADO' ? 1 : 0;

          if (pesoA !== pesoB) return pesoA - pesoB; // Separa Ativos de Encerrados

          // Se tiverem o mesmo peso, ordena pela data limite mais próxima
          return (
            new Date(a.data_limite_aposta).getTime() - new Date(b.data_limite_aposta).getTime()
          );
        });

        this.calcularTotais();
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.cd.detectChanges();
      },
    });

    this.matchService.getBalance(this.currentUser.id).subscribe({
      next: (res: any) => {
        this.currentUser.pontos = res.pontos;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      },
    });
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
            const valor = Number(lanceStr.split(':')[0]) || 0;
            return acc + valor;
          }, 0);

          this.pontosEmJogo += totalNoEvento;
        }
      }
    });
    this.cd.detectChanges();
  }

  async apostar(match: any) {
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

    let lancesAtivosNoPopup = 1;
    const saldoInicial = this.currentUser.pontos || 0;

    const { value: valores } = await Swal.fire({
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
              (_, i) => `
            <div id="container-lance-${i + 1}" class="flex items-center gap-3 mb-3 ${i > 0 ? 'hidden' : ''}">
              <div class="w-24 text-[11px] font-black text-gray-400 uppercase tracking-tighter">Lance ${lancesJaRealizados + i + 1}</div>
              <div class="relative flex-1">
                <input id="lance-${i + 1}" type="number" class="swal2-input m-0 px-4 py-2 text-sm font-bold border-gray-200 focus:border-indigo-500 rounded-lg shadow-sm" placeholder="Valor do lance">
              </div>
            </div>`,
            )
            .join('')}
        </div>
        ${lancesQuePodeDar > 1 ? `<button id="add-lance-btn" type="button" class="w-full mt-2 py-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-[10px] font-bold hover:border-indigo-300 hover:text-indigo-500 transition-all">+ Adicionar outro lance (${lancesQuePodeDar - 1} vaga(s) restante(s))</button>` : ''}
      </div>`,
      didOpen: () => {
        const btn = document.getElementById('add-lance-btn');
        const totalLancesEl = document.getElementById('total-lances');
        const saldoRestanteEl = document.getElementById('saldo-restante');
        const inputs = Array.from({ length: lancesQuePodeDar }).map(
          (_, i) => document.getElementById(`lance-${i + 1}`) as HTMLInputElement,
        );

        const atualizarCalculo = () => {
          const total = inputs.reduce((acc, input) => acc + (parseFloat(input.value) || 0), 0);
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
          const val = parseFloat(el.value);
          if (val > 0) inputsValidos.push(val);
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

    if (valores) {
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
            this.carregarDados();
          },
          error: (err) => Swal.fire('Erro', err.error?.error || 'Erro ao processar', 'error'),
        });
    }
  }

  trackByFn(index: number, item: any) {
    return item.id;
  }
}
