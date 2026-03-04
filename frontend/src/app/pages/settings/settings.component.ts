import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { SettingsService } from '../../services/settings.service';
import { EmailService, ListaEmail, ListaEmailItem, TemplateEmail } from '../../services/email.service';
import { MatchService } from '../../services/match.service';
import { environment } from '../../../environments/environment';
import { TenantsStatusComponent } from '../tenants-status/tenants-status.component';
import { SystemMonitorComponent } from '../system-monitor/system-monitor.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TenantsStatusComponent,
    SystemMonitorComponent,
  ],
  template: `
    <div class="container mx-auto p-4 md:p-6 bg-gray-50 min-h-screen">
      <div class="mb-8">
        <h2 class="text-3xl font-extrabold text-gray-800 tracking-tight">
          Configurações do Sistema
        </h2>
        <p class="text-sm text-gray-500 font-medium">
          Gerencie automações, regras de negócio e integrações.
        </p>
      </div>

      <div
        class="bg-white shadow-md rounded-2xl border border-gray-100 flex flex-col lg:flex-row overflow-hidden min-h-[600px]"
      >
        <div class="w-full lg:w-64 bg-gray-50 border-r border-gray-100 p-4 space-y-2 shrink-0">
          <button
            (click)="abaAtual = 'pontos'"
            [ngClass]="
              abaAtual === 'pontos'
                ? 'bg-indigo-100 text-indigo-700 font-bold'
                : 'text-gray-600 hover:bg-gray-100'
            "
            class="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-sm"
          >
            <span class="text-lg">💰</span> Regras de Pontos
          </button>
          <button
            (click)="abaAtual = 'email'; carregarSettings()"
            [ngClass]="
              abaAtual === 'email'
                ? 'bg-indigo-100 text-indigo-700 font-bold'
                : 'text-gray-600 hover:bg-gray-100'
            "
            class="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-sm"
          >
            <span class="text-lg">📧</span> Servidor SMTP
          </button>
          <button
            (click)="irAbaListasEmail()"
            [ngClass]="
              abaAtual === 'listas-email'
                ? 'bg-indigo-100 text-indigo-700 font-bold'
                : 'text-gray-600 hover:bg-gray-100'
            "
            class="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-sm"
          >
            <span class="text-lg">📋</span> Listas de e-mail
          </button>
          <button
            (click)="irAbaTemplatesEmail()"
            [ngClass]="
              abaAtual === 'templates-email'
                ? 'bg-indigo-100 text-indigo-700 font-bold'
                : 'text-gray-600 hover:bg-gray-100'
            "
            class="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-sm"
          >
            <span class="text-lg">✉️</span> Templates de e-mail
          </button>
          <button
            (click)="abaAtual = 'tenants-status'"
            [ngClass]="
              abaAtual === 'tenants-status'
                ? 'bg-indigo-100 text-indigo-700 font-bold'
                : 'text-gray-600 hover:bg-gray-100'
            "
            class="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-sm"
          >
            <span class="text-lg">🔗</span> Status Tenants Azure
          </button>
          <button
            (click)="abaAtual = 'monitor'"
            [ngClass]="
              abaAtual === 'monitor'
                ? 'bg-indigo-100 text-indigo-700 font-bold'
                : 'text-gray-600 hover:bg-gray-100'
            "
            class="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-sm"
          >
            <span class="text-lg">🚨</span> Monitor de Sistema
          </button>
        </div>

        <div class="p-6 md:p-8 flex-1 bg-white">
          <div *ngIf="loading" class="text-gray-400 animate-pulse font-bold text-center py-10">
            Carregando dados...
          </div>

          <div *ngIf="abaAtual === 'pontos' && !loading">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div>
                <h3 class="text-xl font-black text-gray-800">Automação de Pontos</h3>
                <p class="text-xs text-gray-500 mt-1">
                  Configure regras de ganho de pontos e aplique filtros específicos.
                </p>
              </div>
              <button
                (click)="abrirModalRegra()"
                class="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-5 rounded-xl shadow-md shadow-emerald-200 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
              >
                <span class="text-lg leading-none">+</span> Nova Regra
              </button>
            </div>

            <div
              *ngIf="rules.length === 0"
              class="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200"
            >
              <span class="text-5xl opacity-30 grayscale mb-3 block">🕰️</span>
              <h4 class="text-gray-600 font-bold">Nenhuma regra configurada</h4>
            </div>

            <div *ngIf="rules.length > 0" class="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div
                *ngFor="let rule of rules"
                class="bg-white p-5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between"
                [ngClass]="
                  rule.ativo
                    ? 'border-indigo-100 shadow-sm hover:shadow-md'
                    : 'border-gray-200 opacity-60 grayscale'
                "
              >
                <div
                  class="absolute top-0 left-0 bottom-0 w-1.5"
                  [ngClass]="rule.ativo ? 'bg-emerald-500' : 'bg-gray-300'"
                ></div>

                <div>
                  <div class="flex justify-between items-start mb-2 pl-2">
                    <div class="flex-1 pr-3">
                      <h4 class="font-black text-gray-800 text-sm leading-tight">
                        {{ rule.descricao }}
                      </h4>

                      <div class="mt-2 flex flex-wrap gap-1.5">
                        <span
                          *ngIf="!rule.grupo_id"
                          class="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 uppercase font-black tracking-wider flex items-center gap-1"
                          >🌍 Global</span
                        >
                        <span
                          *ngIf="rule.grupo_id"
                          class="text-[9px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100 uppercase font-black tracking-wider flex items-center gap-1"
                          >🎯 Grupo: {{ rule.grupo_nome }}</span
                        >

                        <span
                          *ngIf="rule.perfil_alvo"
                          class="text-[9px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-100 uppercase font-black tracking-wider flex items-center gap-1"
                          >👤 Perfil: {{ rule.perfil_alvo }}</span
                        >

                        <span
                          *ngIf="rule.setor_id"
                          class="text-[9px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-100 uppercase font-black tracking-wider flex items-center gap-1"
                          >🏢 Setor: {{ rule.setor_nome }}</span
                        >

                        <span
                          class="text-[9px] px-2 py-0.5 rounded border uppercase font-black tracking-wider flex items-center gap-1"
                          [ngClass]="
                            rule.somente_ativos
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          "
                        >
                          {{ rule.somente_ativos ? '✅ Somente Ativos' : '👁️ Todos Usuários' }}
                        </span>
                      </div>
                    </div>

                    <label class="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        [checked]="rule.ativo"
                        (change)="toggleStatus(rule)"
                        class="sr-only peer"
                      />
                      <div
                        class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"
                      ></div>
                    </label>
                  </div>
                </div>

                <div class="mt-4 pl-2 space-y-3">
                  <div
                    class="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center justify-between text-xs"
                  >
                    <div class="flex items-center gap-2 text-gray-700 font-bold">
                      <span class="text-indigo-600">+{{ rule.pontos }} pts</span>
                      <span class="text-gray-300">|</span>
                      <span class="font-medium"
                        >🔁 A cada {{ rule.frequencia_valor }} {{ rule.frequencia_tipo }}</span
                      >
                    </div>
                    <div class="flex gap-1">
                      <button
                        (click)="abrirModalRegra(rule)"
                        class="text-gray-400 hover:text-indigo-500 transition-colors p-1"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        (click)="deletarRegra(rule.id)"
                        class="text-gray-400 hover:text-rose-500 transition-colors p-1"
                        title="Apagar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div class="text-[9px] text-gray-400 flex justify-between items-center">
                    <span *ngIf="rule.ultima_execucao" title="Última Execução"
                      >Última: {{ rule.ultima_execucao | date: 'dd/MM HH:mm' }}</span
                    >
                    <span *ngIf="!rule.ultima_execucao">Nunca executada</span>
                    <span *ngIf="rule.ativo" class="text-indigo-400 font-bold"
                      >Próxima: {{ rule.proxima_execucao | date: 'dd/MM HH:mm' }}</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Aba: Servidor SMTP -->
          <div *ngIf="abaAtual === 'email' && !loading" class="space-y-6">
            <h3 class="text-xl font-black text-gray-800">Servidor SMTP</h3>
            <p class="text-sm text-gray-500">Configure o envio de e-mails (disparos e testes).</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Host SMTP (servidor, ex: smtp.office365.com)</label>
                <input [(ngModel)]="smtpHost" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="smtp.office365.com" />
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Porta</label>
                <input [(ngModel)]="smtpPort" type="number" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="587" />
              </div>
              <div class="md:col-span-2 flex items-center gap-2">
                <input [(ngModel)]="smtpSecure" type="checkbox" id="smtpSecure" class="rounded border-gray-300" />
                <label for="smtpSecure" class="text-sm font-medium text-gray-700">Usar TLS/SSL (porta 465)</label>
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Usuário</label>
                <input [(ngModel)]="smtpUser" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="user@dominio.com" />
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Senha</label>
                <input [(ngModel)]="smtpPass" type="password" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="••••••••" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail remetente (From)</label>
                <input [(ngModel)]="smtpFrom" type="email" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="noreply@dominio.com" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">URL base da aplicação (opcional)</label>
                <input [(ngModel)]="appBaseUrl" type="url" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="https://app.seudominio.com" />
              </div>
            </div>
            <div class="flex flex-wrap gap-3">
              <button (click)="salvarSmtp()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl shadow">
                Guardar configurações SMTP
              </button>
              <button (click)="testarEnvioSmtp()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl shadow" title="Enviar e-mail de teste para validar a configuração">
                ✉ Testar envio de e-mail
              </button>
            </div>
          </div>

          <!-- Aba: Listas de e-mail -->
          <div *ngIf="abaAtual === 'listas-email' && !loading" class="space-y-4">
            <div class="flex justify-between items-center">
              <div>
                <h3 class="text-xl font-black text-gray-800">Listas de e-mail</h3>
                <p class="text-sm text-gray-500">Crie listas de destinatários para disparos.</p>
              </div>
              <button (click)="novaLista()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-sm">+ Nova lista</button>
            </div>
            <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div *ngIf="listasLoading" class="p-6 text-center text-gray-500">A carregar...</div>
              <div *ngIf="!listasLoading && listas.length === 0" class="p-6 text-center text-gray-400">Nenhuma lista. Crie uma nova lista.</div>
              <table *ngIf="!listasLoading && listas.length > 0" class="min-w-full text-sm">
                <thead class="bg-gray-50 text-gray-500 uppercase font-bold text-xs">
                  <tr><th class="px-4 py-3 text-left">Nome</th><th class="px-4 py-3 text-left">Descrição</th><th class="px-4 py-3 text-right">Ações</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr *ngFor="let lista of listas" class="hover:bg-gray-50">
                    <td class="px-4 py-3 font-medium text-gray-900">{{ lista.nome }}</td>
                    <td class="px-4 py-3 text-gray-600">{{ lista.descricao || '—' }}</td>
                    <td class="px-4 py-3 text-right">
                      <button (click)="abrirItens(lista)" class="mr-2 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-bold hover:bg-indigo-100">E-mails</button>
                      <button (click)="editarLista(lista)" class="mr-2 p-1.5 bg-gray-100 rounded hover:bg-gray-200" title="Editar">✏️</button>
                      <button (click)="excluirLista(lista)" class="p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100" title="Excluir">🗑️</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Aba: Templates de e-mail -->
          <div *ngIf="abaAtual === 'templates-email' && !loading" class="space-y-4">
            <div class="flex justify-between items-center">
              <div>
                <h3 class="text-xl font-black text-gray-800">Templates de e-mail</h3>
                <p class="text-sm text-gray-500">Modelos HTML para disparos com tags de evento e usuário.</p>
              </div>
              <button (click)="novoTemplate()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-sm">+ Novo template</button>
            </div>
            <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div *ngIf="templatesLoading" class="p-6 text-center text-gray-500">A carregar...</div>
              <div *ngIf="!templatesLoading && templates.length === 0" class="p-6 text-center text-gray-400">Nenhum template. Crie um novo template.</div>
              <table *ngIf="!templatesLoading && templates.length > 0" class="min-w-full text-sm">
                <thead class="bg-gray-50 text-gray-500 uppercase font-bold text-xs">
                  <tr><th class="px-4 py-3 text-left">Nome</th><th class="px-4 py-3 text-left">Assunto</th><th class="px-4 py-3 text-right">Ações</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr *ngFor="let t of templates" class="hover:bg-gray-50">
                    <td class="px-4 py-3 font-medium text-gray-900">{{ t.nome }}</td>
                    <td class="px-4 py-3 text-gray-600">{{ t.assunto }}</td>
                    <td class="px-4 py-3 text-right">
                      <button (click)="visualizarTemplate(t)" class="mr-2 px-2 py-1 bg-sky-50 text-sky-700 rounded text-xs font-bold hover:bg-sky-100" title="Visualizar">👁 Visualizar</button>
                      <button (click)="testeEnvioTemplate(t)" class="mr-2 px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs font-bold hover:bg-amber-100" title="Enviar e-mail de teste">✉ Teste</button>
                      <button (click)="editarTemplate(t)" class="mr-2 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-bold hover:bg-indigo-100">Editar</button>
                      <button (click)="clonarTemplate(t)" class="mr-2 px-2 py-1 bg-sky-50 text-sky-700 rounded text-xs font-bold hover:bg-sky-100" title="Clonar template">Clonar</button>
                      <button (click)="excluirTemplate(t)" class="p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100" title="Excluir">🗑️</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div *ngIf="abaAtual === 'tenants-status'">
            <app-tenants-status></app-tenants-status>
          </div>
          <div *ngIf="abaAtual === 'monitor'" class="max-h-[70vh] overflow-y-auto rounded-xl">
            <app-system-monitor></app-system-monitor>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  abaAtual = 'pontos';
  loading = true;
  apiUrl = `${environment.apiUri}/points-rules`;

  rules: any[] = [];
  grupos: any[] = [];
  setores: any[] = [];
  currentUser: any = {};

  smtpHost = '';
  smtpPort = 587;
  smtpSecure = false;
  smtpUser = '';
  smtpPass = '';
  smtpFrom = '';
  appBaseUrl = '';

  listas: ListaEmail[] = [];
  templates: TemplateEmail[] = [];
  listasLoading = false;
  templatesLoading = false;

  constructor(
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private settingsService: SettingsService,
    private emailService: EmailService,
    private matchService: MatchService,
  ) {}

  ngOnInit() {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.carregarGrupos();
    this.carregarSetores();
    this.carregarRegras();
    this.route.queryParams.subscribe((params) => {
      const aba = params['aba'];
      if (
        aba === 'email' ||
        aba === 'listas-email' ||
        aba === 'templates-email' ||
        aba === 'pontos' ||
        aba === 'tenants-status' ||
        aba === 'monitor'
      ) {
        this.abaAtual = aba;
        if (aba === 'email') this.carregarSettings();
        if (aba === 'listas-email') this.loadListas();
        if (aba === 'templates-email') this.loadTemplates();
      }
    });
  }

  carregarSettings() {
    this.settingsService.getSettings().subscribe({
      next: (settings) => {
        this.smtpHost = settings['smtp_host'] ?? '';
        this.smtpPort = parseInt(settings['smtp_port'] ?? '587', 10) || 587;
        this.smtpSecure = settings['smtp_secure'] === '1' || settings['smtp_secure'] === 'true';
        this.smtpUser = settings['smtp_user'] ?? '';
        this.smtpPass = settings['smtp_pass'] ?? '';
        this.smtpFrom = settings['smtp_from'] ?? '';
        this.appBaseUrl = settings['app_base_url'] ?? '';
        this.cd.detectChanges();
      },
    });
  }

  salvarSmtp() {
    const host = (this.smtpHost || '').trim();
    if (host && host.includes('@')) {
      Swal.fire({
        icon: 'error',
        title: 'Host SMTP inválido',
        text: 'O campo "Host SMTP" deve ser o endereço do servidor (ex: smtp.office365.com), não um e-mail. O e-mail do remetente vai no campo "E-mail remetente (From)".',
      });
      return;
    }
    const payload: Record<string, string> = {
      smtp_host: this.smtpHost,
      smtp_port: String(this.smtpPort),
      smtp_secure: this.smtpSecure ? '1' : '0',
      smtp_user: this.smtpUser,
      smtp_pass: this.smtpPass,
      smtp_from: this.smtpFrom,
      app_base_url: this.appBaseUrl,
    };
    this.settingsService.updateSettings(payload, this.currentUser?.id).subscribe({
      next: () => Swal.fire({ icon: 'success', title: 'Configurações SMTP guardadas.', timer: 1500, showConfirmButton: false }),
      error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao guardar.', 'error'),
    });
  }

  testarEnvioSmtp() {
    Swal.fire({
      title: 'Testar envio de e-mail',
      text: 'Digite o endereço que receberá o e-mail de teste.',
      input: 'email',
      inputPlaceholder: 'email@exemplo.com',
      inputValidator: (value) => (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Indique um e-mail válido.' : null),
      showCancelButton: true,
      confirmButtonText: 'Enviar teste',
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.emailService.testSmtp(result.value).subscribe({
          next: (res) => Swal.fire({ icon: 'success', title: 'E-mail de teste enviado!', text: res?.message || `Enviado para ${result.value}` }),
          error: (err) => Swal.fire('Erro', err.error?.error || err.error?.message || 'Falha ao enviar o e-mail de teste.', 'error'),
        });
      }
    });
  }

  irAbaListasEmail() {
    this.abaAtual = 'listas-email';
    this.loadListas();
  }

  irAbaTemplatesEmail() {
    this.abaAtual = 'templates-email';
    this.loadTemplates();
  }

  loadListas() {
    this.listasLoading = true;
    this.emailService.getLists().subscribe({
      next: (data) => {
        this.listas = data;
        this.listasLoading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.listasLoading = false;
        this.cd.detectChanges();
      },
    });
  }

  loadTemplates() {
    this.templatesLoading = true;
    this.emailService.getTemplates().subscribe({
      next: (data) => {
        this.templates = data;
        this.templatesLoading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.templatesLoading = false;
        this.cd.detectChanges();
      },
    });
  }

  async novaLista() {
    const { value } = await Swal.fire({
      title: 'Nova lista de e-mail',
      html: `
        <div class="text-left">
          <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
          <input id="swal-nome" class="swal2-input w-full m-0 mb-3" placeholder="Ex: Colaboradores Geral">
          <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição (opcional)</label>
          <input id="swal-desc" class="swal2-input w-full m-0" placeholder="Descrição da lista">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Criar',
      confirmButtonColor: '#059669',
      preConfirm: () => {
        const nome = (document.getElementById('swal-nome') as HTMLInputElement)?.value?.trim();
        if (!nome) {
          Swal.showValidationMessage('Nome é obrigatório.');
          return null;
        }
        return {
          nome,
          descricao: (document.getElementById('swal-desc') as HTMLInputElement)?.value?.trim() || undefined,
        };
      },
    });
    if (value) {
      this.emailService.createList(value.nome, value.descricao).subscribe({
        next: () => {
          this.loadListas();
          Swal.fire({ icon: 'success', title: 'Lista criada.', timer: 1500, showConfirmButton: false });
        },
        error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao criar.', 'error'),
      });
    }
  }

  async editarLista(lista: ListaEmail) {
    const { value } = await Swal.fire({
      title: 'Editar lista',
      html: `
        <div class="text-left">
          <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
          <input id="edit-nome" class="swal2-input w-full m-0 mb-3" value="${lista.nome}">
          <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição (opcional)</label>
          <input id="edit-desc" class="swal2-input w-full m-0" value="${lista.descricao || ''}">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Salvar',
      confirmButtonColor: '#2563eb',
      preConfirm: () => {
        const nome = (document.getElementById('edit-nome') as HTMLInputElement)?.value?.trim();
        if (!nome) {
          Swal.showValidationMessage('Nome é obrigatório.');
          return null;
        }
        return {
          nome,
          descricao: (document.getElementById('edit-desc') as HTMLInputElement)?.value?.trim() || undefined,
        };
      },
    });
    if (value) {
      this.emailService.updateList(lista.id, value.nome, value.descricao).subscribe({
        next: () => {
          this.loadListas();
          Swal.fire({ icon: 'success', title: 'Lista atualizada.', timer: 1500, showConfirmButton: false });
        },
        error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao atualizar.', 'error'),
      });
    }
  }

  async excluirLista(lista: ListaEmail) {
    const { isConfirmed } = await Swal.fire({
      title: 'Excluir lista?',
      text: `"${lista.nome}" será excluída permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
    });
    if (isConfirmed) {
      this.emailService.deleteList(lista.id).subscribe({
        next: () => {
          this.loadListas();
          Swal.fire({ icon: 'success', title: 'Lista excluída.', timer: 1500, showConfirmButton: false });
        },
        error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao excluir.', 'error'),
      });
    }
  }

  abrirItens(lista: ListaEmail) {
    let itens: ListaEmailItem[] = [];
    this.emailService.getListItens(lista.id).subscribe({
      next: (data) => {
        itens = data;
        this.mostrarModalItens(lista, itens);
      },
      error: () => Swal.fire('Erro', 'Falha ao carregar e-mails.', 'error'),
    });
  }

  private mostrarModalItens(lista: ListaEmail, itens: ListaEmailItem[]) {
    const listHtml = itens.length
      ? itens
          .map(
            (i) => `
          <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <span class="text-sm text-gray-800">${i.email}</span>
            <span class="text-xs text-gray-500">${i.nome_opcional || '—'}</span>
            <button type="button" data-remove-id="${i.id}" class="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs">Remover</button>
          </div>
        `
          )
          .join('')
      : '<p class="text-gray-400 text-sm py-2">Nenhum e-mail na lista.</p>';

    Swal.fire({
      title: `E-mails: ${lista.nome}`,
      html: `
        <div class="text-left max-h-80 overflow-y-auto mb-4">
          <div class="flex gap-2 mb-3">
            <input id="item-email" type="email" class="swal2-input flex-1 m-0 text-sm" placeholder="E-mail">
            <input id="item-nome" type="text" class="swal2-input flex-1 m-0 text-sm" placeholder="Nome (opcional)">
            <button type="button" id="btn-add-item" class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium">Adicionar</button>
          </div>
          <div id="itens-list" class="rounded-lg border border-gray-100 bg-gray-50/50 p-2">${listHtml}</div>
        </div>
      `,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Fechar',
      width: '560px',
      didOpen: () => {
        const container = Swal.getHtmlContainer();
        if (!container) return;
        const btnAdd = container.querySelector('#btn-add-item');
        const inputEmail = container.querySelector('#item-email') as HTMLInputElement;
        const inputNome = container.querySelector('#item-nome') as HTMLInputElement;
        const listEl = container.querySelector('#itens-list');

        const addItem = () => {
          const email = inputEmail?.value?.trim();
          if (!email) {
            Swal.fire('Atenção', 'Informe o e-mail.', 'warning');
            return;
          }
          this.emailService.addListItem(lista.id, email, inputNome?.value?.trim()).subscribe({
            next: (novo) => {
              itens.push(novo);
              const div = document.createElement('div');
              div.className = 'flex items-center justify-between py-2 border-b border-gray-100 last:border-0';
              div.innerHTML = `
                <span class="text-sm text-gray-800">${novo.email}</span>
                <span class="text-xs text-gray-500">${novo.nome_opcional || '—'}</span>
                <button type="button" data-remove-id="${novo.id}" class="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs">Remover</button>
              `;
              div.querySelector('[data-remove-id]')?.addEventListener('click', () => removeItem(novo.id));
              listEl?.appendChild(div);
              inputEmail!.value = '';
              if (inputNome) inputNome.value = '';
            },
            error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao adicionar.', 'error'),
          });
        };

        const removeItem = (itemId: number) => {
          this.emailService.removeListItem(lista.id, itemId).subscribe({
            next: () => {
              itens.splice(itens.findIndex((i) => i.id === itemId), 1);
              container.querySelectorAll(`[data-remove-id="${itemId}"]`).forEach((btn) => btn.closest('div')?.remove());
            },
            error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao remover.', 'error'),
          });
        };

        btnAdd?.addEventListener('click', addItem);
        container.querySelectorAll('[data-remove-id]').forEach((btn) => {
          btn.addEventListener('click', () => removeItem(Number((btn as HTMLElement).getAttribute('data-remove-id'))));
        });
      },
    });
  }

  novoTemplate() {
    this.router.navigate(['/settings/templates-email/new']);
  }

  editarTemplate(t: TemplateEmail) {
    this.router.navigate(['/settings/templates-email/edit', t.id]);
  }

  visualizarTemplate(t: TemplateEmail) {
    const userId = this.currentUser?.id;
    if (!userId) {
      Swal.fire('Aviso', 'Sessão inválida. Faça login novamente.', 'warning');
      return;
    }
    this.matchService.getMatches(userId, false).subscribe({
      next: (partidas) => {
        const inputOptions: { [key: string]: string } = { '': 'Nenhum (preview sem evento)' };
        partidas.forEach((p: any) => {
          inputOptions[p.id] = p.titulo || `Evento #${p.id}`;
        });
        Swal.fire({
          title: 'Visualizar template',
          text: 'Escolha um evento para preencher as tags (ex.: {{evento.titulo}}). Opcional.',
          input: 'select',
          inputOptions,
          inputPlaceholder: 'Selecionar evento',
          showCancelButton: true,
          confirmButtonText: 'Visualizar',
        }).then((result) => {
          if (result.isConfirmed) {
            const partidaId = result.value ? Number(result.value) : undefined;
            this.emailService.previewTemplate(t.id, partidaId).subscribe({
              next: (res) => {
                Swal.fire({
                  title: res.assunto || t.nome,
                  html: `<div class="text-left max-h-[60vh] overflow-auto border border-gray-200 rounded-lg p-4 bg-white">${res.html || ''}</div>`,
                  width: '700px',
                  showConfirmButton: true,
                  confirmButtonText: 'Fechar',
                });
              },
              error: (err) => Swal.fire('Erro', err.error?.error || 'Não foi possível carregar a pré-visualização.', 'error'),
            });
          }
        });
      },
      error: () => Swal.fire('Erro', 'Não foi possível carregar a lista de eventos.', 'error'),
    });
  }

  testeEnvioTemplate(t: TemplateEmail) {
    const userId = this.currentUser?.id;
    if (!userId) {
      Swal.fire('Aviso', 'Sessão inválida. Faça login novamente.', 'warning');
      return;
    }
    this.matchService.getMatches(userId, false).subscribe({
      next: (partidas) => {
        const inputOptions: { [key: string]: string } = { '': 'Nenhum (sem evento)' };
        partidas.forEach((p: any) => {
          inputOptions[p.id] = p.titulo || `Evento #${p.id}`;
        });
        Swal.fire({
          title: 'E-mail de teste',
          text: 'Escolha o evento para preencher as tags no e-mail (opcional).',
          input: 'select',
          inputOptions,
          inputPlaceholder: 'Selecionar evento',
          showCancelButton: true,
          confirmButtonText: 'Próximo',
        }).then((result) => {
          if (result.isDismissed) return;
          const partidaId = result.value ? Number(result.value) : undefined;
          Swal.fire({
            title: 'E-mail de destino',
            text: `Enviar o template "${t.nome}" para qual endereço?`,
            input: 'email',
            inputPlaceholder: 'email@exemplo.com',
            inputValidator: (value) => (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Indique um e-mail válido.' : null),
            showCancelButton: true,
            confirmButtonText: 'Enviar',
          }).then((result2) => {
            if (result2.isConfirmed && result2.value) {
              this.emailService.testTemplate(t.id, result2.value, partidaId).subscribe({
                next: () => Swal.fire({ icon: 'success', title: 'E-mail de teste enviado!', text: `Enviado para ${result2.value}` }),
                error: (err) => Swal.fire('Erro', err.error?.error || err.error?.message || 'Falha ao enviar o e-mail de teste.', 'error'),
              });
            }
          });
        });
      },
      error: () => Swal.fire('Erro', 'Não foi possível carregar a lista de eventos.', 'error'),
    });
  }

  clonarTemplate(t: TemplateEmail) {
    this.emailService.createTemplate(t.nome + ' (cópia)', t.assunto, t.corpo_html ?? '').subscribe({
      next: () => {
        this.loadTemplates();
        Swal.fire({ icon: 'success', title: 'Template clonado.', timer: 1500, showConfirmButton: false });
      },
      error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao clonar.', 'error'),
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
          this.loadTemplates();
          Swal.fire({ icon: 'success', title: 'Template excluído.', timer: 1500, showConfirmButton: false });
        },
        error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao excluir.', 'error'),
      });
    }
  }

  carregarRegras() {
    this.loading = true;
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (res) => {
        this.rules = res;
        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cd.detectChanges();
      },
    });
  }

