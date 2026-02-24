import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MatchService {
  private apiUrl = 'http://localhost:3005/api/matches';

  constructor(private http: HttpClient) {}

  getMatches(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}?userId=${userId}`);
  }

  // Busca os grupos de apostas globais
  getGroups(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:3005/api/groups');
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

  getBalance(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/balance/${userId}`);
  }

  getWinnersReport(partidaId: number) {
    return this.http.get(`${this.apiUrl}/${partidaId}/winners-report`);
  }
}
