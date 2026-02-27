import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ExportFieldConfig {
  key: string;
  label: string;
  order: number;
  enabled?: boolean;
}

export interface ExportPdfStyle {
  title: string;
  subtitleEventoLabel: string;
  subtitleGeradoLabel: string;
  fontFamily: 'helvetica' | 'times' | 'courier';
  fontSizeTitle: number;
  fontSizeSubtitle: number;
  colorTitle: string;
  colorSubtitle: string;
  colorTableHeader: string;
  colorTableAlt: string;
}

export const DEFAULT_EXPORT_PDF_STYLE: ExportPdfStyle = {
  title: 'Lista de Acesso (Concierge)',
  subtitleEventoLabel: 'Evento:',
  subtitleGeradoLabel: 'Gerado em:',
  fontFamily: 'helvetica',
  fontSizeTitle: 18,
  fontSizeSubtitle: 11,
  colorTitle: '#000000',
  colorSubtitle: '#666666',
  colorTableHeader: '#4f46e5',
  colorTableAlt: '#f9fafb',
};

const DEFAULT_LISTA_PORTARIA_FIELDS: ExportFieldConfig[] = [
  { key: 'titular_nome', label: 'Ganhador (Titular)', order: 1, enabled: true },
  { key: 'titular_setor', label: 'Setor', order: 2, enabled: true },
  { key: 'retirante_nome', label: 'Retirante Autorizado', order: 3, enabled: true },
  { key: 'retirante_cpf', label: 'CPF do Retirante', order: 4, enabled: true },
  { key: 'lance_pago', label: 'Lance Pago', order: 5, enabled: false },
  { key: 'assinatura', label: 'Assinatura', order: 6, enabled: true },
];

const DEFAULT_USUARIOS_FIELDS: ExportFieldConfig[] = [
  { key: 'nome', label: 'Nome', order: 1, enabled: true },
  { key: 'email', label: 'Email', order: 2, enabled: true },
  { key: 'empresa', label: 'Empresa', order: 3, enabled: true },
  { key: 'setor', label: 'Setor', order: 4, enabled: true },
  { key: 'grupo_apostas', label: 'Grupo Apostas', order: 5, enabled: true },
  { key: 'pontos', label: 'Pontos', order: 6, enabled: true },
  { key: 'status', label: 'Status', order: 7, enabled: true },
  { key: 'perfil', label: 'Perfil', order: 8, enabled: true },
];

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private apiUrl = `${environment.apiUri}/settings`;

  constructor(private http: HttpClient) {}

  getSettings(): Observable<Record<string, string>> {
    return this.http.get<Record<string, string>>(this.apiUrl);
  }

  /** Configurações de exportação (campos e timbrado) - acessível a qualquer utilizador autenticado. */
  getExportSettings(): Observable<Record<string, string>> {
    return this.http.get<Record<string, string>>(`${this.apiUrl}/export`);
  }

  updateSettings(settings: Record<string, string>, adminId?: number): Observable<{ message: string }> {
    const body = adminId != null ? { ...settings, adminId } : settings;
    return this.http.post<{ message: string }>(this.apiUrl, body);
  }

  uploadLetterhead(file: File, adminId?: number): Observable<{ path: string; message?: string }> {
    const form = new FormData();
    form.append('letterhead_file', file);
    if (adminId != null) form.append('adminId', String(adminId));
    return this.http.post<{ path: string; message?: string }>(`${this.apiUrl}/letterhead`, form);
  }

  getListaPortariaFields(): ExportFieldConfig[] {
    return [...DEFAULT_LISTA_PORTARIA_FIELDS];
  }

  getUsuariosFields(): ExportFieldConfig[] {
    return [...DEFAULT_USUARIOS_FIELDS];
  }

  parseListaPortariaFields(settings: Record<string, string> | null): ExportFieldConfig[] {
    const raw = settings?.['export_lista_portaria_fields'];
    if (!raw) return this.getListaPortariaFields();
    try {
      const parsed = JSON.parse(raw) as ExportFieldConfig[];
      if (Array.isArray(parsed) && parsed.length) {
        const defaults = this.getListaPortariaFields();
        const byKey = new Map(defaults.map((d) => [d.key, d]));
        return parsed
          .map((p) => ({
            ...byKey.get(p.key) ?? { key: p.key, label: p.label, order: p.order },
            ...p,
            enabled: p.enabled !== false,
          }))
          .sort((a, b) => a.order - b.order);
      }
    } catch {}
    return this.getListaPortariaFields();
  }

  parseUsuariosFields(settings: Record<string, string> | null): ExportFieldConfig[] {
    const raw = settings?.['export_usuarios_fields'];
    if (!raw) return this.getUsuariosFields();
    try {
      const parsed = JSON.parse(raw) as ExportFieldConfig[];
      if (Array.isArray(parsed) && parsed.length) {
        const defaults = this.getUsuariosFields();
        const byKey = new Map(defaults.map((d) => [d.key, d]));
        return parsed
          .map((p) => ({
            ...byKey.get(p.key) ?? { key: p.key, label: p.label, order: p.order },
            ...p,
            enabled: p.enabled !== false,
          }))
          .sort((a, b) => a.order - b.order);
      }
    } catch {}
    return this.getUsuariosFields();
  }

  getLetterheadUrl(settings: Record<string, string> | null): string | null {
    const path = settings?.['export_pdf_letterhead_path'];
    if (!path) return null;
    return `${environment.apiUri.replace(/\/api\/?$/, '')}/uploads/${path}`;
  }

  /** Obtém o ficheiro do papel timbrado via API (evita CORS e usa o mesmo auth). */
  getLetterheadBlob(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/letterhead`, { responseType: 'blob' });
  }

  useLetterhead(settings: Record<string, string> | null): boolean {
    return settings?.['export_pdf_use_letterhead'] === '1';
  }

  parseExportPdfStyle(settings: Record<string, string> | null): ExportPdfStyle {
    const raw = settings?.['export_pdf_style'];
    if (!raw) return { ...DEFAULT_EXPORT_PDF_STYLE };
    try {
      const parsed = JSON.parse(raw) as Partial<ExportPdfStyle>;
      return { ...DEFAULT_EXPORT_PDF_STYLE, ...parsed };
    } catch {
      return { ...DEFAULT_EXPORT_PDF_STYLE };
    }
  }

  /** Converte cor hex para [r, g, b] 0-255 para jsPDF. */
  hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace(/^#/, '');
    if (h.length !== 6 && h.length !== 3) return [0, 0, 0];
    const r = h.length === 6 ? parseInt(h.slice(0, 2), 16) : parseInt(h[0] + h[0], 16);
    const g = h.length === 6 ? parseInt(h.slice(2, 4), 16) : parseInt(h[1] + h[1], 16);
    const b = h.length === 6 ? parseInt(h.slice(4, 6), 16) : parseInt(h[2] + h[2], 16);
    return [isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b];
  }
}
