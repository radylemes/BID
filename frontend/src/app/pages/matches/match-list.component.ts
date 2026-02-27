import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchService } from '../../services/match.service';
import Swal from 'sweetalert2';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

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
    const base = environment.apiUri.replace(/\/api\/?$/, '');
    return `${base}/${match.banner.replace(/\\/g, '/').replace(/^\//, '')}`;
  }

  // --- LÓGICA ATUALIZADA: COMPRA DE TICKET ---
  async apostar(match: any) {
    // 1. Verifica Data Limite
    if (new Date() > new Date(match.data_limite_aposta)) {
      Swal.fire('Fechado', 'Inscrições encerradas.', 'warning');
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
        const v = (document.getElementById('valorAposta') as HTMLInputElement).value;
        if (Number(v) < match.custo_aposta) {
          Swal.showValidationMessage(`Mínimo é ${match.custo_aposta}`);
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

      // 5. Envia para o Serviço com a NOVA estrutura
      this.matchService
        .placeBet({
          partidaId: match.id,
          usuarioId: this.currentUser.id,
          valorApostado: valor, // <--- CORREÇÃO PRINCIPAL AQUI
        })
        .subscribe({
          next: (res) => {
            Swal.fire('Sucesso!', 'Ticket comprado.', 'success');
            // Atualiza saldo local
            this.currentUser.pontos -= valor;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            this.carregarJogos();
          },
          error: (err) => Swal.fire('Falha', err.error?.error || 'Erro ao apostar', 'error'),
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
