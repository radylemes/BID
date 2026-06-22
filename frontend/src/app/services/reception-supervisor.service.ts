import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SupervisorAcesso {
  tipo: 'BID' | 'WT_PASS';
  registro_id: number;
  status: 'ativo' | 'cancelado';
  data_checkin?: string | null;
  data_evento?: string | null;
  recebedor_nome?: string | null;
  recebedor_cpf?: string | null;
  titular_nome?: string | null;
  titular_cpf?: string | null;
  retirante_nome?: string | null;
  evento_titulo?: string | null;
  empresa?: string | null;
  setor_evento_nome?: string | null;
  liberado_por_nome?: string | null;
  cancelado_em?: string | null;
  cancelado_por_nome?: string | null;
  motivo_cancelamento?: string | null;
  partida_id?: number | null;
  evento_rh_id?: number | null;
  tem_assinatura?: boolean;
  tem_documento?: boolean;
  assinatura?: string | null;
  documento?: string | null;
  auditoria_id?: number;
}

export interface SupervisorFiltros {
  from: string;
  to: string;
  tipo?: 'todos' | 'BID' | 'WT_PASS';
  status?: 'todos' | 'ativo' | 'cancelado';
  q?: string;
}

@Injectable({ providedIn: 'root' })
export class ReceptionSupervisorService {
  private baseUrl = `${environment.apiUri}/reception/supervisor`;

  constructor(private http: HttpClient) {}

  listarAcessos(filtros: SupervisorFiltros): Observable<SupervisorAcesso[]> {
    let params = new HttpParams()
      .set('from', filtros.from)
      .set('to', filtros.to);
    if (filtros.tipo && filtros.tipo !== 'todos') params = params.set('tipo', filtros.tipo);
    if (filtros.status && filtros.status !== 'todos') params = params.set('status', filtros.status);
    if (filtros.q?.trim()) params = params.set('q', filtros.q.trim());
    return this.http.get<SupervisorAcesso[]>(`${this.baseUrl}/acessos`, { params });
  }

  obterDetalhe(tipo: string, id: number): Observable<SupervisorAcesso> {
    return this.http.get<SupervisorAcesso>(`${this.baseUrl}/acessos/${tipo}/${id}`);
  }

  cancelarAcesso(tipo: string, id: number, motivo: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/acessos/${tipo}/${id}/cancelar`, {
      motivo,
    });
  }
}
