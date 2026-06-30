import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ListaEmail {
  id: number;
  nome: string;
  descricao?: string;
  criado_em?: string;
}

export interface ListaEmailItem {
  id: number;
  lista_id: number;
  email: string;
  nome_opcional?: string;
  criado_em?: string;
}

export interface TemplateEmail {
  id: number;
  nome: string;
  assunto: string;
  corpo_html: string;
  tipo_disparo?: string | null;
  criado_em?: string;
  atualizado_em?: string;
}

export interface PreviewTemplateResponse {
  assunto: string;
  html: string;
}

export interface PreviewAreaIngressosResponse extends PreviewTemplateResponse {
  resumo?: {
    total_ingressos: string;
    qtd_eventos: string;
    qtd_eventos_bid?: string;
    qtd_eventos_wt?: string;
    eventos_titulos: string;
    eventos_tabela?: string;
    setores_tabela: string;
    setores_lista: string;
  };
  setores?: { setor_evento_id: number; setor_nome: string; qtd_ingressos: number }[];
}

export interface SendEmailsResponse {
  enviados: number;
  total: number;
  erros?: string[];
  destinatarios?: DisparoDestinatario[];
}

export interface SendStreamProgress {
  email: string;
  status: 'enviado' | 'erro';
  enviados: number;
  total: number;
  mensagem?: string | null;
}

export interface SendStreamFatal {
  error: string;
  enviados?: number;
  destinatarios?: DisparoDestinatario[];
}

export interface SendStreamCallbacks {
  onInit?: (data: { total: number }) => void;
  onProgress?: (data: SendStreamProgress) => void;
  onDone?: (data: SendEmailsResponse) => void;
  onFatal?: (data: SendStreamFatal) => void;
}

export interface DisparoDestinatario {
  email: string;
  status: 'enviado' | 'erro';
  mensagem?: string;
}

export interface DisparoLogEntry {
  id: number;
  data_hora: string;
  admin_nome?: string;
  tipoDisparo?: string;
  totalDestinatarios?: number;
  enviados?: number;
  erros?: number;
  destinatarios?: DisparoDestinatario[];
}

@Injectable({
  providedIn: 'root',
})
export class EmailService {
  private apiUrl = `${environment.apiUri}/email`;

  constructor(private http: HttpClient) {}

  // Listas
  getLists(): Observable<ListaEmail[]> {
    return this.http.get<ListaEmail[]>(`${this.apiUrl}/lists`);
  }

  createList(nome: string, descricao?: string): Observable<ListaEmail> {
    return this.http.post<ListaEmail>(`${this.apiUrl}/lists`, { nome, descricao });
  }

  updateList(id: number, nome: string, descricao?: string): Observable<ListaEmail> {
    return this.http.put<ListaEmail>(`${this.apiUrl}/lists/${id}`, { nome, descricao });
  }

