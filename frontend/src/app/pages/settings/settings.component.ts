import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { EditorComponent } from '@tinymce/tinymce-angular';
import { SettingsService } from '../../services/settings.service';
import { EmailService, ListaEmail, ListaEmailItem, TemplateEmail } from '../../services/email.service';
import { MatchService } from '../../services/match.service';
import { UserService } from '../../services/user.service';
import { environment } from '../../../environments/environment';
import { TenantsStatusComponent } from '../tenants-status/tenants-status.component';
import { SystemMonitorComponent } from '../system-monitor/system-monitor.component';
import {
  DEFAULT_LIMITE_INDICACAO_DIRECAO,
  DEFAULT_LIMITE_INDICACAO_HORAS,
  DirecaoLimiteIndicacao,
} from '../../utils/convidados-limite-indicacao';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EditorComponent,
    TenantsStatusComponent,
    SystemMonitorComponent,
  ],
  template: `
    <div class="container mx-auto p-4 md:p-6 bg-[var(--app-bg)] min-h-0">
      <div class="mb-8">
        <h2 class="text-3xl font-extrabold text-[var(--app-text)] tracking-tight">
          Configurações do Sistema
        </h2>
        <p class="text-sm text-[var(--app-text-muted)] font-medium">
          Gerencie automações, regras de negócio e integrações.
        </p>
      </div>

      <div
        class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--app-border)] flex flex-col lg:flex-row overflow-hidden min-h-[600px]"
      >
        <div class="w-full lg:w-64 bg-[var(--color-bg-surface-alt)] border-r border-[var(--app-border)] p-4 space-y-2 shrink-0">
          <button
            (click)="abaAtual = 'pontos'"
            [ngClass]="
              abaAtual === 'pontos'
                ? 'bg-indigo-100 text-indigo-700 font-bold'
                : 'text-[var(--app-text-muted)] hover:bg-[var(--app-nav-hover-bg)]'
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
                : 'text-[var(--app-text-muted)] hover:bg-[var(--app-nav-hover-bg)]'
            "
            class="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-sm"
          >
            <span class="text-lg">📧</span> Servidor SMTP
          </button>
          <button
            (click)="abaAtual = 'politica'; carregarSettings()"
            [ngClass]="
              abaAtual === 'politica'
                ? 'bg-indigo-100 text-indigo-700 font-bold'
                : 'text-[var(--app-text-muted)] hover:bg-[var(--app-nav-hover-bg)]'
            "
            class="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-sm"
          >
            <span class="text-lg">📜</span> Política de Acesso
          </button>
          <button
            (click)="abaAtual = 'wt-pass'; carregarWtPassSettings()"
            [ngClass]="
              abaAtual === 'wt-pass'
                ? 'bg-indigo-100 text-indigo-700 font-bold'
                : 'text-[var(--app-text-muted)] hover:bg-[var(--app-nav-hover-bg)]'
            "
            class="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-sm"
          >
            <span class="text-lg">🎫</span>
            <span>
              WT Pass
              <span class="block text-[10px] font-normal opacity-70">Política e bloqueio</span>
            </span>
          </button>
          <button
            (click)="abaAtual = 'convidados'; carregarGuestIndicationSettings()"
            [ngClass]="
              abaAtual === 'convidados'
                ? 'bg-indigo-100 text-indigo-700 font-bold'
                : 'text-[var(--app-text-muted)] hover:bg-[var(--app-nav-hover-bg)]'
            "
            class="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-sm"
          >
            <span class="text-lg">🎟️</span>
            <span>
              Convidados / Ingressos
              <span class="block text-[10px] font-normal opacity-70">Prazo de indicação</span>
            </span>
          </button>
          <button
            (click)="abaAtual = 'integracao-api'; carregarExternalApiSettings()"
            [ngClass]="
              abaAtual === 'integracao-api'
                ? 'bg-indigo-100 text-indigo-700 font-bold'
                : 'text-[var(--app-text-muted)] hover:bg-[var(--app-nav-hover-bg)]'
            "
            class="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-sm"
          >
            <span class="text-lg">🔌</span>
            <span>
              Integração API
              <span class="block text-[10px] font-normal opacity-70">BIDs e WT Pass</span>
            </span>
          </button>
          <button
            (click)="abaAtual = 'tenants-status'"
            [ngClass]="
              abaAtual === 'tenants-status'
                ? 'bg-indigo-100 text-indigo-700 font-bold'
                : 'text-[var(--app-text-muted)] hover:bg-[var(--app-nav-hover-bg)]'
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
                : 'text-[var(--app-text-muted)] hover:bg-[var(--app-nav-hover-bg)]'
            "
            class="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-sm"
          >
            <span class="text-lg">🚨</span> Monitor de Sistema
          </button>
        </div>

        <div class="p-6 md:p-8 flex-1 bg-[var(--color-bg-surface)]">
          <div *ngIf="loading" class="text-[var(--app-text-muted)] animate-pulse font-bold text-center py-10">
            Carregando dados...
          </div>

          <div *ngIf="abaAtual === 'pontos' && !loading">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div>
                <h3 class="text-xl font-black text-[var(--app-text)]">Automação de Pontos</h3>
                <p class="text-xs text-[var(--app-text-muted)] mt-1">
                  Configure regras de ganho de pontos e aplique filtros específicos.
                </p>
              </div>
              <button
                (click)="abrirModalRegra()"
                class="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-5 rounded-xl transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
              >
                <span class="text-lg leading-none">+</span> Nova Regra
              </button>
            </div>

            <div
              *ngIf="rules.length === 0"
              class="text-center py-16 bg-[var(--color-bg-surface-alt)] rounded-2xl border border-dashed border-[var(--app-border)]"
            >
              <span class="text-5xl opacity-30 grayscale mb-3 block">🕰️</span>
              <h4 class="text-[var(--app-text-muted)] font-bold">Nenhuma regra configurada</h4>
            </div>

            <div *ngIf="rules.length > 0" class="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div
                *ngFor="let rule of rules"
                class="bg-[var(--color-bg-surface)] p-5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between"
                [ngClass]="
                  rule.ativo
                    ? 'border-indigo-100'
                    : 'border-[var(--app-border)] opacity-60 grayscale'
                "
              >
                <div
                  class="absolute top-0 left-0 bottom-0 w-1.5"
                  [ngClass]="rule.ativo ? 'bg-emerald-500' : 'bg-gray-300'"
                ></div>

                <div>
                  <div class="flex justify-between items-start mb-2 pl-2">
                    <div class="flex-1 pr-3">
                      <h4 class="font-black text-[var(--app-text)] text-sm leading-tight">
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
                              : 'bg-[var(--color-bg-surface-alt)] text-[var(--app-text-muted)] border-[var(--app-border)]'
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
                    class="bg-[var(--color-bg-surface-alt)] rounded-xl p-3 border border-[var(--app-border)] flex items-center justify-between text-xs"
                  >
                    <div class="flex items-center gap-2 text-[var(--app-text)] font-bold">
                      <span class="text-indigo-600">+{{ rule.pontos }} pts</span>
                      <span class="text-[var(--app-text-muted)]">|</span>
                      <span class="font-medium"
                        >🔁 A cada {{ rule.frequencia_valor }} {{ rule.frequencia_tipo }}</span
                      >
                    </div>
                    <div class="flex gap-1">
                      <button
                        (click)="abrirModalRegra(rule)"
                        class="text-[var(--app-text-muted)] hover:text-indigo-500 transition-colors p-1"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        (click)="deletarRegra(rule.id)"
                        class="text-[var(--app-text-muted)] hover:text-rose-500 transition-colors p-1"
                        title="Apagar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div class="text-[9px] text-[var(--app-text-muted)] flex justify-between items-center">
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

          <div *ngIf="abaAtual === 'politica' && !loading" class="space-y-5">
            <h3 class="text-xl font-black text-gray-800">Política de Acesso aos Lances</h3>
            <p class="text-sm text-gray-500">
              Você pode definir o conteúdo no editor abaixo ou enviar um PDF para ser usado como alternativa.
            </p>
            <div class="rounded-xl border border-gray-200 p-4 bg-gray-50 space-y-3">
              <label class="block text-xs font-bold text-gray-500 uppercase">
                PDF da política (alternativa ao conteúdo HTML)
              </label>
              <input
                type="file"
                accept="application/pdf"
                (change)="onBidPolicyPdfSelected($event)"
                class="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:text-indigo-700 file:font-bold hover:file:bg-indigo-200"
              />
              <div class="flex items-center gap-3">
                <button
                  (click)="uploadBidPolicyPdf()"
                  [disabled]="!bidPolicyPdfFile"
                  class="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg"
                >
                  Enviar PDF
                </button>
                <a
                  href="/politica-acesso"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                >
                  Abrir PDF atual
                </a>
              </div>
            </div>
            <div class="rounded-xl border border-gray-200 overflow-hidden">
              <editor
                [(ngModel)]="bidPolicyHtml"
                [init]="tinymceInit"
                licenseKey="gpl"
                outputFormat="html"
              ></editor>
            </div>
            <div class="flex items-center gap-3">
              <button
                (click)="salvarPolitica()"
                class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl shadow"
              >
                Guardar política
              </button>
              <a
                href="/politica-acesso"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
              >
                Abrir página da política
              </a>
            </div>
          </div>

          <div *ngIf="abaAtual === 'wt-pass' && !loading" class="space-y-6">
            <div class="space-y-5 border-b border-[var(--app-border)] pb-8">
              <h3 class="text-xl font-black text-[var(--app-text)]">Política de acesso WT Pass</h3>
              <p class="text-sm text-[var(--app-text-muted)]">
                Conteúdo apresentado aos utilizadores na página dedicada e no fluxo de inscrição nos eventos.
              </p>
              <div class="rounded-xl border border-[var(--app-border)] p-4 bg-[var(--color-bg-surface-alt)] space-y-3">
                <label class="block text-xs font-bold text-[var(--app-text-muted)] uppercase">
                  PDF da política (alternativa ao conteúdo HTML)
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  (change)="onWtPassPolicyPdfSelected($event)"
                  class="block w-full text-sm text-[var(--app-text)] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:text-indigo-700 file:font-bold hover:file:bg-indigo-200"
                />
                <div class="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    (click)="uploadWtPassPolicyPdf()"
                    [disabled]="!wtPassPolicyPdfFile"
                    class="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg"
                  >
                    Enviar PDF
                  </button>
                  <a
                    href="/politica-acesso-wt-pass"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-sm text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                  >
                    Abrir PDF / página atual
                  </a>
                </div>
              </div>
              <div class="rounded-xl border border-[var(--app-border)] overflow-hidden">
                <editor
                  [(ngModel)]="wtPassPolicyHtml"
                  [init]="tinymceInitWtPass"
                  licenseKey="gpl"
                  outputFormat="html"
                ></editor>
              </div>
              <div class="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  (click)="salvarPoliticaWtPass()"
                  class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl shadow"
                >
                  Guardar política WT Pass
                </button>
                <a
                  href="/politica-acesso-wt-pass"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                >
                  Abrir página da política WT Pass
                </a>
              </div>
            </div>

            <div
              class="rounded-xl border-2 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              [ngClass]="
                wtPassBloqueioHabilitado
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : 'border-[var(--app-border)] bg-[var(--color-bg-surface-alt)]'
              "
            >
              <div>
                <p class="text-sm font-black text-[var(--app-text)]">Bloqueio por faltas</p>
                <p class="text-xs text-[var(--app-text-muted)] mt-1 max-w-xl">
                  Ative para punir utilizadores que faltam aos eventos. Ao desativar e salvar, todos os
                  bloqueios em curso são libertados imediatamente.
                </p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer shrink-0 gap-3 self-start sm:self-center">
                <span
                  class="text-xs font-bold uppercase tracking-wide"
                  [class.text-emerald-700]="wtPassBloqueioHabilitado"
                  [class.text-[var(--app-text-muted)]]="!wtPassBloqueioHabilitado"
                >
                  {{ wtPassBloqueioHabilitado ? 'Ativo' : 'Desativado' }}
                </span>
                <input
                  type="checkbox"
                  [(ngModel)]="wtPassBloqueioHabilitado"
                  class="sr-only peer"
                />
                <div
                  class="w-11 h-6 bg-gray-200 rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 relative"
                ></div>
              </label>
            </div>

            <div>
              <h3 class="text-xl font-black text-[var(--app-text)]">Parâmetros do bloqueio</h3>
              <p class="text-xs text-[var(--app-text-muted)] mt-1">
                Configure o limite de faltas antes de aplicar bloqueio e a duração desse bloqueio em
                número de eventos novos publicados.
              </p>
            </div>

            <p
              *ngIf="!wtPassBloqueioHabilitado"
              class="text-xs text-[var(--app-text-muted)] rounded-xl border border-[var(--app-border)] bg-[var(--color-bg-surface-alt)] px-4 py-3"
            >
              Com o bloqueio desativado, nenhuma penalidade nova será aplicada e todos os utilizadores
              com bloqueio ativo serão libertados ao salvar.
            </p>

            <div
              class="grid grid-cols-1 md:grid-cols-2 gap-4"
              [class.opacity-50]="!wtPassBloqueioHabilitado"
            >
              <div class="bg-[var(--color-bg-surface-alt)] border border-[var(--app-border)] rounded-xl p-4">
                <label
                  for="wt-pass-faltas"
                  class="block text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-wide mb-2"
                >
                  Faltas permitidas antes do bloqueio
                </label>
                <input
                  id="wt-pass-faltas"
                  type="number"
                  min="1"
                  step="1"
                  [(ngModel)]="wtPassFaltasPermitidas"
                  [disabled]="!wtPassBloqueioHabilitado"
                  class="w-full h-11 rounded-xl border border-[var(--app-border)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--app-text)] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-shadow disabled:cursor-not-allowed"
                />
                <p class="text-[11px] text-[var(--app-text-muted)] mt-2">
                  Total de faltas acumuladas que o usuário pode ter antes de ser bloqueado.
                </p>
              </div>
              <div class="bg-[var(--color-bg-surface-alt)] border border-[var(--app-border)] rounded-xl p-4">
                <label
                  for="wt-pass-eventos"
                  class="block text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-wide mb-2"
                >
                  Duração do bloqueio (em eventos)
                </label>
                <input
                  id="wt-pass-eventos"
                  type="number"
                  min="1"
                  step="1"
                  [(ngModel)]="wtPassEventosBloqueio"
                  [disabled]="!wtPassBloqueioHabilitado"
                  class="w-full h-11 rounded-xl border border-[var(--app-border)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--app-text)] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-shadow disabled:cursor-not-allowed"
                />
                <p class="text-[11px] text-[var(--app-text-muted)] mt-2">
                  Quantos eventos novos precisam ser publicados para liberar o usuário punido.
                </p>
              </div>
            </div>

            <div
              *ngIf="wtPassBloqueioHabilitado"
              class="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-xs leading-relaxed"
            >
              Ao cumprir a penalidade, o contador de faltas do usuário é zerado automaticamente.
              Bloqueios já em andamento mantêm a duração com a qual foram criados; só novos bloqueios
              usarão os valores definidos aqui.
            </div>

            <div class="flex items-center justify-end gap-2">
              <button
                type="button"
                (click)="salvarWtPassSettings()"
                [disabled]="salvandoWtPass"
                class="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-5 py-3 rounded-xl text-xs uppercase tracking-wide transition-all"
              >
                {{ salvandoWtPass ? 'Salvando...' : 'Salvar configurações' }}
              </button>
            </div>
          </div>

          <div *ngIf="abaAtual === 'convidados' && !loading" class="space-y-6">
            <div>
              <h3 class="text-xl font-black text-[var(--app-text)]">Prazo de indicação de convidados</h3>
              <p class="text-xs text-[var(--app-text-muted)] mt-1 max-w-2xl">
                Define até quando os ganhadores podem indicar retirantes, com base no início do evento
                (<strong>data e hora do jogo</strong>). Exemplo: evento às 18:00 com
                <strong>2 horas depois</strong> → indicação permitida até 20:00 do mesmo dia.
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <div class="bg-[var(--color-bg-surface-alt)] border border-[var(--app-border)] rounded-xl p-4">
                <label for="convidados-horas" class="block text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-wide mb-2">Horas</label>
                <input id="convidados-horas" type="number" min="0" max="720" step="1" [(ngModel)]="convidadosLimiteIndicacaoHoras" class="w-full h-11 rounded-xl border border-[var(--app-border)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--app-text)] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-shadow" />
                <p class="text-[11px] text-[var(--app-text-muted)] mt-2">Quantidade de horas de offset em relação ao início do evento (0 a 720).</p>
              </div>
              <div class="bg-[var(--color-bg-surface-alt)] border border-[var(--app-border)] rounded-xl p-4">
                <label for="convidados-direcao" class="block text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-wide mb-2">Direção</label>
                <select id="convidados-direcao" [(ngModel)]="convidadosLimiteIndicacaoDirecao" class="w-full h-11 rounded-xl border border-[var(--app-border)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--app-text)] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-shadow">
                  <option value="antes">Antes do início do evento</option>
                  <option value="depois">Depois do início do evento</option>
                </select>
                <p class="text-[11px] text-[var(--app-text-muted)] mt-2">«Antes» encerra antes do horário de início; «depois», após o início.</p>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2">
              <button type="button" (click)="salvarGuestIndicationSettings()" [disabled]="salvandoGuestIndication" class="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-5 py-3 rounded-xl text-xs uppercase tracking-wide transition-all">
                {{ salvandoGuestIndication ? 'Salvando...' : 'Salvar configurações' }}
              </button>
            </div>
          </div>

          <div *ngIf="abaAtual === 'integracao-api' && !loading" class="space-y-6">
            <div>
              <h3 class="text-xl font-black text-[var(--app-text)]">Integração API externa</h3>
              <p class="text-xs text-[var(--app-text-muted)] mt-1 max-w-2xl">
                Permite que outra aplicação consulte BIDs e WT Pass (abertos, encerrados e vencedores)
                via chave de API.
              </p>
            </div>

            <div
              class="rounded-xl border border-[var(--app-border)] p-4 bg-[var(--color-bg-surface-alt)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <p class="text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-wide">
                  API externa
                </p>
                <p
                  class="text-sm font-bold mt-1"
                  [class.text-emerald-700]="externalApiEnabled"
                  [class.text-[var(--app-text-muted)]]="!externalApiEnabled"
                >
                  {{ externalApiEnabled ? 'Ativa' : 'Desativada' }}
                </p>
              </div>
              <label class="inline-flex items-center gap-3 cursor-pointer">
                <span class="text-xs font-bold text-[var(--app-text-muted)] uppercase">Ativar</span>
                <input
                  type="checkbox"
                  [(ngModel)]="externalApiEnabled"
                  (change)="salvarExternalApiEnabled()"
                  [disabled]="salvandoExternalApi"
                  class="h-5 w-5 rounded border-[var(--app-border)] text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            </div>

            <div class="rounded-xl border border-[var(--app-border)] p-4 bg-[var(--color-bg-surface-alt)] space-y-4">
              <div>
                <label class="block text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-wide mb-2">
                  Chave de API
                </label>
                <div class="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    [value]="externalApiKeyDisplay"
                    readonly
                    class="flex-1 h-11 rounded-xl border border-[var(--app-border)] bg-[var(--color-bg-surface)] px-3 text-sm text-[var(--app-text)] font-mono"
                    placeholder="Nenhuma chave gerada"
                  />
                  <div class="flex gap-2 shrink-0">
                    <button
                      type="button"
                      (click)="copiarExternalApiKey()"
                      [disabled]="!externalApiKeyPlain && !externalApiHasKey"
                      class="h-11 px-4 rounded-xl border border-[var(--app-border)] bg-[var(--color-bg-surface)] text-xs font-bold uppercase tracking-wide hover:bg-[var(--app-nav-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Copiar
                    </button>
                    <button
                      type="button"
                      (click)="gerarExternalApiKey()"
                      [disabled]="salvandoExternalApi"
                      class="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold uppercase tracking-wide"
                    >
                      {{ salvandoExternalApi ? 'Gerando...' : 'Gerar nova chave' }}
                    </button>
                  </div>
                </div>
                <p class="text-[11px] text-[var(--app-text-muted)] mt-2">
                  A chave completa só é exibida no momento da geração. Guarde-a em local seguro.
                </p>
              </div>
            </div>

            <div class="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
              <h4 class="text-sm font-black text-indigo-900">Como consumir</h4>
              <div class="text-xs text-indigo-900/80 space-y-2 font-mono break-all">
                <p><strong>GET</strong> {{ integracaoApiUrl }}</p>
                <p><strong>Header:</strong> X-API-Key: &lt;sua-chave&gt;</p>
              </div>
              <p class="text-[11px] text-indigo-900/70 leading-relaxed">
                A resposta inclui <code class="text-[10px]">bids</code> e
                <code class="text-[10px]">wtpass</code>, cada um com listas
                <code class="text-[10px]">abertos</code>,
                <code class="text-[10px]">encerrados</code> e
                <code class="text-[10px]">vencedores</code>.
              </p>
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
  bidPolicyHtml = '';
  bidPolicyPdfFile: File | null = null;
  wtPassPolicyHtml = '';
  wtPassPolicyPdfFile: File | null = null;

  listas: ListaEmail[] = [];
  templates: TemplateEmail[] = [];
  listasLoading = false;
  templatesLoading = false;

  wtPassBloqueioHabilitado = true;
  wtPassFaltasPermitidas = 1;
  wtPassEventosBloqueio = 5;
  salvandoWtPass = false;

  convidadosLimiteIndicacaoHoras = DEFAULT_LIMITE_INDICACAO_HORAS;
  convidadosLimiteIndicacaoDirecao: DirecaoLimiteIndicacao = DEFAULT_LIMITE_INDICACAO_DIRECAO;
  salvandoGuestIndication = false;

  externalApiEnabled = false;
  externalApiKeyMasked = '';
  externalApiHasKey = false;
  externalApiKeyPlain = '';
  salvandoExternalApi = false;
  integracaoApiUrl = `${environment.apiUri}/integracao/eventos`;

  get externalApiKeyDisplay(): string {
    if (this.externalApiKeyPlain) return this.externalApiKeyPlain;
    return this.externalApiKeyMasked;
  }

  get tinymceInit(): Record<string, unknown> {
    return {
      base_url: '/tinymce',
      suffix: '.min',
      plugins:
        'lists link image table code charmap preview anchor searchreplace visualblocks fullscreen insertdatetime media table help wordcount',
      toolbar:
        'undo redo | blocks | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link | code | removeformat | help',
      toolbar_mode: 'wrap' as const,
      height: 420,
      placeholder: 'Descreva aqui a política de acesso aos lances...',
      content_style:
        'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; }',
    };
  }

  get tinymceInitWtPass(): Record<string, unknown> {
    return {
      ...this.tinymceInit,
      placeholder: 'Descreva aqui a política de acesso aos eventos WT Pass...',
    };
  }

  constructor(
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private settingsService: SettingsService,
    private emailService: EmailService,
    private matchService: MatchService,
    private userService: UserService,
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
        aba === 'politica' ||
        aba === 'pontos' ||
        aba === 'wt-pass' ||
        aba === 'convidados' ||
        aba === 'integracao-api' ||
        aba === 'tenants-status' ||
        aba === 'monitor'
      ) {
        this.abaAtual = aba;
        if (aba === 'email' || aba === 'politica') this.carregarSettings();
        if (aba === 'wt-pass') this.carregarWtPassSettings();
        if (aba === 'convidados') this.carregarGuestIndicationSettings();
        if (aba === 'integracao-api') this.carregarExternalApiSettings();
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
        this.bidPolicyHtml = settings['bid_policy_html'] ?? '';
        this.cd.detectChanges();
      },
    });
  }

  carregarWtPassSettings() {
    this.loading = true;
    forkJoin({
      cfg: this.settingsService.getWtPassSettings(),
      pol: this.settingsService.getWtPassPolicy(),
    }).subscribe({
      next: ({ cfg, pol }) => {
        this.wtPassBloqueioHabilitado = cfg?.wt_pass_bloqueio_habilitado !== false;
        this.wtPassFaltasPermitidas = Number(cfg?.wt_pass_faltas_permitidas) || 1;
        this.wtPassEventosBloqueio = Number(cfg?.wt_pass_eventos_bloqueio) || 5;
        this.wtPassPolicyHtml = pol?.html ?? '';
        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.loading = false;
        Swal.fire('Erro', 'Não foi possível carregar as configurações do WT Pass.', 'error');
      },
    });
  }


  carregarGuestIndicationSettings() {
    this.loading = true;
    this.settingsService.getGuestIndicationSettings().subscribe({
      next: (cfg) => {
        this.convidadosLimiteIndicacaoHoras =
          Number(cfg?.convidados_limite_indicacao_horas) || DEFAULT_LIMITE_INDICACAO_HORAS;
        this.convidadosLimiteIndicacaoDirecao =
          cfg?.convidados_limite_indicacao_direcao === 'depois' ? 'depois' : 'antes';
        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.loading = false;
        Swal.fire('Erro', 'Não foi possível carregar as configurações de convidados.', 'error');
      },
    });
  }

  salvarGuestIndicationSettings() {
    const horas = Math.floor(Number(this.convidadosLimiteIndicacaoHoras));
    if (!Number.isFinite(horas) || horas < 0 || horas > 720) {
      Swal.fire('Valores inválidos', 'Informe horas entre 0 e 720.', 'warning');
      return;
    }
    const direcao: DirecaoLimiteIndicacao =
      this.convidadosLimiteIndicacaoDirecao === 'depois' ? 'depois' : 'antes';
    this.salvandoGuestIndication = true;
    this.settingsService
      .updateGuestIndicationSettings(
        {
          convidados_limite_indicacao_horas: horas,
          convidados_limite_indicacao_direcao: direcao,
        },
        this.currentUser?.id,
      )
      .subscribe({
        next: (res) => {
          this.convidadosLimiteIndicacaoHoras =
            Number(res?.convidados_limite_indicacao_horas) || horas;
          this.convidadosLimiteIndicacaoDirecao =
            res?.convidados_limite_indicacao_direcao === 'depois' ? 'depois' : 'antes';
          this.salvandoGuestIndication = false;
          Swal.fire({
            icon: 'success',
            title: 'Configurações de convidados guardadas.',
            timer: 1500,
            showConfirmButton: false,
          });
        },
        error: (err) => {
          this.salvandoGuestIndication = false;
          Swal.fire('Erro', err.error?.error || 'Falha ao salvar configurações de convidados.', 'error');
        },
      });
  }

  carregarExternalApiSettings() {
    this.loading = true;
    this.settingsService.getExternalApiSettings().subscribe({
      next: (cfg) => {
        this.externalApiEnabled = cfg?.enabled === true;
        this.externalApiKeyMasked = cfg?.key_masked ?? '';
        this.externalApiHasKey = cfg?.has_key === true;
        this.externalApiKeyPlain = '';
        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.loading = false;
        Swal.fire('Erro', 'Não foi possível carregar as configurações da API externa.', 'error');
      },
    });
  }

  salvarExternalApiEnabled() {
    this.salvandoExternalApi = true;
    this.settingsService.updateExternalApiSettings(this.externalApiEnabled, this.currentUser?.id).subscribe({
      next: (res) => {
        this.externalApiEnabled = res?.enabled === true;
        this.salvandoExternalApi = false;
        Swal.fire({
          icon: 'success',
          title: res?.message || 'Configurações atualizadas.',
          timer: 1500,
          showConfirmButton: false,
        });
      },
      error: (err) => {
        this.salvandoExternalApi = false;
        Swal.fire('Erro', err.error?.error || 'Falha ao salvar configurações da API externa.', 'error');
        this.carregarExternalApiSettings();
      },
    });
  }

  gerarExternalApiKey() {
    Swal.fire({
      title: 'Gerar nova chave?',
      text: 'A chave anterior deixará de funcionar imediatamente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Gerar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.salvandoExternalApi = true;
      this.settingsService.regenerateExternalApiKey(this.currentUser?.id).subscribe({
        next: (res) => {
          this.externalApiEnabled = res?.enabled === true;
          this.externalApiKeyPlain = res?.api_key ?? '';
          this.externalApiKeyMasked = res?.key_masked ?? '';
          this.externalApiHasKey = res?.has_key === true;
          this.salvandoExternalApi = false;
          Swal.fire({
            icon: 'success',
            title: 'Nova chave gerada',
            html: `<p class="text-sm mb-3">Copie e guarde a chave agora. Ela não será exibida novamente.</p><code class="text-xs break-all">${res?.api_key ?? ''}</code>`,
            confirmButtonText: 'Entendi',
          });
          this.cd.detectChanges();
        },
        error: (err) => {
          this.salvandoExternalApi = false;
          Swal.fire('Erro', err.error?.error || 'Falha ao gerar chave de API.', 'error');
        },
      });
    });
  }

  copiarExternalApiKey() {
    const key = this.externalApiKeyPlain || this.externalApiKeyMasked;
    if (!key) {
      Swal.fire('Aviso', 'Gere uma chave antes de copiar.', 'info');
      return;
    }
    if (!this.externalApiKeyPlain) {
      Swal.fire(
        'Aviso',
        'Só é possível copiar a chave completa logo após a geração. Gere uma nova chave se necessário.',
        'info',
      );
      return;
    }
    navigator.clipboard
      .writeText(this.externalApiKeyPlain)
      .then(() => {
        Swal.fire({ icon: 'success', title: 'Chave copiada.', timer: 1200, showConfirmButton: false });
      })
      .catch(() => {
        Swal.fire('Erro', 'Não foi possível copiar a chave.', 'error');
      });
  }

  salvarWtPassSettings() {
    const habilitado = this.wtPassBloqueioHabilitado;
    const faltas = Math.floor(Number(this.wtPassFaltasPermitidas));
    const eventos = Math.floor(Number(this.wtPassEventosBloqueio));
    if (
      habilitado &&
      (!Number.isFinite(faltas) || faltas < 1 || !Number.isFinite(eventos) || eventos < 1)
    ) {
      Swal.fire(
        'Valores inválidos',
        'Informe números inteiros maiores ou iguais a 1 para faltas e duração.',
        'warning',
      );
      return;
    }
    this.salvandoWtPass = true;
    this.settingsService
      .updateWtPassSettings(
        {
          wt_pass_bloqueio_habilitado: habilitado,
          wt_pass_faltas_permitidas: Number.isFinite(faltas) && faltas >= 1 ? faltas : 1,
          wt_pass_eventos_bloqueio: Number.isFinite(eventos) && eventos >= 1 ? eventos : 5,
        },
        this.currentUser?.id,
      )
      .subscribe({
        next: (res) => {
          this.wtPassBloqueioHabilitado = res?.wt_pass_bloqueio_habilitado !== false;
          this.wtPassFaltasPermitidas = Number(res?.wt_pass_faltas_permitidas) || faltas;
          this.wtPassEventosBloqueio = Number(res?.wt_pass_eventos_bloqueio) || eventos;
          this.salvandoWtPass = false;
          const bloqueiosLiberados = res?.liberacao?.bloqueios_liberados ?? 0;
          const msg =
            !habilitado && bloqueiosLiberados > 0
              ? `Configurações salvas. ${bloqueiosLiberados} bloqueio(s) libertado(s).`
              : 'Configurações do WT Pass atualizadas.';
          Swal.fire('Salvo', msg, 'success');
        },
        error: (err: any) => {
          this.salvandoWtPass = false;
          Swal.fire('Erro', err?.error?.error || 'Falha ao salvar configurações.', 'error');
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

  salvarPolitica() {
    const payload: Record<string, string> = {
      bid_policy_html: this.bidPolicyHtml || '',
    };
    this.settingsService.updateSettings(payload, this.currentUser?.id).subscribe({
      next: () =>
        Swal.fire({
          icon: 'success',
          title: 'Política guardada com sucesso.',
          timer: 1500,
          showConfirmButton: false,
        }),
      error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao guardar política.', 'error'),
    });
  }

  onBidPolicyPdfSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) {
      this.bidPolicyPdfFile = null;
      return;
    }
    if (file.type !== 'application/pdf') {
      this.bidPolicyPdfFile = null;
      Swal.fire('Formato inválido', 'Selecione um arquivo PDF.', 'warning');
      return;
    }
    this.bidPolicyPdfFile = file;
  }

  uploadBidPolicyPdf() {
    if (!this.bidPolicyPdfFile) {
      Swal.fire('Atenção', 'Selecione um PDF para enviar.', 'warning');
      return;
    }
    this.settingsService.uploadBidPolicyPdf(this.bidPolicyPdfFile, this.currentUser?.id).subscribe({
      next: () => {
        this.bidPolicyPdfFile = null;
        Swal.fire({
          icon: 'success',
          title: 'PDF da política guardado com sucesso.',
          timer: 1500,
          showConfirmButton: false,
        });
      },
      error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao enviar PDF da política.', 'error'),
    });
  }

  salvarPoliticaWtPass() {
    const payload: Record<string, string> = {
      wt_pass_policy_html: this.wtPassPolicyHtml || '',
    };
    this.settingsService.updateSettings(payload, this.currentUser?.id).subscribe({
      next: () =>
        Swal.fire({
          icon: 'success',
          title: 'Política WT Pass guardada com sucesso.',
          timer: 1500,
          showConfirmButton: false,
        }),
      error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao guardar política WT Pass.', 'error'),
    });
  }

  onWtPassPolicyPdfSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) {
      this.wtPassPolicyPdfFile = null;
      return;
    }
    if (file.type !== 'application/pdf') {
      this.wtPassPolicyPdfFile = null;
      Swal.fire('Formato inválido', 'Selecione um arquivo PDF.', 'warning');
      return;
    }
    this.wtPassPolicyPdfFile = file;
  }

  uploadWtPassPolicyPdf() {
    if (!this.wtPassPolicyPdfFile) {
      Swal.fire('Atenção', 'Selecione um PDF para enviar.', 'warning');
      return;
    }
    this.settingsService.uploadWtPassPolicyPdf(this.wtPassPolicyPdfFile, this.currentUser?.id).subscribe({
      next: () => {
        this.wtPassPolicyPdfFile = null;
        Swal.fire({
          icon: 'success',
          title: 'PDF da política WT Pass guardado com sucesso.',
          timer: 1500,
          showConfirmButton: false,
        });
      },
      error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao enviar PDF da política WT Pass.', 'error'),
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
          <div class="mb-3">
            <button type="button" id="btn-importar-banco" class="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200">Importar do banco</button>
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
                <span class="text-sm text-gray-800">${(novo.email || '').replace(/</g, '&lt;')}</span>
                <span class="text-xs text-gray-500">${(novo.nome_opcional || '—').replace(/</g, '&lt;')}</span>
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

        const renderItensList = () => {
          if (!listEl) return;
          listEl.innerHTML = itens.length
            ? itens
                .map(
                  (i) => `
          <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <span class="text-sm text-gray-800">${(i.email || '').replace(/</g, '&lt;')}</span>
            <span class="text-xs text-gray-500">${(i.nome_opcional || '—').replace(/</g, '&lt;')}</span>
            <button type="button" data-remove-id="${i.id}" class="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs">Remover</button>
          </div>
        `
                )
                .join('')
            : '<p class="text-gray-400 text-sm py-2">Nenhum e-mail na lista.</p>';
          listEl.querySelectorAll('[data-remove-id]').forEach((btn) => {
            btn.addEventListener('click', () => removeItem(Number((btn as HTMLElement).getAttribute('data-remove-id'))));
          });
        };

        const importarDoBanco = () => {
          this.http.get<any[]>(`${environment.apiUri}/groups`).subscribe({
            next: (grupos) => {
              const grupoOptions = grupos
                .map((g: { id: number; nome: string }) => `<option value="${g.id}">${(g.nome || '').replace(/"/g, '&quot;')}</option>`)
                .join('');
              const htmlContent = `
                <style>
                  .dual-list-import option { padding: 6px 10px; border-bottom: 1px solid #f3f4f6; cursor: pointer; }
                  .dual-list-import option:hover { background-color: #f8fafc; }
                  .dual-list-import option:checked { background-color: #e0e7ff; color: #4338ca; font-weight: bold; }
                </style>
                <div class="text-left font-sans mt-2">
                  <label class="block text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">1. Tipo de importação</label>
                  <select id="import-tipo" class="swal2-select w-full m-0 mb-4 text-sm border-gray-300 rounded-xl bg-gray-50">
                    <option value="grupo">Por grupo (importar todos do grupo)</option>
                    <option value="nome">Selecionar usuários por nome</option>
                  </select>
                  <div id="import-grupo-wrap" class="mb-4">
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Grupo</label>
                    <select id="import-grupo" class="swal2-input w-full m-0"><option value="">Todos os grupos</option>${grupoOptions}</select>
                  </div>
                  <div id="import-dual-wrap" class="hidden flex-col gap-2 mb-4">
                    <label class="block text-xs font-extrabold text-indigo-600 uppercase mb-1">2. Filtre e transfira os usuários</label>
                    <div class="flex gap-3 items-stretch h-56 bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <div class="flex-1 flex flex-col h-full">
                        <span class="text-[10px] font-bold text-gray-500 uppercase mb-1 text-center">Disponíveis</span>
                        <input type="text" id="import-filter-av" placeholder="🔍 Pesquisar por nome..." class="w-full mb-2 p-1.5 text-[11px] border border-gray-200 rounded-md">
                        <select id="import-list-av" multiple class="dual-list-import flex-1 w-full border border-gray-300 rounded-lg text-xs bg-white" style="min-height:120px"></select>
                      </div>
                      <div class="flex flex-col gap-2 justify-center px-1">
                        <button type="button" id="import-btn-add" class="bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white h-8 w-10 flex items-center justify-center rounded-lg font-bold text-sm">&gt;</button>
                        <button type="button" id="import-btn-add-all" class="bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white h-8 w-10 flex items-center justify-center rounded-lg font-bold text-xs">&gt;&gt;</button>
                        <button type="button" id="import-btn-rem" class="bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white h-8 w-10 flex items-center justify-center rounded-lg font-bold text-sm mt-2">&lt;</button>
                        <button type="button" id="import-btn-rem-all" class="bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white h-8 w-10 flex items-center justify-center rounded-lg font-bold text-xs">&lt;&lt;</button>
                      </div>
                      <div class="flex-1 flex flex-col h-full">
                        <span class="text-[10px] font-bold text-emerald-600 uppercase mb-1 text-center">Selecionados</span>
                        <input type="text" id="import-filter-sel" placeholder="🔍 Pesquisar selecionados..." class="w-full mb-2 p-1.5 text-[11px] border border-gray-200 rounded-md">
                        <select id="import-list-sel" multiple class="dual-list-import flex-1 w-full border border-emerald-300 rounded-lg text-xs bg-white" style="min-height:120px"></select>
                      </div>
                    </div>
                  </div>
                </div>
              `;
              Swal.fire({
                title: 'Importar do banco',
                html: htmlContent,
                width: '720px',
                showCancelButton: true,
                confirmButtonText: 'Importar',
                confirmButtonColor: '#4f46e5',
                focusConfirm: false,
                didOpen: () => {
                  const popup = Swal.getPopup();
                  const tipoEl = popup?.querySelector('#import-tipo') as HTMLSelectElement;
                  const grupoWrap = popup?.querySelector('#import-grupo-wrap');
                  const dualWrap = popup?.querySelector('#import-dual-wrap');
                  const listAv = popup?.querySelector('#import-list-av') as HTMLSelectElement;
                  const listSel = popup?.querySelector('#import-list-sel') as HTMLSelectElement;
                  const filterAv = popup?.querySelector('#import-filter-av') as HTMLInputElement;
                  const filterSel = popup?.querySelector('#import-filter-sel') as HTMLInputElement;
                  const applyFilter = (input: HTMLInputElement | null, select: HTMLSelectElement | null) => {
                    if (!input || !select) return;
                    const term = input.value.toLowerCase();
                    Array.from(select.options).forEach((opt) => {
                      (opt as HTMLElement).style.display = opt.text.toLowerCase().includes(term) ? '' : 'none';
                    });
                  };
                  const moveOptions = (src: HTMLSelectElement, tgt: HTMLSelectElement, all: boolean) => {
                    const opts = all ? Array.from(src.options).filter((o) => (o as HTMLElement).style.display !== 'none') : Array.from(src.selectedOptions);
                    opts.forEach((opt) => {
                      opt.selected = false;
                      (opt as HTMLElement).style.display = '';
                      tgt.appendChild(opt);
                    });
                    const sorted = Array.from(tgt.options).sort((a, b) => a.text.localeCompare(b.text));
                    tgt.innerHTML = '';
                    sorted.forEach((opt) => tgt.appendChild(opt));
                    applyFilter(filterAv, listAv);
                    applyFilter(filterSel, listSel);
                  };
                  tipoEl?.addEventListener('change', () => {
                    const isNome = tipoEl.value === 'nome';
                    if (grupoWrap) (grupoWrap as HTMLElement).classList.toggle('hidden', isNome);
                    if (dualWrap) (dualWrap as HTMLElement).classList.toggle('hidden', !isNome);
                    if (isNome && listAv && listAv.options.length === 0) {
                      listAv.innerHTML = '';
                      listSel!.innerHTML = '';
                      this.userService.getUsers().subscribe({
                        next: (users) => {
                          const comEmail = users.filter((u: any) => u.email && String(u.email).trim());
                          comEmail.forEach((u: any) => {
                            const opt = document.createElement('option');
                            opt.value = String(u.id);
                            opt.text = `${(u.nome_completo || u.email || '').replace(/</g, '')} (${(u.email || '').trim()})`;
                            listAv!.appendChild(opt);
                          });
                        },
                        error: () => Swal.fire('Erro', 'Falha ao carregar usuários.', 'error'),
                      });
                    }
                  });
                  popup?.querySelector('#import-btn-add')?.addEventListener('click', () => moveOptions(listAv!, listSel!, false));
                  popup?.querySelector('#import-btn-add-all')?.addEventListener('click', () => moveOptions(listAv!, listSel!, true));
                  popup?.querySelector('#import-btn-rem')?.addEventListener('click', () => moveOptions(listSel!, listAv!, false));
                  popup?.querySelector('#import-btn-rem-all')?.addEventListener('click', () => moveOptions(listSel!, listAv!, true));
                  listAv?.addEventListener('dblclick', () => { if (listAv.selectedOptions.length) moveOptions(listAv, listSel!, false); });
                  listSel?.addEventListener('dblclick', () => { if (listSel.selectedOptions.length) moveOptions(listSel, listAv!, false); });
                  filterAv?.addEventListener('input', () => applyFilter(filterAv, listAv));
                  filterSel?.addEventListener('input', () => applyFilter(filterSel, listSel));
                },
                preConfirm: () => {
                  const popup = Swal.getPopup();
                  const tipoEl = popup?.querySelector('#import-tipo') as HTMLSelectElement;
                  const tipo = tipoEl?.value || 'grupo';
                  if (tipo === 'grupo') {
                    const grupoEl = popup?.querySelector('#import-grupo') as HTMLSelectElement;
                    const v = grupoEl?.value;
                    return { tipo: 'grupo' as const, grupoId: v === '' ? null : Number(v) };
                  }
                  const listSel = popup?.querySelector('#import-list-sel') as HTMLSelectElement;
                  const userIds = listSel ? Array.from(listSel.options).map((o) => Number(o.value)) : [];
                  if (userIds.length === 0) {
                    Swal.showValidationMessage('Transfira ao menos um usuário para "Selecionados".');
                    return null;
                  }
                  return { tipo: 'nome' as const, userIds };
                },
              }).then((result) => {
                if (!result.isConfirmed || !result.value) return;
                const v = result.value as { tipo: 'grupo'; grupoId: number | null } | { tipo: 'nome'; userIds: number[] };
                const opts = v.tipo === 'grupo'
                  ? { somente_ativos: true, grupo_id: v.grupoId }
                  : { user_ids: v.userIds };
                this.emailService.importUsers(lista.id, opts).subscribe({
                  next: (res) => {
                    Swal.fire('Sucesso', res.mensagem || `${res.adicionados} adicionado(s).`, 'success');
                    this.emailService.getListItens(lista.id).subscribe({
                      next: (newItens) => {
                        itens.length = 0;
                        itens.push(...newItens);
                        renderItensList();
                      },
                      error: () => Swal.fire('Erro', 'Falha ao atualizar lista.', 'error'),
                    });
                  },
                  error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao importar.', 'error'),
                });
              });
            },
            error: () => Swal.fire('Erro', 'Falha ao carregar grupos.', 'error'),
          });
        };

        btnAdd?.addEventListener('click', addItem);
        container.querySelector('#btn-importar-banco')?.addEventListener('click', importarDoBanco);
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
    this.emailService.createTemplate(t.nome + ' (cópia)', t.assunto, t.corpo_html ?? '', t.tipo_disparo ?? undefined).subscribe({
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
