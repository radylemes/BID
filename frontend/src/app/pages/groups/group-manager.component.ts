import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { GroupService } from '../../services/group.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-group-manager',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './group-manager.component.html',
  styleUrls: ['./group-manager.component.css'],
})
export class GroupManagerComponent implements OnInit {
  groups: any[] = [];

  constructor(
    private groupService: GroupService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.carregarGrupos();
  }

  private getAdminId(): number {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    return user.id || 1;
  }

  carregarGrupos() {
    this.groupService.getAllGroups().subscribe({
      next: (data) => {
        this.groups = [...data];
        this.cd.detectChanges();
      },
      error: (err) => console.error('Erro ao carregar grupos:', err),
    });
  }

  // ==================================================================================
  // CRIAR, EDITAR E EXCLUIR GRUPOS (Com Atualização de Tela Instantânea)
  // ==================================================================================
  async novoGrupo() {
    const { value: formValues } = await Swal.fire({
      title: 'Criar Novo Grupo de Apostas',
      width: '600px',
      html: `
        <div class="flex flex-col gap-3 text-left">
           <div><label class="text-xs font-bold text-gray-500 uppercase">Nome do Grupo</label><input id="swal-nome" class="swal2-input m-0 w-full" placeholder="Ex: VIP Masters"></div>
           <div><label class="text-xs font-bold text-gray-500 uppercase">Descrição (Opcional)</label><input id="swal-desc" class="swal2-input m-0 w-full" placeholder="Descrição da regra deste grupo"></div>
           <div class="mt-2 border-t border-gray-100 pt-3">
              <label class="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">Motivo da Criação (Auditoria)</label>
              <input id="swal-motivo" type="text" class="swal2-input m-0 w-full text-sm bg-indigo-50 border-indigo-200" placeholder="Ex: Novo evento corporativo">
           </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Criar Grupo',
      confirmButtonColor: '#d97706',
      preConfirm: () => {
        const nome = (document.getElementById('swal-nome') as HTMLInputElement).value;
        const motivo = (document.getElementById('swal-motivo') as HTMLInputElement).value;
        if (!nome || !motivo) {
          Swal.showValidationMessage('Nome e Motivo são obrigatórios!');
          return false;
        }
        return {
          nome,
          descricao: (document.getElementById('swal-desc') as HTMLInputElement).value,
          motivo,
          adminId: this.getAdminId(),
        };
      },
    });

    if (formValues) {
      this.groupService.createGroup(formValues).subscribe({
        next: (res: any) => {
          // ATUALIZAÇÃO INSTANTÂNEA: Adiciona na lista local e reordena alfabeticamente
          this.groups = [
            ...this.groups,
            {
              id: res.id,
              nome: formValues.nome,
              descricao: formValues.descricao,
              total_membros: 0,
            },
          ].sort((a, b) => a.nome.localeCompare(b.nome));

          this.cd.detectChanges(); // Força o Angular a desenhar o novo card na hora
          Swal.fire({
            title: 'Criado!',
            text: 'O grupo foi criado.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
        },
        error: () => Swal.fire('Erro', 'Falha ao criar o grupo.', 'error'),
      });
    }
  }

  async editarGrupo(group: any) {
    const { value: formValues } = await Swal.fire({
      title: 'Editar Grupo',
      width: '600px',
      html: `
        <div class="flex flex-col gap-3 text-left">
           <div><label class="text-xs font-bold text-gray-500 uppercase">Nome do Grupo</label><input id="edit-nome" class="swal2-input m-0 w-full" value="${group.nome}"></div>
           <div><label class="text-xs font-bold text-gray-500 uppercase">Descrição</label><input id="edit-desc" class="swal2-input m-0 w-full" value="${group.descricao || ''}"></div>
           <div class="mt-2 border-t border-gray-100 pt-3">
              <label class="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">Motivo da Alteração (Auditoria)</label>
              <input id="edit-motivo" type="text" class="swal2-input m-0 w-full text-sm bg-indigo-50 border-indigo-200" placeholder="Ex: Correção de nome">
           </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Salvar Alterações',
      confirmButtonColor: '#d97706',
      preConfirm: () => {
        const nome = (document.getElementById('edit-nome') as HTMLInputElement).value;
        const motivo = (document.getElementById('edit-motivo') as HTMLInputElement).value;
        if (!nome || !motivo) {
          Swal.showValidationMessage('Nome e Motivo são obrigatórios!');
          return false;
        }
        return {
          nome,
          descricao: (document.getElementById('edit-desc') as HTMLInputElement).value,
          motivo,
          adminId: this.getAdminId(),
        };
      },
    });

    if (formValues) {
      this.groupService.updateGroup(group.id, formValues).subscribe({
        next: () => {
          // ATUALIZAÇÃO INSTANTÂNEA: Altera o nome e descrição do card existente
          group.nome = formValues.nome;
          group.descricao = formValues.descricao;
          this.cd.detectChanges();
          Swal.fire({
            title: 'Atualizado!',
            text: 'As informações foram salvas.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
        },
        error: () => Swal.fire('Erro', 'Falha ao atualizar o grupo.', 'error'),
      });
    }
  }

  async excluirGrupo(id: number) {
    const { value: motivo, isConfirmed } = await Swal.fire({
      title: 'Excluir Grupo?',
      text: 'Os usuários deste grupo ficarão "Sem Grupo". Justifique a exclusão:',
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'Motivo da exclusão...',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => (!value ? 'O motivo é obrigatório para a auditoria!' : null),
    });

    if (isConfirmed && motivo) {
      this.groupService.deleteGroup(id, this.getAdminId(), motivo).subscribe({
        next: () => {
          // ATUALIZAÇÃO INSTANTÂNEA: Remove o card da tela na mesma hora
          this.groups = this.groups.filter((g) => g.id !== id);
          this.cd.detectChanges();
          Swal.fire({
            title: 'Excluído!',
            text: 'O grupo foi removido.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
        },
        error: () => Swal.fire('Erro', 'Falha ao excluir o grupo.', 'error'),
      });
    }
  }
}
