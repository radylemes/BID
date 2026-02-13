import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GroupService {
  private apiUrl = 'http://localhost:3005/api/groups'; // Ajuste porta se necessário

  constructor(private http: HttpClient) {}

  getAllGroups(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  createGroup(nome: string, descricao: string): Observable<any> {
    return this.http.post(this.apiUrl, { nome, descricao });
  }

  addMember(grupoId: number, usuarioId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/add-member`, { grupoId, usuarioId });
  }

  removeMember(grupoId: number, usuarioId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/remove-member`, { grupoId, usuarioId });
  }

  getUserGroups(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/${userId}`);
  }

  updateGroup(id: number, nome: string, descricao: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, { nome, descricao });
  }

  deleteGroup(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
