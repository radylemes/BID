import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EventoRhListResponse {
  eventos: any[];
  bloqueio_ativo: {
    eventos_restantes: number;
    eventos_total: number;
    evento_origem_id: number;
    evento_origem_titulo: string;
  } | null;
}

export interface EventoRhHistoricoItem {
  inscricao_id: number;
  inscricao_status: string;
  /** Ordem no momento da inscrição (pode parecer “deslocada” após cancelamentos). */
  posicao_ordem_inscricao: number;
  /** Posição atual entre inscrições ativas (não canceladas), por ordem de chegada. */
  posicao_efetiva: number | null;
  total_inscritos_ativos: number;
  data_inscricao: string | null;
  evento_id: number;
  titulo: string | null;
  banner: string | null;
  local: string | null;
  data_evento: string | null;
  data_inicio_inscricao: string | null;
  data_limite_inscricao: string | null;
  evento_status: string;
  vagas: number;
  ocupadas: number;
  vagas_restantes: number;
}

export interface ParticipanteListaItem {
  nome: string;
  data_inscricao: string | null;
  status_inscricao: string;
  situacao_inscricao: string;
  comparecimento: string;
  posicao_ordem: number;
}

@Injectable({
  providedIn: 'root',
})
export class EventoRhService {
  private apiUrl = `${environment.apiUri}/eventos-rh`;

  constructor(private http: HttpClient) {}

  listEventos(): Observable<EventoRhListResponse> {
    return this.http.get<EventoRhListResponse>(this.apiUrl);
  }

  listHistorico(): Observable<{ historico: EventoRhHistoricoItem[] }> {
    return this.http.get<{ historico: EventoRhHistoricoItem[] }>(`${this.apiUrl}/historico`);
  }

  listParticipantesColaborador(eventoId: number): Observable<{
    titulo_evento: string;
    participantes: ParticipanteListaItem[];
  }> {
    return this.http.get<{ titulo_evento: string; participantes: ParticipanteListaItem[] }>(
      `${this.apiUrl}/${eventoId}/lista-participantes`,
    );
  }

  listAdminTodos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/todos`);
  }

  getEvento(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  getInscritos(eventoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${eventoId}/inscritos`);
  }

  createEvento(body: Record<string, unknown>): Observable<any> {
    return this.http.post(this.apiUrl, body);
  }

  updateEvento(id: number, body: Record<string, unknown>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, body);
  }

  deleteEvento(id: number, adminId?: number, motivo?: string): Observable<any> {
    let url = `${this.apiUrl}/${id}`;
    const params: string[] = [];
    if (adminId != null) params.push(`adminId=${adminId}`);
    if (motivo) params.push(`motivo=${encodeURIComponent(motivo)}`);
    if (params.length) url += `?${params.join('&')}`;
    return this.http.delete(url);
  }

  inscrever(eventoId: number, aceitouPolitica: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/${eventoId}/inscrever`, { aceitou_politica: aceitouPolitica });
  }

  cancelarInscricao(eventoId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${eventoId}/inscrever`);
  }

  marcarPresenca(
    eventoId: number,
    usuarioId: number,
    status: 'PRESENTE' | 'FALTOU',
    adminId?: number,
  ): Observable<any> {
    const body: Record<string, unknown> = { usuario_id: usuarioId, status };
    if (adminId != null) body['adminId'] = adminId;
    return this.http.post(`${this.apiUrl}/${eventoId}/presenca`, body);
  }
}