  deleteList(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/lists/${id}`);
  }

  getListItens(listaId: number): Observable<ListaEmailItem[]> {
    return this.http.get<ListaEmailItem[]>(`${this.apiUrl}/lists/${listaId}/itens`);
  }

  addListItem(listaId: number, email: string, nome_opcional?: string): Observable<ListaEmailItem> {
    return this.http.post<ListaEmailItem>(`${this.apiUrl}/lists/${listaId}/itens`, {
      email,
      nome_opcional,
    });
  }

  removeListItem(listaId: number, itemId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/lists/${listaId}/itens/${itemId}`
    );
  }

  importCsv(listaId: number, file: File): Observable<{ adicionados: number; mensagem: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ adicionados: number; mensagem: string }>(
      `${this.apiUrl}/lists/${listaId}/import-csv`,
      formData
    );
  }

  importUsers(
    listaId: number,
    options?: { somente_ativos?: boolean; grupo_id?: number | null; user_ids?: number[] }
  ): Observable<{
    adicionados: number;
    ignorados_duplicados: number;
    total_usuarios: number;
    mensagem: string;
  }> {
    return this.http.post<{
      adicionados: number;
      ignorados_duplicados: number;
      total_usuarios: number;
      mensagem: string;
    }>(`${this.apiUrl}/lists/${listaId}/import-users`, options || {});
  }

  // Templates
  getTemplates(): Observable<TemplateEmail[]> {
    return this.http.get<TemplateEmail[]>(`${this.apiUrl}/templates`);
  }

  getTemplate(id: number): Observable<TemplateEmail> {
    return this.http.get<TemplateEmail>(`${this.apiUrl}/templates/${id}`);
  }

  createTemplate(nome: string, assunto: string, corpo_html: string, tipo_disparo?: string | null): Observable<TemplateEmail> {
    return this.http.post<TemplateEmail>(`${this.apiUrl}/templates`, {
      nome,
      assunto,
      corpo_html,
      tipo_disparo: tipo_disparo ?? null,
    });
  }

  updateTemplate(
    id: number,
    nome: string,
    assunto: string,
    corpo_html: string,
    tipo_disparo?: string | null
  ): Observable<TemplateEmail> {
    return this.http.put<TemplateEmail>(`${this.apiUrl}/templates/${id}`, {
      nome,
      assunto,
      corpo_html,
      tipo_disparo: tipo_disparo ?? null,
    });
  }

  deleteTemplate(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/templates/${id}`);
  }

  previewTemplate(templateId: number, partidaId?: number): Observable<PreviewTemplateResponse> {
    const url =
      partidaId != null
        ? `${this.apiUrl}/templates/${templateId}/preview?partidaId=${partidaId}`
        : `${this.apiUrl}/templates/${templateId}/preview`;
    return this.http.get<PreviewTemplateResponse>(url);
  }

  previewDraft(assunto: string, corpo_html: string, partidaId?: number): Observable<PreviewTemplateResponse> {
    return this.http.post<PreviewTemplateResponse>(`${this.apiUrl}/templates/preview-draft`, {
      assunto,
      corpo_html,
      partidaId,
    });
  }

  testTemplate(
    templateId: number,
    to: string,
    partidaId?: number
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/templates/${templateId}/test`,
      { to, partidaId }
    );
  }

  // Teste SMTP
  testSmtp(to: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/test`, { to });
  }

  // Log de disparos por partida (para quem foi enviado e status)
  getDisparosLog(partidaId: number, options?: { sort?: 'asc' | 'desc'; q?: string; limit?: number }): Observable<DisparoLogEntry[]> {
    const params = new URLSearchParams();
    if (options?.sort) params.set('sort', options.sort);
    if (options?.q && options.q.trim()) params.set('q', options.q.trim());
    if (typeof options?.limit === 'number' && Number.isFinite(options.limit)) params.set('limit', String(options.limit));
    const query = params.toString();
    const url = `${this.apiUrl}/partida/${partidaId}/disparos-log${query ? `?${query}` : ''}`;
    return this.http.get<DisparoLogEntry[]>(url);
  }

  // PDF lista de ganhadores (preview antes do envio em BID_ENCERRADO)
  getPdfGanhadores(partidaId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/partida/${partidaId}/pdf-ganhadores`, {
      responseType: 'blob',
    });
  }

  // Disparo: listaId opcional quando usarGrupo = true; emailsPersonalizados para envio personalizado; tipoDisparo para anexar PDF em BID_ENCERRADO
  send(
    partidaId: number,
    templateId: number,
    adminId?: number,
    options?: {
      listaId?: number | null;
      usarGrupo?: boolean;
      emailsPersonalizados?: string[];
      tipoDisparo?: 'BID_ABERTO' | 'BID_ENCERRADO' | 'GANHADORES';
    }
  ): Observable<SendEmailsResponse> {
    return this.http.post<SendEmailsResponse>(`${this.apiUrl}/send`, this.buildSendBody(partidaId, templateId, adminId, options));
  }

  /** Disparo com SSE — progresso em tempo real por destinatário. */
  async sendStream(
    partidaId: number,
    templateId: number,
    adminId?: number,
    options?: {
      listaId?: number | null;
      usarGrupo?: boolean;
      emailsPersonalizados?: string[];
      tipoDisparo?: 'BID_ABERTO' | 'BID_ENCERRADO' | 'GANHADORES';
    },
    callbacks?: SendStreamCallbacks
  ): Promise<SendEmailsResponse> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.apiUrl}/send-stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(this.buildSendBody(partidaId, templateId, adminId, options)),
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok && !contentType.includes('text/event-stream')) {
      if (contentType.includes('application/json')) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error((errBody as { error?: string }).error || 'Falha ao enviar e-mails.');
      }
      throw new Error('Falha ao enviar e-mails.');
    }
    if (!response.body) {
      throw new Error('Resposta de streaming indisponível.');
    }

    return this.parseSendStream(response.body, callbacks);
  }

  private buildSendBody(
    partidaId: number,
    templateId: number,
    adminId?: number,
    options?: {
      listaId?: number | null;
      usarGrupo?: boolean;
      emailsPersonalizados?: string[];
      tipoDisparo?: 'BID_ABERTO' | 'BID_ENCERRADO' | 'GANHADORES';
    }
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      partidaId,
      templateId,
      adminId,
    };
    if (options?.usarGrupo === true) {
      body['usarGrupo'] = true;
    } else if (options?.listaId != null) {
      body['listaId'] = options.listaId;
    }
    if (options?.emailsPersonalizados?.length) {
      body['emailsPersonalizados'] = options.emailsPersonalizados;
    }
    if (options?.tipoDisparo) {
      body['tipoDisparo'] = options.tipoDisparo;
    }
    return body;
  }

  private parseSseChunk(chunk: string, dispatch: (event: string, data: unknown) => void): void {
    if (!chunk.trim()) return;
    let event = 'message';
    let dataLine = '';
    for (const line of chunk.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLine = line.slice(5).trim();
    }
    if (dataLine) {
      try {
        dispatch(event, JSON.parse(dataLine));
      } catch {
        /* ignorar chunk malformado */
      }
    }
  }

  private drainSseBuffer(buffer: string, dispatch: (event: string, data: unknown) => void): string {
    const chunks = buffer.split('\n\n');
    const remainder = chunks.pop() || '';
    for (const chunk of chunks) {
      this.parseSseChunk(chunk, dispatch);
    }
    return remainder;
  }

  private async parseSendStream(
    body: ReadableStream<Uint8Array>,
    callbacks?: SendStreamCallbacks
  ): Promise<SendEmailsResponse> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const streamState: {
      result?: SendEmailsResponse;
      fatal?: SendStreamFatal;
      total?: number;
      destinatarios: DisparoDestinatario[];
    } = { destinatarios: [] };

    const dispatch = (event: string, data: unknown) => {
      switch (event) {
        case 'init': {
          const init = data as { total: number };
          streamState.total = init.total;
          callbacks?.onInit?.(init);
          break;
        }
        case 'progress': {
          const progress = data as SendStreamProgress;
          streamState.destinatarios.push({
            email: progress.email,
            status: progress.status,
            mensagem: progress.mensagem || undefined,
          });
          callbacks?.onProgress?.(progress);
          break;
        }
        case 'done': {
          const done = data as SendEmailsResponse;
          streamState.result = done;
          callbacks?.onDone?.(done);
          break;
        }
        case 'fatal': {
          const fatal = data as SendStreamFatal;
          streamState.fatal = fatal;
          if (fatal.destinatarios?.length) {
            streamState.destinatarios = fatal.destinatarios;
          }
          callbacks?.onFatal?.(fatal);
          break;
        }
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        buffer = this.drainSseBuffer(buffer, dispatch);
      }
      if (done) {
        buffer += decoder.decode(undefined, { stream: false });
        buffer = this.drainSseBuffer(buffer, dispatch);
        if (buffer.trim()) {
          this.parseSseChunk(buffer, dispatch);
        }
        break;
      }
    }

    if (streamState.result) return streamState.result;

    const fatal = streamState.fatal;
    if (fatal) {
      const err = new Error(fatal.error) as Error & {
        partial?: SendEmailsResponse;
      };
      err.partial = {
        enviados: fatal.enviados ?? 0,
        total: fatal.destinatarios?.length ?? streamState.total ?? fatal.enviados ?? 0,
        destinatarios: fatal.destinatarios ?? streamState.destinatarios,
      };
      throw err;
    }

    if (streamState.destinatarios.length > 0) {
      const enviados = streamState.destinatarios.filter((d) => d.status === 'enviado').length;
      const erros = streamState.destinatarios
        .filter((d) => d.status === 'erro')
        .map((d) => (d.mensagem ? `${d.email}: ${d.mensagem}` : d.email));
      const partial: SendEmailsResponse = {
        enviados,
        total: streamState.total ?? streamState.destinatarios.length,
        erros: erros.length > 0 ? erros : undefined,
        destinatarios: streamState.destinatarios,
      };
      const err = new Error('Conexão encerrada antes da conclusão do disparo.') as Error & {
        partial?: SendEmailsResponse;
      };
      err.partial = partial;
      throw err;
    }

    throw new Error('Conexão encerrada antes da conclusão do disparo.');
  }

  previewAreaIngressos(
    partidaIds: number[],
    eventoRhIds: number[],
    templateId: number
  ): Observable<PreviewAreaIngressosResponse> {
    return this.http.post<PreviewAreaIngressosResponse>(`${this.apiUrl}/area-ingressos/preview`, {
      partidaIds,
      eventoRhIds,
      templateId,
    });
  }

  /** Disparo consolidado para Área de Ingressos com SSE. */
  async sendAreaIngressosStream(
    partidaIds: number[],
    eventoRhIds: number[],
    templateId: number,
    adminId?: number,
    options?: {
      listaId?: number | null;
      emailsPersonalizados?: string[];
    },
    callbacks?: SendStreamCallbacks
  ): Promise<SendEmailsResponse> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const body: Record<string, unknown> = {
      partidaIds,
      eventoRhIds,
      templateId,
      adminId,
    };
    if (options?.listaId != null) {
      body['listaId'] = options.listaId;
    }
    if (options?.emailsPersonalizados?.length) {
      body['emailsPersonalizados'] = options.emailsPersonalizados;
    }

    const response = await fetch(`${this.apiUrl}/area-ingressos/send-stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok && !contentType.includes('text/event-stream')) {
      if (contentType.includes('application/json')) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error((errBody as { error?: string }).error || 'Falha ao enviar e-mails.');
      }
      throw new Error('Falha ao enviar e-mails.');
    }
    if (!response.body) {
      throw new Error('Resposta de streaming indisponível.');
    }

    return this.parseSendStream(response.body, callbacks);
  }
}
