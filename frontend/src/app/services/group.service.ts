import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GroupService {
  private apiUrl = `${environment.apiUri}/groups`;

  constructor(private http: HttpClient) {}

  getAllGroups(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  createGroup(data: {
    nome: string;
    descricao: string;
    motivo: string;
    adminId: number;
  }): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  updateGroup(
    id: number,
    data: { nome: string; descricao: string; motivo: string; adminId: number },
  ): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteGroup(id: number, adminId: number, motivo: string): Observable<any> {
    // Usamos o 'body' no DELETE para conseguir enviar o motivo e adminId
    return this.http.delete(`${this.apiUrl}/${id}`, { body: { adminId, motivo } });
  }

  getUserGroups(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/${userId}`);
  }

  /** Organograma: empresas com setores aninhados (para modais Atribuir Grupo / Pontos em Lote). */
  getEmpresasComSetores(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUri}/sectors/organograma`);
  }
}
