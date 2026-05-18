import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchService } from '../../services/match.service';
import Swal from 'sweetalert2';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { uploadsPublicUrl } from '../../utils/uploads-public-url';

@Component({
  selector: 'app-match-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './match-list.component.html',
})
export class MatchListComponent implements OnInit {
  matches: any[] = [];
  displayedMatches: any[] = [];
  currentUser: any = {};
  isAdmin = false;
  loading = false;
  
  // Paginação
  currentPage = 1;
  pageSize = 6;
  hasMore = true;

  constructor(private matchService: MatchService) {}

  ngOnInit() {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      this.currentUser = JSON.parse(userJson);
      this.isAdmin = this.currentUser.perfil === 'ADMIN';
      this.carregarJogos();
    }
  }

  carregarJogos() {
    this.loading = true;
    this.matchService.getMatches(this.currentUser.id, true).subscribe({
      next: (data) => {
        this.matches = data;
        this.updateDisplayedMatches();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      },
    });
  }

  updateDisplayedMatches() {
    const startIndex = 0;
    const endIndex = this.currentPage * this.pageSize;
    this.displayedMatches = this.matches.slice(startIndex, endIndex);
    this.hasMore = endIndex < this.matches.length;
  }

  loadMore() {
    this.currentPage++;
    this.updateDisplayedMatches();
  }

  getBannerUrl(match: { banner?: string; id?: number }): string {
    if (!match?.banner) return 'assets/banner-placeholder.jpg';
    if (match.banner.startsWith('http')) return match.banner;
    if (match.banner === 'db' && match.id) return `${environment.apiUri}/matches/${match.id}/banner`;
    return uploadsPublicUrl(match.banner);
  }

  private readonly MSG_PRAZO_ENCERRADO =
    'A aposta não foi realizada: o prazo para lances já encerrou.';

  private estaNaJanelaDeLances(match: any, bufferMs: number = 0): { ok: boolean } {
    if (!match.data_inicio_apostas || !match.data_limite_aposta) return { ok: true };
    const agora = Date.now();
    const inicio = new Date(match.data_inicio_apostas).getTime() + bufferMs;
    const fim = new Date(match.data_limite_aposta).getTime();
    if (agora < inicio || agora >= fim) return { ok: false };
    return { ok: true };
  }

  private notificarPrazoEncerrado(): void {
    Swal.fire({
      icon: 'warning',
      title: 'Prazo encerrado',
      text: this.MSG_PRAZO_ENCERRADO,
    });
  }

  private isErroPrazoEncerrado(err: any): boolean {
    const msg = String(err?.error?.error || err?.error?.message || '').toLowerCase();
    return (
      msg.includes('prazo_encerrado') ||
      msg.includes('período de lances já encerrou') ||
      msg.includes('periodo de lances ja encerrou')
    );
  }

  // --- LÓGICA ATUALIZADA: COMPRA DE TICKET ---
  async apostar(match: any) {
    if (!this.estaNaJanelaDeLances(match, 60 * 1000).ok) {
      this.notificarPrazoEncerrado();
      return;
    }

    // 2. Verifica Limite de Tickets
    if ((match.tickets_comprados || 0) >= 4) {
      Swal.fire('Limite Atingido', 'Você já tem 4 tickets para este evento.', 'info');
      return;
    }

    // 3. Popup para digitar o valor (Lance)
    const { value: valor } = await Swal.fire({
      title: `Participar: ${match.titulo}`,
      html: `
        <div class="text-left">
           <p class="mb-2">Saldo Atual: <b>${this.currentUser.pontos}</b></p>
           <label>Valor do Lance (Mínimo: ${match.custo_aposta})</label>
           <input id="valorAposta" type="number" class="swal2-input" value="${match.custo_aposta}" min="${match.custo_aposta}">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      preConfirm: () => {
        if (!this.estaNaJanelaDeLances(match, 60 * 1000).ok) {
          Swal.showValidationMessage(this.MSG_PRAZO_ENCERRADO);
          return false;
        }
        const v = (document.getElementById('valorAposta') as HTMLInputElement).value;
        if (Number(v) < match.custo_aposta) {
          Swal.showValidationMessage(`Mínimo é ${match.custo_aposta}`);
          return false;
        }
        return Number(v);
      },
    });

    if (valor) {
      // 4. Verifica Saldo Local
      if (this.currentUser.pontos < valor) {
        Swal.fire('Erro', 'Saldo insuficiente', 'error');
        return;
      }

      if (!this.estaNaJanelaDeLances(match, 60 * 1000).ok) {
        this.notificarPrazoEncerrado();
        return;
      }

      this.matchService
        .placeBet({
          partidaId: Number(match.id),
          usuarioId: Number(this.currentUser.id),
          valorApostado: Math.round(Number(valor)),
        })
        .subscribe({
          next: (res) => {
            Swal.fire('Sucesso!', 'Ticket comprado.', 'success');
            // Atualiza saldo local
            this.currentUser.pontos -= valor;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            this.carregarJogos();
          },
          error: (err) => {
            if (this.isErroPrazoEncerrado(err)) {
              this.notificarPrazoEncerrado();
              return;
            }
            Swal.fire('Falha', err.error?.error || 'Erro ao apostar', 'error');
          },
        });
    }
  }

  // Se você não usa mais criarJogo/finalizarJogo neste componente (pois moveu para o MatchManager),
  // pode removê-los ou atualizá-los. Vou deixá-los comentados para limpar o erro.
  /*
  async criarJogo() { ... }
  async finalizarJogo(match: any) { ... }
  */
}
