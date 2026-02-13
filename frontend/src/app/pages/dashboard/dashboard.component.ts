import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchService } from '../../services/match.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  matches: any[] = [];
  currentUser: any = {};
  loading = false;
  pontosEmJogo: number = 0;
  meusLancesCount: number = 0;

  constructor(
    private matchService: MatchService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.carregarDados();
  }

  carregarDados() {
    this.loading = true;

    this.matchService.getMatches(this.currentUser.id).subscribe({
      next: (data) => {
        // PROCESSAMENTO AVANÇADO DOS LANCES
        this.matches = data.map((match) => {
          let lancesProcessados: any[] = [];
          let totalGasto = 0;
          let totalReembolsado = 0;

          if (match.raw_lances) {
            // raw_lances vem como "50:GANHOU,20:PERDEU,10:PENDENTE"
            const lancesArray = match.raw_lances.toString().split(',');

            lancesProcessados = lancesArray.map((item: string) => {
              const [valorStr, status] = item.split(':');
              const valor = Number(valorStr);

              // Calcula totais baseados no status
              if (status === 'GANHOU') {
                totalGasto += valor;
              } else if (status === 'PERDEU') {
                totalReembolsado += valor;
              }

              return { valor, status };
            });
          }

          return {
            ...match,
            lances_detalhados: lancesProcessados,
            total_gasto: totalGasto,
            total_reembolsado: totalReembolsado,
          };
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
        this.cd.detectChanges();
      },
    });
  }

  calcularTotais() {
    this.pontosEmJogo = 0;
    this.meusLancesCount = 0;

    this.matches.forEach((match) => {
      // Usa o array processado
      if (match.lances_detalhados && match.lances_detalhados.length > 0) {
        match.tickets_comprados = match.lances_detalhados.length;

        if (match.status === 'ABERTA') {
          this.meusLancesCount += match.lances_detalhados.length;
          const totalNoEvento = match.lances_detalhados.reduce(
            (acc: number, lance: any) => acc + lance.valor,
            0,
          );
          this.pontosEmJogo += totalNoEvento;
        }
      }
    });
    this.cd.detectChanges();
  }

  // ... (Mantenha a função apostar e trackByFn idênticas à versão anterior correta) ...
  async apostar(match: any) {
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
                <input id="lance-${i + 1}" type="number" 
                       class="swal2-input m-0 px-4 py-2 text-sm font-bold border-gray-200 focus:border-indigo-500 rounded-lg shadow-sm" 
                       placeholder="Valor do lance">
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
            saldoRestanteEl.className =
              restante < 0
                ? 'font-black text-xl text-red-600'
                : 'font-black text-xl text-emerald-700';
            if (restante < 0) Swal.getConfirmButton()?.setAttribute('disabled', 'true');
            else Swal.getConfirmButton()?.removeAttribute('disabled');
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
