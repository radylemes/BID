import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmailService, ListaEmail, ListaEmailItem } from '../../services/email.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-email-lists',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mx-auto p-4 md:p-6 bg-gray-50 min-h-screen">
      <div class="mb-8">
        <h2 class="text-3xl font-extrabold text-gray-800 tracking-tight">Listas de e-mail</h2>
        <p class="text-sm text-gray-500 font-medium">Crie listas de destinatários para disparos em massa.</p>
      </div>

      <div class="flex justify-end mb-4">
        <button
          (click)="novaLista()"
          class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all active:scale-95"
        >
          + Nova lista
        </button>
      </div>

      <div class="bg-white shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
        <div *ngIf="loading" class="p-8 text-center text-gray-500">Carregando listas...</div>
        <div *ngIf="!loading && listas.length === 0" class="p-8 text-center text-gray-400">
          Nenhuma lista cadastrada. Crie uma nova lista para começar.
        </div>
        <table *ngIf="!loading && listas.length > 0" class="min-w-full text-left text-sm">
          <thead class="bg-gray-100 text-gray-500 uppercase font-bold text-xs">
            <tr>
              <th class="px-6 py-4">Nome</th>
              <th class="px-6 py-4">Descrição</th>
              <th class="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr *ngFor="let lista of listas" class="hover:bg-gray-50">
              <td class="px-6 py-4 font-medium text-gray-900">{{ lista.nome }}</td>
              <td class="px-6 py-4 text-gray-600">{{ lista.descricao || '—' }}</td>
              <td class="px-6 py-4 text-right">
                <button
                  (click)="abrirItens(lista)"
                  class="mr-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100"
                >
                  E-mails
                </button>
                <button
                  (click)="editarLista(lista)"
                  class="mr-2 p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                  title="Editar"
                >
                  ✏️
                </button>
                <button
                  (click)="excluirLista(lista)"
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
export class EmailListsComponent implements OnInit {
  listas: ListaEmail[] = [];
  loading = false;

  constructor(
    private emailService: EmailService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    this.loading = true;
    this.emailService.getLists().subscribe({
      next: (data) => {
        this.listas = data;
        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.loading = false;
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
          this.carregar();
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
          lista.nome = value.nome;
          lista.descricao = value.descricao;
          this.cd.detectChanges();
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
          this.listas = this.listas.filter((l) => l.id !== lista.id);
          this.cd.detectChanges();
          Swal.fire({ icon: 'success', title: 'Lista excluída.', timer: 1500, showConfirmButton: false });
        },
        error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao excluir.', 'error'),
      });
    }
  }

  async abrirItens(lista: ListaEmail) {
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
              itens = itens.filter((i) => i.id !== itemId);
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
}
