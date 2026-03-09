import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { EmailService, TemplateEmail } from '../../services/email.service';
import { MatchService } from '../../services/match.service';
import Swal from 'sweetalert2';

const TAGS_DISPONIVEIS = [
  { tag: '{{evento.titulo}}', desc: 'Título do evento' },
  { tag: '{{evento.local}}', desc: 'Local' },
  { tag: '{{evento.data_jogo}}', desc: 'Data do jogo' },
  { tag: '{{evento.data_limite_aposta}}', desc: 'Data limite apostas' },
  { tag: '{{evento.data_apuracao}}', desc: 'Data de apuração' },
  { tag: '{{evento.quantidade_premios}}', desc: 'Quantidade de prêmios' },
  { tag: '{{evento.nome_grupo}}', desc: 'Nome do grupo' },
  { tag: '{{evento.setor_evento_nome}}', desc: 'Setor do evento' },
  { tag: '{{usuario.nome}}', desc: 'Nome do destinatário' },
  { tag: '{{usuario.email}}', desc: 'E-mail do destinatário' },
  { tag: '{{usuario.ingressos_ganhos}}', desc: 'Número de ingressos ganhos no evento' },
];

@Component({
  selector: 'app-email-templates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mx-auto p-4 md:p-6 bg-gray-50 min-h-screen">
      <div class="mb-8">
        <h2 class="text-3xl font-extrabold text-gray-800 tracking-tight">Templates de e-mail</h2>
        <p class="text-sm text-gray-500 font-medium">Crie templates HTML com tags de evento e usuário para disparos.</p>
      </div>

      <div class="flex justify-end mb-4">
        <button
          (click)="novoTemplate()"
          class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all active:scale-95"
        >
          + Novo template
        </button>
      </div>

      <div class="bg-white shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
        <div *ngIf="loading" class="p-8 text-center text-gray-500">Carregando templates...</div>
        <div *ngIf="!loading && templates.length === 0" class="p-8 text-center text-gray-400">
          Nenhum template cadastrado. Crie um novo template.
        </div>
        <table *ngIf="!loading && templates.length > 0" class="min-w-full text-left text-sm">
          <thead class="bg-gray-100 text-gray-500 uppercase font-bold text-xs">
            <tr>
              <th class="px-6 py-4">Nome</th>
              <th class="px-6 py-4">Assunto</th>
              <th class="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr *ngFor="let t of templates" class="hover:bg-gray-50">
              <td class="px-6 py-4 font-medium text-gray-900">{{ t.nome }}</td>
              <td class="px-6 py-4 text-gray-600">{{ t.assunto }}</td>
              <td class="px-6 py-4 text-right">
                <button
                  (click)="editarTemplate(t)"
                  class="mr-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100"
                >
                  Editar
                </button>
                <button
                  (click)="previewTemplate(t)"
                  class="mr-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200"
                >
                  Pré-visualizar
                </button>
                <button
                  (click)="clonarTemplate(t)"
                  class="mr-2 px-3 py-1.5 bg-sky-50 text-sky-700 rounded-lg text-xs font-bold hover:bg-sky-100"
                >
                  Clonar
                </button>
                <button
                  (click)="excluirTemplate(t)"
                  class="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100"
                  title="Excluir"
                >
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class EmailTemplatesComponent implements OnInit {
  templates: TemplateEmail[] = [];
  loading = false;

  constructor(
    private emailService: EmailService,
    private matchService: MatchService,
    private sanitizer: DomSanitizer,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    this.loading = true;
    this.emailService.getTemplates().subscribe({
      next: (data) => {
        this.templates = data;
        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cd.detectChanges();
      },
    });
  }

  async novoTemplate() {
    this.abrirEditor();
  }

  async editarTemplate(t: TemplateEmail) {
    this.abrirEditor(t);
  }

  private abrirEditor(t?: TemplateEmail) {
    const isEdit = !!t;
    const partidasOptions: { id: number; titulo: string }[] = [];
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.matchService.getMatches(user?.id || 1, false).subscribe({
      next: (matches: any[]) => {
        partidasOptions.push(...matches.slice(0, 50).map((m) => ({ id: m.id, titulo: m.titulo || 'Sem título' })));
        this.mostrarEditorModal(isEdit, t, partidasOptions);
      },
      error: () => this.mostrarEditorModal(isEdit, t, []),
    });
  }

  private mostrarEditorModal(isEdit: boolean, t?: TemplateEmail, partidasOptions: { id: number; titulo: string }[] = []) {
    const optionsHtml =
      partidasOptions.length > 0
        ? partidasOptions.map((p) => `<option value="${p.id}">${p.titulo}</option>`).join('')
        : '<option value="">— Sem evento —</option>';

    Swal.fire({
      title: isEdit ? 'Editar template' : 'Novo template',
      html: `
        <div class="text-left space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
            <input id="tpl-nome" class="swal2-input w-full m-0" value="${t?.nome || ''}" placeholder="Ex: Convite evento">
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Assunto</label>
            <input id="tpl-assunto" class="swal2-input w-full m-0" value="${t?.assunto || ''}" placeholder="Ex: Convite: {{evento.titulo}}">
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de disparo</label>
            <select id="tpl-tipo" class="swal2-input w-full m-0 text-sm">
              <option value="" ${!t?.tipo_disparo ? 'selected' : ''}>Qualquer</option>
              <option value="BID_ABERTO" ${t?.tipo_disparo === 'BID_ABERTO' ? 'selected' : ''}>Bid aberto</option>
              <option value="BID_ENCERRADO" ${t?.tipo_disparo === 'BID_ENCERRADO' ? 'selected' : ''}>Bid encerrado</option>
              <option value="GANHADORES" ${t?.tipo_disparo === 'GANHADORES' ? 'selected' : ''}>Ganhadores</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Corpo (HTML)</label>
            <textarea id="tpl-corpo" class="swal2-textarea w-full m-0 font-mono text-sm" rows="12" placeholder="<p>Olá {{usuario.nome}},</p><p>Evento: {{evento.titulo}}</p>">${(t?.corpo_html || '').replace(new RegExp('<' + '/textarea>', 'gi'), '<\\/textarea>')}</textarea>
          </div>
          <div class="border-t pt-3">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Tags disponíveis (copie e cole no assunto/corpo)</label>
            <div class="flex flex-wrap gap-2">
              ${TAGS_DISPONIVEIS.map(
                (x) =>
                  `<button type="button" class="tag-btn px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-mono" data-tag="${x.tag}" title="${x.desc}">${x.tag}</button>`
              ).join('')}
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Pré-visualizar com evento (opcional)</label>
            <select id="tpl-partida" class="swal2-input w-full m-0 text-sm">
              <option value="">Dados de exemplo</option>
              ${optionsHtml}
            </select>
          </div>
          <button type="button" id="btn-preview" class="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">Pré-visualizar agora</button>
        </div>
      `,
      width: '720px',
      showCancelButton: true,
      confirmButtonText: isEdit ? 'Salvar' : 'Criar',
      confirmButtonColor: '#059669',
      preConfirm: () => {
        const nome = (document.getElementById('tpl-nome') as HTMLInputElement)?.value?.trim();
        const assunto = (document.getElementById('tpl-assunto') as HTMLInputElement)?.value?.trim();
        const tipoEl = document.getElementById('tpl-tipo') as HTMLSelectElement | null;
        const tipo_disparo = tipoEl?.value?.trim() || null;
        let corpo = (document.getElementById('tpl-corpo') as HTMLTextAreaElement)?.value ?? '';
        corpo = corpo.replace(new RegExp('<\\\\/textarea>', 'gi'), '</' + 'textarea>');
        if (!nome || !assunto) {
          Swal.showValidationMessage('Nome e assunto são obrigatórios.');
          return null;
        }
        return { nome, assunto, corpo_html: corpo, tipo_disparo };
      },
      didOpen: () => {
        const container = Swal.getHtmlContainer();
        if (!container) return;
        container.querySelectorAll('.tag-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            const tag = (btn as HTMLElement).getAttribute('data-tag');
            const textarea = document.getElementById('tpl-corpo') as HTMLTextAreaElement;
            if (textarea && tag) {
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const text = textarea.value;
              textarea.value = text.slice(0, start) + tag + text.slice(end);
              textarea.selectionStart = textarea.selectionEnd = start + tag.length;
              textarea.focus();
            }
          });
        });
        container.querySelector('#btn-preview')?.addEventListener('click', () => {
          const partidaId = (document.getElementById('tpl-partida') as HTMLSelectElement)?.value;
          const templateId = t?.id;
          if (templateId) {
            this.emailService.previewTemplate(templateId, partidaId ? Number(partidaId) : undefined).subscribe({
              next: (res) => this.mostrarPreview(res.assunto, res.html),
              error: () => Swal.fire('Erro', 'Falha ao gerar pré-visualização.', 'error'),
            });
          } else {
            Swal.fire('Atenção', 'Salve o template primeiro para pré-visualizar com dados reais.', 'info');
          }
        });
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const { nome, assunto, corpo_html, tipo_disparo } = result.value;
        if (isEdit && t) {
          this.emailService.updateTemplate(t.id, nome, assunto, corpo_html, tipo_disparo ?? undefined).subscribe({
            next: () => {
              this.carregar();
              Swal.fire({ icon: 'success', title: 'Template atualizado.', timer: 1500, showConfirmButton: false });
            },
            error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao atualizar.', 'error'),
          });
        } else {
          this.emailService.createTemplate(nome, assunto, corpo_html, tipo_disparo ?? undefined).subscribe({
            next: () => {
              this.carregar();
              Swal.fire({ icon: 'success', title: 'Template criado.', timer: 1500, showConfirmButton: false });
            },
            error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao criar.', 'error'),
          });
        }
      }
    });
  }

  private mostrarPreview(assunto: string, html: string) {
    const escapedAssunto = assunto.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    Swal.fire({
      title: assunto.slice(0, 60) + (assunto.length > 60 ? '…' : ''),
      html: `
        <div class="text-left">
          <p class="text-xs text-gray-500 mb-2">Assunto: <strong id="preview-assunto">${escapedAssunto}</strong></p>
          <div id="preview-body" class="border border-gray-200 rounded-lg p-4 bg-white max-h-96 overflow-auto text-sm"></div>
        </div>
      `,
      width: '640px',
      showConfirmButton: true,
      confirmButtonText: 'Fechar',
      didOpen: () => {
        const el = document.getElementById('preview-body');
        if (el) el.innerHTML = html;
      },
    });
  }

  clonarTemplate(t: TemplateEmail) {
    this.emailService.createTemplate(t.nome + ' (cópia)', t.assunto, t.corpo_html ?? '', t.tipo_disparo ?? undefined).subscribe({
      next: () => {
        this.carregar();
        Swal.fire({ icon: 'success', title: 'Template clonado.', timer: 1500, showConfirmButton: false });
      },
      error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao clonar.', 'error'),
    });
  }

  previewTemplate(t: TemplateEmail) {
    this.emailService.previewTemplate(t.id).subscribe({
      next: (res) => {
        const safe = this.sanitizer.bypassSecurityTrustHtml(res.html);
        Swal.fire({
          title: res.assunto,
          html: `<div class="text-left border border-gray-200 rounded-lg p-4 bg-white max-h-96 overflow-auto text-sm" id="preview-body"></div>`,
          width: '640px',
          showConfirmButton: true,
          confirmButtonText: 'Fechar',
          didOpen: () => {
            const el = document.getElementById('preview-body');
            if (el) el.innerHTML = res.html;
          },
        });
      },
      error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao carregar pré-visualização.', 'error'),
    });
  }

  async excluirTemplate(t: TemplateEmail) {
    const { isConfirmed } = await Swal.fire({
      title: 'Excluir template?',
      text: `"${t.nome}" será excluído permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
    });
    if (isConfirmed) {
      this.emailService.deleteTemplate(t.id).subscribe({
        next: () => {
          this.templates = this.templates.filter((x) => x.id !== t.id);
          this.cd.detectChanges();
          Swal.fire({ icon: 'success', title: 'Template excluído.', timer: 1500, showConfirmButton: false });
        },
        error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao excluir.', 'error'),
      });
    }
  }
}
