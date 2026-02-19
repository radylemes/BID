import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = 'http://localhost:3005/api/users';

  constructor(private http: HttpClient) {}

  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // Métodos PUT
  mudarPerfil(id: number, dados: { perfil: string; adminId: number }): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/perfil`, dados);
  }

  toggleStatus(id: number, dados: { ativo: boolean; adminId: number }): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/status`, dados);
  }

  updatePontos(id: number, adminId: number, novosPontos: number, motivo: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/pontos`, { novosPontos, adminId, motivo });
  }

  // Métodos POST
  syncUsers(): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync`, {});
  }

  updateEmMassa(alteracoes: any[], adminId: number, motivoGlobal: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/bulk-update`, { alteracoes, adminId, motivoGlobal });
  }

  uploadAvatar(userId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('foto', file);
    formData.append('userId', userId.toString());
    return this.http.post(`${this.apiUrl}/upload-avatar`, formData);
  }

  getHistorico(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${userId}/historico`);
  }

  updateUserGroup(
    usuarioId: number,
    grupoId: number | null,
    motivo: string,
    adminId: number,
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/update-groups`, { usuarioId, grupoId, motivo, adminId });
  }

  createUser(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, userData);
  }

  deleteUser(userId: number, adminId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${userId}`, {
      body: { adminId },
    });
  }

  updateUser(id: number, dados: any): Observable<any> {
    // dados deve conter: { nome_completo, email, username, senha (opcional), adminId }
    return this.http.put(`${this.apiUrl}/${id}`, dados);
  }

  getUserStats(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${userId}/stats`);
  }
}