carregarGrupos() {
    this.http.get<any[]>(`${environment.apiUri}/groups`).subscribe({
      next: (res) => (this.grupos = res),
    });
  }

  carregarSetores() {
    this.http.get<any[]>(`${environment.apiUri}/sectors`).subscribe({
      next: (res) => (this.setores = res),
    });
  }

  toggleStatus(rule: any) {
    const novoStatus = !rule.ativo;
    this.http
      .put(`${this.apiUrl}/${rule.id}/toggle`, {
        ativo: novoStatus,
        adminId: this.currentUser.id,
      })
      .subscribe({
        next: () => {
          rule.ativo = novoStatus;
          if (novoStatus)
            Swal.fire({
              icon: 'success',
              title: 'Regra Reativada!',
              timer: 2000,
              showConfirmButton: false,
            });
          this.carregarRegras();
        },
        error: () => this.cd.detectChanges(),
      });
  }

  deletarRegra(id: number) {
    Swal.fire({
      title: 'Apagar regra?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sim, apagar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${this.apiUrl}/${id}?adminId=${this.currentUser.id}`).subscribe({
          next: () => {
            this.rules = this.rules.filter((r) => r.id !== id);
            this.cd.detectChanges();
          },
        });
      }
    });
  }

  async abrirModalRegra(regraExistente: any = null) {
    const isEdit = !!regraExistente;

    // Constrói Dropdowns
    let gruposHTML = `<option value="GLOBAL">🌍 Global: Todos os Grupos</option>`;
    this.grupos.forEach((g: any) => {
      const isSelected = regraExistente && regraExistente.grupo_id === g.id ? 'selected' : '';
      gruposHTML += `<option value="${g.id}" ${isSelected}>🎯 Grupo: ${g.nome}</option>`;
    });

    let setoresHTML = `<option value="">🏢 Todos os Setores</option>`;
    this.setores.forEach((s: any) => {
      const isSelected = regraExistente && regraExistente.setor_id === s.id ? 'selected' : '';
      setoresHTML += `<option value="${s.id}" ${isSelected}>🏢 ${s.nome} (${s.empresa_nome})</option>`;
    });

    const perfisHTML = `
      <option value="">👤 Todos os Perfis</option>
      <option value="USER" ${regraExistente && regraExistente.perfil_alvo === 'USER' ? 'selected' : ''}>👤 Apenas USER (Colaborador)</option>
      <option value="ADMIN" ${regraExistente && regraExistente.perfil_alvo === 'ADMIN' ? 'selected' : ''}>⭐ Apenas ADMIN</option>
      <option value="PORTARIA" ${regraExistente && regraExistente.perfil_alvo === 'PORTARIA' ? 'selected' : ''}>🛡️ Apenas PORTARIA</option>
    `;

    const { value: formValues } = await Swal.fire({
      title: `<h3 class="text-xl font-black text-gray-800">${isEdit ? 'Editar Regra' : 'Nova Regra'}</h3>`,
      width: '600px',
      html: `
        <div class="text-left space-y-4 px-1 mt-4 font-sans">
            <div>
                <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Nome da Regra</label>
                <input id="swal-desc" value="${isEdit ? regraExistente.descricao : ''}" class="swal2-input !m-0 !mt-1 w-full text-sm rounded-lg" placeholder="Ex: Bônus de Participação">
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
                <div>
                    <label class="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">Pontos (+)</label>
                    <input id="swal-pontos" type="number" min="1" value="${isEdit ? regraExistente.pontos : 1}" class="swal2-input !m-0 !mt-1 w-full text-sm rounded-lg font-black text-indigo-600">
                </div>
                <div>
                    <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Status do Usuário</label>
                    <select id="swal-ativos" class="swal2-select !m-0 !mt-1 w-full text-sm rounded-lg border-gray-300">
                        <option value="1" ${isEdit && regraExistente.somente_ativos === 1 ? 'selected' : ''}>✅ Somente Ativos</option>
                        <option value="0" ${isEdit && regraExistente.somente_ativos === 0 ? 'selected' : ''}>👁️ Todos (Ativos e Inativos)</option>
                    </select>
                </div>
            </div>

            <div class="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3 mt-4">
              <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center border-b border-gray-200 pb-2">Filtros de Aplicação</p>
              
              <div>
                  <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Filtro por Grupo de Aposta</label>
                  <select id="swal-alvo" class="swal2-select !m-0 !mt-1 w-full text-sm rounded-lg border-gray-300">
                      ${gruposHTML}
                  </select>
              </div>
              <div class="grid grid-cols-2 gap-3">
                  <div>
                      <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Filtro por Perfil</label>
                      <select id="swal-perfil" class="swal2-select !m-0 !mt-1 w-full text-sm rounded-lg border-gray-300">
                          ${perfisHTML}
                      </select>
                  </div>
                  <div>
                      <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Filtro por Setor</label>
                      <select id="swal-setor" class="swal2-select !m-0 !mt-1 w-full text-sm rounded-lg border-gray-300">
                          ${setoresHTML}
                      </select>
                  </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
                <div>
                    <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Repetir a cada</label>
                    <input id="swal-freq-val" type="number" min="1" value="${isEdit ? regraExistente.frequencia_valor : 1}" class="swal2-input !m-0 !mt-1 w-full text-sm rounded-lg text-center">
                </div>
                <div>
                    <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Período</label>
                    <select id="swal-freq-tipo" class="swal2-select !m-0 !mt-1 w-full text-sm rounded-lg border-gray-300">
                        <option value="minutos" ${isEdit && regraExistente.frequencia_tipo === 'minutos' ? 'selected' : ''}>Minuto(s)</option>
                        <option value="horas" ${isEdit && regraExistente.frequencia_tipo === 'horas' ? 'selected' : ''}>Hora(s)</option>
                        <option value="dias" ${!isEdit || regraExistente.frequencia_tipo === 'dias' ? 'selected' : ''}>Dia(s)</option>
                        <option value="meses" ${isEdit && regraExistente.frequencia_tipo === 'meses' ? 'selected' : ''}>Mês(es)</option>
                    </select>
                </div>
            </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Salvar Regra',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      preConfirm: () => {
        const desc = (document.getElementById('swal-desc') as HTMLInputElement).value;
        const pontos = parseInt((document.getElementById('swal-pontos') as HTMLInputElement).value);
        const freqVal = parseInt(
          (document.getElementById('swal-freq-val') as HTMLInputElement).value,
        );

        if (!desc || isNaN(pontos) || isNaN(freqVal)) {
          Swal.showValidationMessage('Preencha os campos Nome, Pontos e Frequência.');
          return false;
        }

        return {
          descricao: desc,
          pontos: pontos,
          frequencia_valor: freqVal,
          frequencia_tipo: (document.getElementById('swal-freq-tipo') as HTMLSelectElement).value,
          grupo_id: (document.getElementById('swal-alvo') as HTMLSelectElement).value,
          perfil_alvo: (document.getElementById('swal-perfil') as HTMLSelectElement).value,
          setor_id: (document.getElementById('swal-setor') as HTMLSelectElement).value,
          somente_ativos: (document.getElementById('swal-ativos') as HTMLSelectElement).value,
          adminId: this.currentUser.id,
        };
      },
    });

    if (formValues) {
      const request = isEdit
        ? this.http.put(`${this.apiUrl}/${regraExistente.id}`, formValues)
        : this.http.post(this.apiUrl, formValues);

      request.subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Salvo com sucesso!',
            timer: 1500,
            showConfirmButton: false,
          });
          this.carregarRegras();
        },
        error: () => Swal.fire('Erro', 'Falha ao salvar a regra.', 'error'),
      });
    }
  }
}
