import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, EMPTY } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { EditorComponent } from '@tinymce/tinymce-angular';
import { EmailService, type TemplateEmail } from '../../services/email.service';
import { MatchService } from '../../services/match.service';
import Swal from 'sweetalert2';


const TAGS_TEMPLATE_EMAIL = [
  { tag: '{{evento.titulo}}', desc: 'Título do evento' },
  { tag: '{{evento.subtitulo}}', desc: 'Subtítulo do evento' },
  { tag: '{{evento.local}}', desc: 'Local' },
  { tag: '{{evento.data}}', desc: 'Data do evento' },
  { tag: '{{evento.data_dia}}', desc: 'Dia do evento (ex: 15)' },
  { tag: '{{evento.data_mes}}', desc: 'Mês do evento (ex: 03)' },
  { tag: '{{evento.data_hora}}', desc: 'Hora do evento (ex: 20:00)' },
  { tag: '{{evento.data_inicio_apostas}}', desc: 'Data início das apostas' },
  { tag: '{{evento.data_inicio_apostas_dia}}', desc: 'Dia início apostas (ex: 10)' },
  { tag: '{{evento.data_inicio_apostas_mes}}', desc: 'Mês início apostas (ex: 03)' },
  { tag: '{{evento.data_inicio_apostas_hora}}', desc: 'Hora início apostas (ex: 08:00)' },
  { tag: '{{evento.data_limite_aposta}}', desc: 'Data limite apostas' },
  { tag: '{{evento.data_limite_aposta_dia}}', desc: 'Dia limite apostas (ex: 14)' },
  { tag: '{{evento.data_limite_aposta_mes}}', desc: 'Mês limite apostas (ex: 03)' },
  { tag: '{{evento.data_limite_aposta_hora}}', desc: 'Hora limite apostas (ex: 18:00)' },
  { tag: '{{evento.data_apuracao}}', desc: 'Data de apuração' },
  { tag: '{{evento.data_apuracao_dia}}', desc: 'Dia apuração (ex: 16)' },
  { tag: '{{evento.data_apuracao_mes}}', desc: 'Mês apuração (ex: 03)' },
  { tag: '{{evento.data_apuracao_hora}}', desc: 'Hora apuração (ex: 12:00)' },
  { tag: '{{evento.quantidade_premios}}', desc: 'Quantidade de prêmios' },
  { tag: '{{evento.nome_grupo}}', desc: 'Nome do grupo' },
  { tag: '{{evento.setor_evento_nome}}', desc: 'Setor do evento' },
  { tag: '{{evento.imagem}}', desc: 'URL da imagem do evento' },
  { tag: '{{evento.informacoes_extras}}', desc: 'Informações extras do evento' },
  { tag: '{{evento.link_extra}}', desc: 'Link extra do evento' },
  { tag: '{{usuario.nome}}', desc: 'Nome do destinatário' },
  { tag: '{{usuario.email}}', desc: 'E-mail do destinatário' },
  { tag: '{{usuario.ingressos_ganhos}}', desc: 'Número de ingressos ganhos no evento' },
];

const TINYMCE_EDITOR_ID = 'email-template-tinymce';

@Component({
  selector: 'app-email-template-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, EditorComponent],
  templateUrl: './email-template-editor.component.html',
  styles: [
    ':host { display: block; height: 100%; min-height: 0; }',
    '.tinymce-editor-wrapper { flex: 1; min-height: 400px; display: block; }',
    '.tinymce-editor-wrapper editor { display: block; height: 100%; min-height: 400px; }',
  ],
})
export class EmailTemplateEditorComponent implements OnInit, OnDestroy {
  id: number | null = null;
  isEdit = false;
  nome = '';
  assunto = '';
  corpoHtml = '';
  loading = false;
  saving = false;
  partidas: { id: number; titulo: string }[] = [];
  partidaIdPreview: number | null = null;
  previewAssunto = '';
  previewHtml = '';
  showPreviewModal = false;

  private paramSub?: Subscription;

  readonly editorId = TINYMCE_EDITOR_ID;
  readonly tags = TAGS_TEMPLATE_EMAIL;
  readonly tinymceInit = {
    base_url: '/tinymce',
    suffix: '.min',
    plugins: 'lists link image table code charmap preview anchor searchreplace visualblocks fullscreen insertdatetime media table help wordcount',
    toolbar: 'undo redo | blocks | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | code | removeformat | help',
    toolbar_mode: 'wrap' as const,
    height: 480,
    content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; }',
    placeholder: 'Olá {{usuario.nome}}, escreva aqui o conteúdo do e-mail...',
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private emailService: EmailService,
    private matchService: MatchService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.loadPartidas();
    // Subscrever ao paramMap para garantir que o id seja lido quando a rota estiver ativa
    this.paramSub = this.route.paramMap
      .pipe(
        filter((params) => params.has('id')),
        switchMap((params) => {
          const idParam = params.get('id');
          const numId = idParam ? +idParam : NaN;
          if (!Number.isInteger(numId) || numId < 1) {
            this.id = null;
            this.isEdit = false;
            this.loading = false;
            this.cdr.markForCheck();
            return EMPTY;
          }
          this.id = numId;
          this.isEdit = true;
          this.loading = true;
          this.cdr.markForCheck();
          return this.emailService.getTemplate(numId);
        }),
      )
      .subscribe({
        next: (t) => {
          this.nome = t?.nome ?? '';
          this.assunto = t?.assunto ?? '';
          this.corpoHtml = (t as any)?.corpo_html ?? t?.corpo_html ?? '';
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          this.cdr.markForCheck();
          Swal.fire('Erro', err?.error?.error || 'Falha ao carregar template.', 'error').then(() => this.voltar());
        },
      });

