import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = `${environment.apiUri}/users`;

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

  // ==========================================
  // FUNÇÃO CORRIGIDA DE UPLOAD
  // ==========================================
  uploadAvatar(userId: number, file: File): Observable<any> {
    const formData = new FormData();

    // 1ª Regra: O ID (Texto) DEVE vir antes do ficheiro
    formData.append('userId', userId.toString());

    // 2ª Regra: O nome do campo do ficheiro deve coincidir com o upload.single('avatar') do backend
    formData.append('avatar', file);

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
    return this.http.put(`${this.apiUrl}/${usuarioId}/grupo`, {
      usuarioId,
      grupoId,
      motivo,
      adminId,
    });
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

  updateTheme(userId: number, tema_preferido: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${userId}/theme`, { tema_preferido });
  }

  getUserStats(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${userId}/stats`);
  }

  addBatchPoints(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/batch-points`, data);
  }

  getGruposApostas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/grupos-apostas`);
  }

  updateBatchGroup(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/batch-group`, data);
  }

  /** Diagnóstico: status de conexão com cada tenant Azure AD (login + Graph). */
  getTenantsStatus(): Observable<{ tenants: Array<{ label: string; tenantId: string; status: string; message: string | null; userCount?: number }> }> {
    return this.http.get<{ tenants: Array<{ label: string; tenantId: string; status: string; message: string | null; userCount?: number }> }>(`${this.apiUrl}/tenants-status`);
  }
}
