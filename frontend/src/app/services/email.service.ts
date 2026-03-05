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
  criado_em?: string;
  atualizado_em?: string;
}

export interface PreviewTemplateResponse {
  assunto: string;
  html: string;
}

export interface SendEmailsResponse {
  enviados: number;
  total: number;
  erros?: string[];
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

  createTemplate(nome: string, assunto: string, corpo_html: string): Observable<TemplateEmail> {
    return this.http.post<TemplateEmail>(`${this.apiUrl}/templates`, {
      nome,
      assunto,
      corpo_html,
    });
  }

  updateTemplate(
    id: number,
    nome: string,
    assunto: string,
    corpo_html: string
  ): Observable<TemplateEmail> {
    return this.http.put<TemplateEmail>(`${this.apiUrl}/templates/${id}`, {
      nome,
      assunto,
      corpo_html,
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
  getDisparosLog(partidaId: number): Observable<DisparoLogEntry[]> {
    return this.http.get<DisparoLogEntry[]>(`${this.apiUrl}/partida/${partidaId}/disparos-log`);
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
    return this.http.post<SendEmailsResponse>(`${this.apiUrl}/send`, body);
  }
}