    // Se não tem id na rota (novo template), garantir estado correto
    if (!this.route.snapshot.paramMap.has('id')) {
      this.id = null;
      this.isEdit = false;
    }
  }

  ngOnDestroy() {
    this.paramSub?.unsubscribe();
  }

  private loadPartidas() {
    const userId = JSON.parse(localStorage.getItem('currentUser') || '{}')?.id || 1;
    this.matchService.getMatches(userId, false).subscribe({
      next: (matches: any[]) => {
        this.partidas = matches.slice(0, 50).map((m) => ({ id: m.id, titulo: m.titulo || 'Sem título' }));
      },
    });
  }

  insertTag(tag: string) {
    const tinymce = (window as unknown as { tinymce?: { get: (id: string) => { insertContent: (html: string) => void } | null } }).tinymce;
    const ed = tinymce?.get(this.editorId);
    if (ed) {
      ed.insertContent(tag);
      this.cdr.markForCheck();
    }
  }

  abrirEditorHtml() {
    const textareaId = 'email-template-html-source';
    Swal.fire({
      title: 'Editar HTML diretamente',
      html: `<p class="text-left text-sm text-gray-600 mb-2">Edite o código HTML abaixo. As tags {{ '{{evento.xxx}}' }} e {{ '{{usuario.xxx}}' }} serão substituídas no envio.</p><textarea id="${textareaId}" class="w-full font-mono text-sm border border-gray-300 rounded-lg p-3 min-h-[320px]" style="min-height: 320px; width: 100%; box-sizing: border-box;"></textarea>`,
      width: '720px',
      showCancelButton: true,
      confirmButtonText: 'Aplicar',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const el = document.getElementById(textareaId) as HTMLTextAreaElement;
        if (el) el.value = this.corpoHtml ?? '';
      },
      preConfirm: () => {
        const el = document.getElementById(textareaId) as HTMLTextAreaElement;
        return el ? el.value : '';
      },
    }).then((result) => {
      if (result.isConfirmed && typeof result.value === 'string') {
        this.corpoHtml = result.value;
        const tinymce = (window as unknown as { tinymce?: { get: (id: string) => { setContent: (html: string) => void } | null } }).tinymce;
        const ed = tinymce?.get(this.editorId);
        if (ed) ed.setContent(this.corpoHtml);
        this.cdr.markForCheck();
      }
    });
  }

  preview() {
    if (!this.assunto.trim()) {
      Swal.fire('Atenção', 'Preencha o assunto para pré-visualizar.', 'warning');
      return;
    }
    this.saving = true;
    this.showPreviewModal = false;
    this.cdr.markForCheck();
    const corpo = this.corpoHtml ?? '';
    this.emailService.previewDraft(this.assunto, corpo, this.partidaIdPreview ?? undefined).subscribe({
      next: (res) => {
        this.previewAssunto = res?.assunto ?? '';
        this.previewHtml = res?.html ?? '';
        this.showPreviewModal = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        const msg = err?.error?.error || err?.message || 'Falha ao gerar pré-visualização.';
        Swal.fire('Erro', msg, 'error');
        this.cdr.markForCheck();
      },
    }).add(() => {
      this.saving = false;
      this.cdr.markForCheck();
    });
  }

  salvar() {
    if (!this.nome.trim() || !this.assunto.trim()) {
      Swal.fire('Atenção', 'Nome e assunto são obrigatórios.', 'warning');
      return;
    }
    this.saving = true;
    const onError = (err: any) => {
      const msg =
        err?.error?.error ||
        err?.error?.message ||
        err?.message ||
        (typeof err?.error === 'string' ? err.error : null) ||
        'Falha ao salvar template. Tente novamente.';
      Swal.fire('Erro ao salvar', msg, 'error');
    };
    if (this.isEdit && this.id != null) {
      this.emailService.updateTemplate(this.id, this.nome, this.assunto, this.corpoHtml).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Template atualizado.', timer: 1500, showConfirmButton: false });
          this.voltar();
        },
        error: onError,
      }).add(() => {
        this.saving = false;
      });
    } else {
      this.emailService.createTemplate(this.nome, this.assunto, this.corpoHtml).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Template criado.', timer: 1500, showConfirmButton: false });
          this.voltar();
        },
        error: onError,
      }).add(() => {
        this.saving = false;
      });
    }
  }

  voltar() {
    this.router.navigate(['/settings'], { queryParams: { aba: 'templates-email' } });
  }

  fecharModalPreview() {
    this.showPreviewModal = false;
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.showPreviewModal) this.fecharModalPreview();
  }

  get previewHtmlSafe(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.previewHtml || '');
  }
}
