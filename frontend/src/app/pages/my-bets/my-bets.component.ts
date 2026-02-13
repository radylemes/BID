import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // Bom ter aqui também caso adicione botão de voltar
import { MatchService } from '../../services/match.service';

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
    private cd: ChangeDetectorRef, // <--- INJEÇÃO PARA FORÇAR ATUALIZAÇÃO
  ) {}

  ngOnInit() {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.carregarHistorico();
  }

  carregarHistorico() {
    this.loading = true;

    this.matchService.getMatches(this.currentUser.id).subscribe({
      next: (data) => {
        // Filtra apenas eventos onde o usuário participou
        const participacoes = data.filter((m: any) => m.raw_lances);

        this.matches = participacoes.map((match) => {
          let lancesProcessados: any[] = [];
          let totalGasto = 0;
          let totalReembolsado = 0;

          if (match.raw_lances) {
            const lancesArray = match.raw_lances.toString().split(',');
            lancesProcessados = lancesArray.map((item: string) => {
              const [valorStr, status] = item.split(':');
              const valor = Number(valorStr);

              if (status === 'GANHOU') totalGasto += valor;
              else if (status === 'PERDEU') totalReembolsado += valor;

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

        this.loading = false;
        this.cd.detectChanges(); // <--- O SEGREDO: FORÇA A TELA ATUALIZAR AGORA
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.cd.detectChanges(); // <--- ATUALIZA MESMO COM ERRO (PRA SUMIR O LOADING)
      },
    });
  }
}
