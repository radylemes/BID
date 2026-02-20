import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MatchService {
  private apiUrl = 'http://localhost:3005/api/matches';

  constructor(private http: HttpClient) {}

  // Busca todos os eventos
  getMatches(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}?userId=${userId}`);
  }

  // Busca grupos
  getGroups(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/groups`);
  }

  // Criar novo BID
  createMatch(matchData: any): Observable<any> {
    return this.http.post(this.apiUrl, matchData);
  }

  // Participar (Apostar)
  placeBet(betData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/bet`, betData);
  }

  // Finalizar Evento
  finishMatch(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/finish`, data);
  }

  // --- AQUI ESTÁ A FUNÇÃO QUE FALTAVA ---
  getBalance(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/balance/${userId}`);
  }
  // --------------------------------------

  // Editar BID
  updateMatch(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  // Excluir BID
  deleteMatch(id: number, adminId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}?adminId=${adminId}`);
  }

  // Adicione junto das outras funções no match.service.ts
  getWinnersReport(partidaId: number) {
    // Tenta acessar a rota diretamente após a apiUrl base
    return this.http.get(`${this.apiUrl}/${partidaId}/winners-report`);
  }
}
