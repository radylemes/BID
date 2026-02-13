import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { GroupService } from '../../services/group.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-group-manager',
  standalone: true, // ADICIONE ISSO
  imports: [CommonModule], // ADICIONE ISSO
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

  carregarGrupos() {
    this.groupService.getAllGroups().subscribe({
      next: (data) => {
        // Forçamos a criação de uma nova referência de array para o Angular notar a mudança
        this.groups = [...data];
        this.cd.detectChanges(); // Força a atualização da tela
        console.log('Empresas carregados:', this.groups);
      },
      error: (err) => console.error('Erro ao carregar empresas:', err),
    });
  }

  async novoGrupo() {
    const { value: formValues } = await Swal.fire({
      title: 'Criar Nova Empresa',
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="Nome da Empresa">' +
        '<input id="swal-input2" class="swal2-input" placeholder="Descrição (Opcional)">',
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        return [
          (document.getElementById('swal-input1') as HTMLInputElement).value,
          (document.getElementById('swal-input2') as HTMLInputElement).value,
        ];
      },
    });

    if (formValues && formValues[0]) {
      this.groupService.createGroup(formValues[0], formValues[1]).subscribe(() => {
        Swal.fire('Criado!', 'A empresa foi criada com sucesso.', 'success');
        this.carregarGrupos();
      });
    }
  }

  async editarGrupo(group: any) {
    const { value: formValues } = await Swal.fire({
      title: 'Editar Empresa',
      html:
        `<input id="swal-input1" class="swal2-input" value="${group.nome}" placeholder="Nome">` +
        `<input id="swal-input2" class="swal2-input" value="${group.descricao || ''}" placeholder="Descrição">`,
      showCancelButton: true,
      preConfirm: () => [
        (document.getElementById('swal-input1') as HTMLInputElement).value,
        (document.getElementById('swal-input2') as HTMLInputElement).value,
      ],
    });

    if (formValues) {
      this.groupService.updateGroup(group.id, formValues[0], formValues[1]).subscribe(() => {
        this.carregarGrupos();
      });
    }
  }

  excluirGrupo(id: number) {
    Swal.fire({
      title: 'Tem certeza?',
      text: 'Isso removerá todos os usuários desta empresa!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Sim, excluir!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.groupService.deleteGroup(id).subscribe(() => {
          this.carregarGrupos();
          Swal.fire('Excluído!', 'A empresa foi removido.', 'success');
        });
      }
    });
  }
}
