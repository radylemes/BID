import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MatchService {
  private apiUrl = `${environment.apiUri}/matches`;

  constructor(private http: HttpClient) {}

  getMatches(userId: number, isDashboard: boolean = false): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}?userId=${userId}&dashboard=${isDashboard}`);
  }

  getMyBets(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my-bets/${userId}`);
  }

  // Busca os grupos de apostas globais
  getGroups(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUri}/groups`);
  }

  createMatch(matchData: any): Observable<any> {
    return this.http.post(this.apiUrl, matchData);
  }

  updateMatch(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteMatch(id: number, adminId: number, motivo: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/${id}?adminId=${adminId}&motivo=${encodeURIComponent(motivo)}`,
    );
  }

  finishMatch(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/finish`, data);
  }

  placeBet(betData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/bet`, betData);
  }

  getBalance(userId: number): Observable<{ pontos: number }> {
    if (userId == null || userId === undefined || String(userId) === '' || Number.isNaN(Number(userId))) {
      return of({ pontos: 0 });
    }
    return this.http.get<{ pontos: number }>(`${this.apiUrl}/balance/${userId}`);
  }

  getWinnersReport(partidaId: number) {
    return this.http.get(`${this.apiUrl}/${partidaId}/winners-report`);
  }

  getBetsReport(partidaId: number) {
    return this.http.get(`${this.apiUrl}/${partidaId}/bets-report`);
  }

  getPublicHistory() {
    return this.http.get<any[]>(`${this.apiUrl}/public/history`);
  }

  getSetoresEvento(): Observable<{ id: number; nome: string }[]> {
    return this.http.get<any[]>(`${environment.apiUri}/setores-evento`);
  }

  createSetorEvento(nome: string, adminId: number): Observable<any> {
    return this.http.post(`${environment.apiUri}/setores-evento`, { nome, adminId });
  }

  deleteSetorEvento(id: number): Observable<any> {
    return this.http.delete(`${environment.apiUri}/setores-evento/${id}`);
  }

  acrescentarIngressos(partidaId: number, quantidade: number, motivo: string, adminId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${partidaId}/acrescentar-ingressos`, {
      quantidade,
      motivo,
      adminId,
    });
  }

  redistribuirIngressos(
    partidaOrigemId: number,
    partidaDestinoId: number,
    quantidade: number,
    motivo: string,
    adminId: number
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/${partidaOrigemId}/redistribuir`, {
      partidaDestinoId,
      quantidade,
      motivo,
      adminId,
    });
  }
}
